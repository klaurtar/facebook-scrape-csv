/*
* I'm Nedal Abo Almaali from upwork
*/
require('dotenv').config();
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
* first, we are gathering the ids of the items
* @param {Array} - scrapedItemsIds: array of ids of the items
*/
var scrapedItemsIds = [];

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
	// open a new page
    page = await browser.newPage();
    // listen to responses
    await listenToResponses();
    await page.setViewport({
    	width: 999,
    	height: 650,
	});
	//await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36');
	console.log('>>> openPage of ', pageUrl);
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
* listen to response, and filter the incoming data.
*/
async function listenToResponses(){
	console.log('>>> listening to responses ');
	page.on('response', async (response) => {
		let resUrl = response.url();
		// check if the response is of fb graphql API
		if(!!resUrl.match('graphql')){
			console.log(resUrl);
			try{
				// parse data into json
				let data = await response.json();
				let page;
				// check if the graphql response is a selling-items page
				if(!!(page = isSellingFeedPage(data))){
					// store items ids
					addNewItemsIds(page.edges);
					
					// scroll down if there is more data
					//if(page.has_next_page && scrapedItemsIds.length < 50){
					if(page.has_next_page &&  ( (CONFIG.maxItems == 0)? true: scrapedItemsIds.length < CONFIG.maxItems) ){
						await scrollDownOnePage();
					
					// in case of; no more data
					}else{
						// remove listeners
						await removeListeners();
						//console.log(scrapedItemsIds, scrapedItemsIds.length);
						await navigateThroughScrapedIds();
						await closeBrowser();
						let csv = await convertToCSV(scrapedData);
						await saveIntoFile('./scrapedData.csv', csv);
					}
				}
			}catch(e){
				console.log('[MISBEHAVIOR] -> json parsing');
			}
		}
		
	});

	
}

/*
*
*/
async function removeListeners(){
	page.removeAllListeners();
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
async function scrollDownOnePage(){
	console.log('>>> Loading more ... ');
	await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
    });
    await page.waitFor(200);
}

/*
*
*/
async function navigateThroughScrapedIds(){
	console.log('>>> navigateThroughScrapedIds ', scrapedItemsIds.length, ' ids');
	for(let id of scrapedItemsIds){
		await page.goto('https://www.facebook.com/marketplace/item/'+ id);
		await scrapeItem();
	}
}

/*
* Name, Price, Views, Description, and date Posted
*/
async function scrapeItem() {
	try{
		let titleElementHandler = await page.waitForSelector('span[data-testid="marketplace_pdp_title"]');
		let priceElementHandler = await page.waitForSelector('div._2iel');
		let viewsElementHandler = await page.waitForSelector('._43kf._50f8');
		let descriptionElementHandler = await page.waitForSelector('._4etw span');
		let dateElementHandler = await page.waitForSelector('._r3j');

		const title = await (await titleElementHandler.getProperty('textContent')).jsonValue();
		const price = await (await priceElementHandler.getProperty('textContent')).jsonValue();
		const views = await (await viewsElementHandler.getProperty('textContent')).jsonValue();
		const description = await (await descriptionElementHandler.getProperty('textContent')).jsonValue();
		const date = await (await descriptionElementHandler.getProperty('title')).jsonValue();
		
		// push collected data into scrapedData array
		scrapedData.push({
			title, price, views, description, date
		});
	}catch(e){
		console.log('[MISBEHAVIOR] -> scrapeItem');
	}
}

/*
* helper function
*/
function isSellingFeedPage(jsonObj){
	// marketplacr
	// data.viewer.marketplace_feed_stories
	/*if(!!jsonObj.data){
		let data = jsonObj.data;
		//console.log('data');
		if(!!data.viewer){
			let viewer = data.viewer;
			//console.log('viewer');
			if(!!viewer.marketplace_feed_stories){
				let marketplace = viewer.marketplace_feed_stories;
				//console.log('marketplace');
				//console.log(Object.keys(marketplace));
				return {
					edges: marketplace.edges,
					page_info: marketplace.page_info,
					has_next_page: marketplace.page_info.has_next_page,
				}
			}
		}
	}*/

	// selling
	// data.viewer.marketplace_feed_stories
	if(!!jsonObj.data){
		let data = jsonObj.data;
		//console.log('data');
		if(!!data.viewer){
			let viewer = data.viewer;
			//console.log('viewer');
			if(!!viewer.selling_feed_one_page){
				let marketplace = viewer.selling_feed_one_page;
				//console.log('marketplace');
				//console.log(Object.keys(marketplace));
				return {
					edges: marketplace.edges,
					page_info: marketplace.page_info,
					has_next_page: marketplace.page_info.has_next_page,
				}
			}
		}
	}

	return false;
}
/*
* helper function
*/
function addNewItemsIds(items){
	for(let item of items){
		if( (scrapedItemsIds.length < CONFIG.maxItems) || (CONFIG.maxItems === 0) ){
			// marketplacr
			//scrapedItemsIds.push(item.node.listing.id);
			// selling
			scrapedItemsIds.push(item.node.id);
		}
	}
}

/************************/

(async function play(){
	try{
		await openBrowser();
		await openPage(CONFIG.facebookUrl);
		//await openPage(CONFIG.marketPlaceUrl);
		
		await login({
			email: CONFIG.email,
			password: CONFIG.password
		});
		//await navigateTo(CONFIG.marketPlaceUrl);
		await navigateTo(CONFIG.sellingPage);

		
		//await scrollToEnd();

		//await parseItems();
		//await closeBrowser();
		
		

	}catch(e){
		console.log(e);
	}
	
})();



/**********************************************/
/************** old code  *********************/
/**********************************************/



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
async function scrollToEnd(){
	console.log('>>> scroll to end ');

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

    await scrapeInfiniteScrollItems(page, 100);
}