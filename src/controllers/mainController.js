const path = require('path');
const sliderSneakers = require('../data/sneakers');
const shopCartSneakers = require('../data/shopCartSneakers');
const fileOperation = require('../modules/fileControl');
const activeUserFile = path.join(__dirname, '../data/active-user.json');



const mainController = {
    index: function(req, res) {
        const activeUser = fileOperation.readFile(activeUserFile);
        res.render('home', {
            trendingSneakers: sliderSneakers,
            activeUser: activeUser
        });
    },
    shoppingCart: function(req, res) {
        const activeUser = fileOperation.readFile(activeUserFile);
        let total = 0;
        for (let i=0; i<shopCartSneakers.length; i++) {
            total += shopCartSneakers[i].price;
        }
        res.render('shopping-cart', {
            trendingSneakers: sliderSneakers,
            shopCartSneakers: shopCartSneakers,
            total: total,
            activeUser: activeUser
        });
    }
};

module.exports = mainController;