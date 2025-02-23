
let urlHotel = "https://www.expedia.com/VTU-Platinum-Lodge.h105996645.Hotel-Information"
urlHotel = "https://www.expedia.com/Harare-Hotels-Stephen-Margolis-Resort.h27364660.Hotel-Information"
const locationHotel = urlHotel.includes("-Hotels")? urlHotel.split("-Hotels")[0].replace('https://www.expedia.com/', '').replace(/-/g,' ') : ""
const hotelName = urlHotel.includes("-Hotels")? urlHotel.split('Hotels-')[1].split('.')[0].replace(/-/g,' ') : urlHotel.split('/')[3].split('.')[0].replace(/-/g, " ")

console.log("Location", locationHotel)
console.log("Name", hotelName)