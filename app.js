/*
* I'm Nedal Abo Almaali from upwork
*/
const puppeteer = require("puppeteer");
const fs = require("fs");
const CONFIG = require('./CONFIG');
const json2csvParser = require('json2csv').parse;
//const chalk = require("chalk");


/*
* 
*/
var browser;
/*
* 
*/
var page;
/*
* 
*/
var scrapedData = [];

/*
* open browser
*/
async function openBrowser(argument) {
	console.log('>>> openBrowser ');
	// open the headless browser
    browser = await puppeteer.launch({ headless: false });
    //await browser.userAgent();
    const context = browser.defaultBrowserContext();
    await context.overridePermissions('https://www.facebook.com', ['notifications']);
}

/*
* open page
* @param {string} - pageUrl
*/
async function openPage(pageUrl) {
	console.log('>>> openPage of ', pageUrl);
	// open a new page
    page = await browser.newPage();
    await page.setViewport({
    	width: 999,
    	height: 650,
	});
	//await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36');
	await page.goto(pageUrl);
}

/*
* login
* @param {Object} - credentials
*/
async function login(data) {
	console.log('>>> log in ');
	await page.evaluate((email, password) => {
        document.querySelector('#email').value = email;
        document.querySelector('#pass').value = password;
        document.querySelector('#loginbutton').click();
    }, data.email, data.password);
    await page.waitForSelector('title');
}

/*
* open page
* @param {string} - pageUrl
*/
async function navigateTo(pageUrl) {
	console.log('>>> navigate to ', pageUrl);
    await page.goto(pageUrl);
}

/*
* data-testid="marketplace_feed_item"
*/
async function parseItems() {
	console.log('>>> parse Items ');
	// collect items
	let items = await page.$$('[data-testid="marketplace_feed_item"]');
	for(let item of items){
		// note )-> fb marketplace is making DOM re-rendering, so it's good to take your breath before go next 
		await page.waitFor(500);
		let href = await item.evaluate((node) => {
			return node.pathname;
		});
		console.log('----->>>>>>>>>> item href', href);
		// select item
		item = await page.waitForSelector('a[href="'+href+'"]');
		await item.click();
		// wait for popup dialog
		let dialogElementHandler = await page.waitForSelector('[aria-labelledby="marketplace-modal-dialog-title"]');
		let titleElementHandler = await page.waitForSelector('span[data-testid="marketplace_pdp_title"]');
		let priceElementHandler = await page.waitForSelector('span[itemprop="price"]');
		let descriptionElementHandler = await page.waitForSelector('span[itemprop="description"]');

		const title = await (await titleElementHandler.getProperty('textContent')).jsonValue();
		const price = await (await priceElementHandler.getProperty('textContent')).jsonValue();
		const description = await (await descriptionElementHandler.getProperty('textContent')).jsonValue();
		
		// push collected data into scrapedData array
		scrapedData.push({
			title, price, description
		});

		// close the dialog
		let closeBtn = await dialogElementHandler.$('[title="Close"]');
		await closeBtn.click();

		// take breath
		await page.waitFor(1000);
	}

}
/*
*
*/
async function closeBrowser(){
	console.log('>>> closeBrowser ');
	await browser.close();
}
/*
*
*/
async function convertToCSV(data) {
	console.log('>>> convertToCSV ');
	if(CONFIG.removeBr){
	    // map through items to removes \n
	    scrapedData = scrapedData.map((item)=>{
	    	return {
	    		title: item.title.replace(/\n/g, ''),
	    		price: item.price,
	    		description: item.description.replace(/\n/g, ''),
	    	}
	    });
    }
    return json2csvParser(scrapedData);
}
/*
*
*/
async function saveIntoFile(path, data){
	console.log('>>> saveIntoFile ');
	fs.writeFileSync(path, data, {
		encoding: 'utf8'
	});
}

/*
*
*/
async function scrollToEnd(){
	console.log('>>> scroll to end ');
}

/************************/

(async function play(){
	try{
		await openBrowser();
		await openPage(CONFIG.facebookUrl);
		await login({
			email: CONFIG.email,
			password: CONFIG.password
		});
		await navigateTo(CONFIG.marketPlaceUrl);
		await parseItems();
		await closeBrowser();
		
		let csv = await convertToCSV(scrapedData);
		await saveIntoFile('./scrapedData.csv', csv);

	}catch(e){
		console.log(e);
	}
	
})();
