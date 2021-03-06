const path = require('path');
const { v4: uuidv4 } = require('uuid');

const fileOperation = require('../modules/fileControl');
const userFunction = require('../modules/userFunction');
const productFunction = require('../modules/productFunction');

const sneakersData = require('../data/sneakers');
const allShoesPath = path.join(__dirname, '../data/products.json');
const allShoes = fileOperation.readFile(allShoesPath);
const activeUserFile = path.join(__dirname, '../data/active-user.json');
const activeUser = fileOperation.readFile(activeUserFile);

const productsController = {
    
    allProducts: function (req, res) {
        updateProducts = fileOperation.readFile(allShoesPath);
        res.render('./products/all-products', { 
            trendingSneakers: sneakersData,
            products: updateProducts,
            activeUser: activeUser
        });
    },
    editProdIndex: function (req, res) {
        const prodId = req.params.id;
        const allShoes = fileOperation.readFile(allShoesPath);
        let editProduct = productFunction.getProdById(allShoes, prodId);

        res.render('./products/edit-products', {
            activeUser : activeUser,
            data : editProduct,
            msg : ''
        })
    },
    editProduct: function (req, res) {
        const id = req.params.id;
        const file = req.file;
        const product = req.body;
        const allShoes = fileOperation.readFile(allShoesPath);
        let editProduct = productFunction.getProdById(allShoes, id);

        if (!file) {
            const msg = "Debe seleccionar una imagen de producto!";
            const old = req.body;
            res.render('./products/edit-products', {
                activeUser : activeUser,
                data : editProduct,
                msg : msg
            })
            return;
        }
        //console.log(file.filename)
     
        const updatedProduct = {
            id: editProduct.id,
            prodCreationDate: editProduct.prodCreationDate, //dia que cree producto
            // productOwner:  
            brand: product.brand,
            model: product.model,
            category: product.category,
            description: product.description,
            price: product.price,
            discount: product.discount,
            image: file.filename,
            color: product.color,
            gender: product.gender,
            stock: product.stock
        };

        // Remove image files.
        productFunction.removeProductImage(allShoes, id);

        // Creo un nuevo array sin el elemento modificado.
        let updatedArray = productFunction.removeProdFromArray(allShoes, id);
        updatedArray.push(updatedProduct);
        fileOperation.writeFile(updatedArray, allShoesPath);

        res.redirect('/products');
    },
    obtenerPorId: (req, res) => {
        const productId = parseInt(req.params.id, 10);
        let productoEncontrado;

        for (let i = 0; i < sneakersData.length; i++) {
            if (sneakersData[i].id === productId) {
                productoEncontrado = sneakersData[i];
            }
        }

        if (!productoEncontrado) {
            res.status(404).send("No se encuentra el producto");
        } else {
            res.render('./products/product-details',  {
                sneakerEncontrado: productoEncontrado, 
                trendingSneakers: sneakersData,
                activeUser: activeUser
            });
        }
    },
    create: function (req, res) {
        res.render('./products/createProduct', {
            activeUser : activeUser,
            old: '',
            errorMsg: ''
        })
    },
    // productList: function (req, res) {
    //     res.render('./products/productsList', { products: allShoes });
    // },
    createProduct: function (req, res) {
        const file = req.file;
        const product = req.body;

        const newProduct = {
            id: uuidv4(),
            prodCreationDate: new Date().toISOString().slice(0, 10), //dia que cree producto
            // productOwner:  
            brand: product.brand,
            model: product.model,
            category: product.category,
            description: product.description,
            price: product.price,
            discount: product.discount,
            image: file.filename,
            color: product.color,
            gender: product.gender,
            stock: product.stock
        };
        
        fileOperation.addToFile(newProduct, allShoesPath);
        res.redirect('/products');
    },
    search: function(req, res) {
        const activeUser = fileOperation.readFile(activeUserFile);
        const allShoes = fileOperation.readFile(allShoesPath);

        let userSearch = req.query.search;
        let productsResults = [];

        for (let i = 0; i < allShoes.length; i++) {
            if (allShoes[i].brand.toLowerCase().includes(userSearch.toLowerCase())) {
                productsResults.push(allShoes[i])
            }
        }
        res.render('./products/all-products', {
            trendingSneakers : productsResults,
            products : productsResults,
            activeUser : activeUser
        })
    },
    deleteProduct: function (req, res) {
         const id = req.params.id;
        if (!id) return;

        let products = fileOperation.readFile(allShoesPath);
        let newArray = productFunction.removeProdFromArray(products, id);
        fileOperation.writeFile(newArray, allShoesPath);

        // Remove image files.
        productFunction.removeProductImage(products, id);

        res.redirect('/products');
    }
};

module.exports = productsController;