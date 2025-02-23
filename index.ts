import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import fs from "fs";
import { Browser, Page } from "puppeteer";
import { setTimeout } from "timers/promises"
import { ensureCorrectPage, pickCountry } from "./helpers";
import { getRandom } from "random-useragent"

puppeteer.use(StealthPlugin());


(async () => {
  try {
    let url = await pickCountry()
    
    // let url: string = readlineSync.question("Enter URL by Region here: ");
    if(!url) throw new Error("Please pick any country in the list")

    if (!url.includes("All-Hotels")) throw new Error("URL should match by region");

    // Ensure "-p1" exists in URL if missing
    if (!url.includes("-p")) {
        url = url.replace(/(\.d\d+)(\.Travel)/, `$1-p1$2`); // Add -p1 before .Travel
    }

    const country = url.split("-")[1]; // Extract country name
    // const pageUrl = url.split("-p")[1]?.replace(/\..*/, "") || "1"; // Extract page number

    const browser: Browser = await puppeteer.launch({
      headless: false,
      args: [
        `--no-sandbox`,
        `--disable-blink-features=AutomationControlled`,
        "--ignore-certificate-errors",
        "--lang=es",
        "--disable-dev-shm-usage",
        "--no-sandbox",
        "--enable-javascript",
        "--allow-running-insecure-content",
        "--disable-popup-blocking",
        "--disable-web-security",
        "--disable-site-isolation-trials",
        "--disable-extensions",
        "--disable-infobars",
        "--disable-notifications",
        "--disable-automation",
        "--disable-blink-features=AutomationControlled",
        "--disable-blink-features=BlockCredentialedSubresources"
      ],
      defaultViewport: null,
      // devtools: true,
      ignoreDefaultArgs: ["--enable-automation"],
    });

    const userAgent = getRandom()
    const page: Page = await browser.newPage();
    await page.setUserAgent(userAgent)
    await page.setBypassCSP(true)
    await page.goto(url, { waitUntil: ["load", "domcontentloaded"] });
    await setTimeout(2000)

    try {
      await ensureCorrectPage(page, url, 3)
    } catch (error) {
      throw new Error("Page didn't load successfully")
    }

    // Get second pagination
    const pagination = await page.evaluate(() => {
      const pages = Array.from(document.querySelectorAll('a[data-testid*="linksPagination-link"]'))
        .map((el) => el.textContent)
        .filter((text) => Number(text)) 
        .map(Number); 

      return pages.length > 0 ? Math.max(...pages) : 1;
    });

    console.log(`Total pages found: ${pagination}`);

    // Open CSV file stream
    const csvFile = fs.createWriteStream(`output/${country}.csv`, { flags: "w" });
    csvFile.write("Url,Location,Hotel Name\n"); 

    // await page.close()
    for (let i = 1; i <= pagination; i++) {

      let paginatedUrl = url;
      console.log(`Scraping page ${i}`)
      // Replace the existing -p# with the new page number
      if (paginatedUrl.includes("-p")) {
        paginatedUrl = paginatedUrl.replace(/-p\d+/, `-p${i}`);
      }else{
        // Add -p1 if it doesn't exist in the URL
        paginatedUrl = paginatedUrl.replace(/(\.d\d+)/, `-p${i}$1`);
      }
      
      await page.goto(paginatedUrl, { waitUntil: ["load", "domcontentloaded"] });

      // make sure the URL is correctly for all hotels data
      try {
        await ensureCorrectPage(page, paginatedUrl, 3)
      } catch (error) {
        console.log(`Skipping page ${i} due to repeated failures.`);
        continue;
      }

      // grab all the url hotels
      let pageData = await page.evaluate(() => {
        return Array.from(
          document.querySelectorAll("li.uitk-layout-grid-item.uitk-layout-grid-item-has-column-start a")
        )
          .map((el) => el.getAttribute("href"))
          .filter((href) => href); 
      });

      if (pageData.length === 0) {
        console.log(`No hotels found on page ${i}`);
        continue;
      }

      // Save links to CSV
      pageData.forEach((link) => {
        const urlHotel = `https://www.expedia.com${link}`
        const locationHotel = urlHotel.includes("-Hotels")? urlHotel.split("-Hotels")[0].replace('https://www.expedia.com/', '').replace(/-/g,' ') : ""
        const hotelName = urlHotel.includes("-Hotels")? urlHotel.split('Hotels-')[1].split('.')[0].replace(/-/g,' ') : urlHotel.split('/')[3].split('.')[0].replace(/-/g, " ")
        csvFile.write(`"${urlHotel}","${locationHotel}","${hotelName}"\n`);
      });
      
      await setTimeout(2000)
    }
    console.log(`Scraping completed for ${country}. Data saved to ${country}.csv`);

    csvFile.end(); // Close CSV file
    await browser.close();
  } catch (error: any) {
    console.log("Error:", error.message);
    process.exit(1);
  }
})();
