import path from "path";
import fs from "fs";
import readlineSync from "readline-sync";
import { Page } from "puppeteer";
import { setTimeout } from "timers/promises";

export const pickCountry = async () => {
  try {
    const filePath = path.join(__dirname, "expedia-countries.csv");
    if (!filePath) throw new Error("File of countries list not found");

    const countriesFile = fs.readFileSync(filePath, "utf8").trim();
    const lines = countriesFile.split("\n").slice(1);
    const countries = lines.map((_) => _.replace(/"/g, ""));

    console.log("\nAvailable Countries:");
    countries.forEach((country, index) => {
      console.log(
        `${index + 1}. ${country
          .split("/")[3]
          .replace(/-Hotels.*/, "")
          .replace(/-/g, " ")
          .replace("All ", "")}`
      );
    });

    const choice = readlineSync.questionInt(
      "\nEnter the number of your country choice: "
    );
    if (choice < 1 || choice > countries.length) {
      throw new Error(
        "Invalid selection. Please restart and enter a valid number."
      );
    }

    return countries[choice - 1];
  } catch (error) {
    console.log(error);
  }
};

export const ensureCorrectPage = async (
  page: Page,
  paginatedUrl: string,
  maxRetries = 3
) => {
  let attempts = 0;
  while (attempts < maxRetries) {
    await page.goto(paginatedUrl, { waitUntil: ["load", "domcontentloaded"] });

    try {
      await page.waitForFunction(
        () => window.location.href.includes("Travel-Guide-City-All-Hotels"),
        { timeout: 5000 }
      );
      return true; // Success, page loaded correctly
    } catch (error) {
      console.log(`Retrying page load... Attempt ${attempts + 1}`);
      attempts++;
      await setTimeout(2000); // Wait before retrying
    }
  }
  throw new Error(
    `Failed to load the correct page after ${maxRetries} attempts`
  );
};
