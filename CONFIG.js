module.exports = {
	facebookUrl: 'https://www.facebook.com/',
	marketPlaceUrl: 'https://www.facebook.com/marketplace/nyc/propertyforsale/',
	sellingPage: 'https://www.facebook.com/marketplace/selling/',
	/*
	* set email
	*/
	email: process.env.email,
	/*
	* set pass
	*/
	password: process.env.password,
	/*
	* @param {int} maxItems - hom many item you need to scape??
	* 0 -> means all the items, otherwise set the max number.
	*/
	maxItems: 0,
	removeBr: false,
};