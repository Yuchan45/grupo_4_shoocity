const express = require('express');
const router = express.Router();
const mainController = require('../controllers/mainController');

router.get('/', mainController.index);
router.get('/shopping-cart', mainController.shoppingCart);

module.exports = router;