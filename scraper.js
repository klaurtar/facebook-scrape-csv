const puppeteer = require("puppeteer");
const chalk = require("chalk");
var fs = require("fs");

// Debugging Colors
const error = chalk.bold.red;
const success = chalk.keyword("green");

(async () => {
  try {
    const email = "emailHere";
    const password = "passwordHere";

    // open the headless browser
    var browser = await puppeteer.launch({ headless: false });
    const context = browser.defaultBrowserContext();
    await context.overridePermissions('https://www.facebook.com', ['notifications']);
    
    // open a new page
    var page = await browser.newPage();

    // enter url in page
    await page.goto(`https://www.facebook.com/marketplace/cairo`);
    await page.waitForSelector("#email");


    await page.evaluate((email, password) => {
        document.querySelector('#email').value = email;
        document.querySelector('#pass').value = password;
        document.querySelector('#loginbutton').click();
    }, email, password);
    await page.waitForSelector('span[title]');

    const getHeight = () => document.body.scrollHeight
    const scrapeInfiniteScrollItems = async (page, scrollDelay = 100) => {
        await page.waitForSelector('button[nextavailability="out_of_stock"]');
 
        let height = await page.evaluate(getHeight);
        let previousHeight = 0
        try {
            do {
                await page.waitFor(scrollDelay);
                await page.evaluate(() => {
                    window.scrollTo(0, document.body.scrollHeight);
                });
                previousHeight = height;
                await page.waitForFunction(
                    `document.body.scrollHeight>${height}`
                );
                height = await page.evaluate(getHeight);
                console.log("Loading more...")
            } while(height > previousHeight)
        } catch(error) {
            console.log("Loading completed");
        }
    };
    
    // Load all items by mouse scroll down
    console.log("Mouse scroll down to load more.")

    await scrapeInfiniteScrollItems(page, 100);
    
    console.log("scrolldown done...");

// Create a function that saves a nodelist of all item titles

// For every item in the list, click the title for more information
// Scrape the Title, Price, Views, Date Posted, Description and save the data to an array
// Close the item
//Repeat for all items in the list eventually returning all the scraped data to a csv file

//My attempt
// function dataScrape() {
//     var titles = document.body.querySelectorAll('span[title]');

//     var arr = [];

//     for(i = 0; i < titles.length; i++) {
//         var button = titles[i];

//         button.click();
    
//         function facebookData() {
//             var title = document.querySelector('span[data-testid="marketplace_pdp_title"]').innerText;
//            var price = document.querySelector('._5_md._2iel').innerText;
//            var viewed = document.querySelector('._43kf._50f8').innerText.replace(/\D+/g, '');
//            var datePosted = document.querySelector('a._r3j[title]').title;
//            var description = document.querySelector('p._4etw').innerText;
                
//            arr.push({
//                title: title,
//                price: price,
//                views: viewed,
//                date: datePosted,
//                desc: description
//          });

//         }
        
//             let exitButton = document.body.querySelector("button._3-9a._50zy._50-1._50z_._5upp._42ft");
//             exitButton.click();
        
//     }
//     return arr;
// }
    


    //await browser.close();

    function ConvertToCSV(objArray) {
        var array = typeof objArray != 'object' ? JSON.parse(objArray) : objArray;
        var str = '';
        for (var i = 0; i < array.length; i++) {
            var line = '';
            for (var index in array[i]) {
                if (line != '') line += ','
                line += array[i][index];
            }
            str += line + '\r\n';
        }
        return str;
    }
    // Writing the news inside a json file
    fs.writeFile('facebookData.csv', ConvertToCSV(JSON.stringify(facebookPostData)), 'utf8', function (err) {
        if (err) {
          console.log('Some error occured - file either not saved or corrupted file saved.');
        } else{
          console.log('It\'s saved!');
        }
      });
    fs.writeFile("facebookMP.json", JSON.stringify(facebookPostData), function(err) {
      if (err) throw err;
      console.log("Saved!");
    });
    console.log(success("Browser Closed"));
  } catch (err) {
    // Catch and display errors
    console.log(error(err));
    await browser.close();
    console.log(error("Browser Closed"));
  }
})();
