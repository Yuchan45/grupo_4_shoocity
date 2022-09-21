const express = require('express');
const router = express.Router();
const productsController = require('../controllers/productsController');


// Middlewares
const uploadFile = require('../middlewares/products/productsMulter');
// const hasFile = require('../middlewares/products/hasFile');
const validateProducts = require('../middlewares/products/validateProducts');

const {allProducts, running, urban, trackAndField, createProduct, processCreateProduct, search, obtenerPorId, editProduct, processEditProduct, deleteProduct, test} = productsController;

router.get('/', allProducts);
router.get('/running', running);
router.get('/urban', urban);
router.get('/track-and-field', trackAndField);

router.get('/create', createProduct);

router.post('/create', uploadFile.single("productImage"), validateProducts, processCreateProduct); 

//router.get('/list',productsController.productList); // El listado se muestra directamente en la vista de products (/products)

router.get('/search', search);

router.get('/:id', obtenerPorId);

router.get('/:id/edit', editProduct);

router.put('/:id', uploadFile.single("product-image"), processEditProduct)

router.delete('/delete/:id', deleteProduct);

router.get('/test', test);


module.exports = router;