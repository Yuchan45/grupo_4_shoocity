const path = require('path');
const bcrypt = require('bcrypt');
const { validationResult } = require('express-validator');
const fileOperation = require('../modules/fileControl');
const userFunction = require('../modules/userFunction');
const User = require('../modules/User');



// Sequelize
const db = require('../database/models');
const sequelize = db.sequelize;
//Otra forma de llamar a los modelos
const Users = db.User;
const Products = db.Product;
const Brands = db.Brand;
const Categories = db.Category;
const ShoppingCarts = db.Shopping_cart;
const Items = db.Item;
const Favorites = db.Favorite;

const allUsersFile = path.join(__dirname, '../data/users.json');

const usersController = {
    login: function(req, res) {
        res.render('./users/login-form');
    },
    processLogin: async function(req, res) {      
        const user = req.body;

        const validUsers = await User.findByEmailDb((user.email).toLowerCase()); // El findByEmailDb, por mas que trae solo 1 usuario, lo trae dentro de un array asi que tengo que sacarlo de ahi.
        const userToLogin = (validUsers.length > 0) ? validUsers[0] : '';

        if (userToLogin) {
            const isPswCorrect = bcrypt.compareSync(user.password, userToLogin.password);
            if (isPswCorrect) {
                delete userToLogin.password; // Borramos la propiedad password por temas de seguridad.
                req.session.userLogged = userToLogin;

                if (user.rememberUser) {
                    res.cookie('userEmail', user.email.toLowerCase(), { maxAge: (1000 * 60) * 2 }); // MaxAge = 2mins
                }
                return res.redirect('/');
            }     
        }
        
        return res.render('./users/login-form', {
            old: user,
            errors : {
                loginFailed: {
                    msg: 'Las credenciales son invalidas!'
                }
            },
        });

    },
    profile: async function(req, res) {
        if (!req.session.userLogged) return res.redirect('/users/login');
        const userId = req.session.userLogged.id;

        const favorites = await Favorites.findAll({
            where: {
                user_id: userId
            }
        });
        let favoriteProdIds = [];
        favorites.forEach(product => {
            // Me armo un array con los ids de los productos favoritos del usuario.
            favoriteProdIds.push(product.product_id);
        });

        const favProducts = await Products.findAll({
            include: [{association: "brands"}, {association: "categories"}, {association: "users"}, {association: "favUsers"}],
            where: {
                id: favoriteProdIds       // Esto es magia, se puede pasar un array de ids...
            }
        });
        // Me traje los productos favoritos del usuario. --> products

        const productsOnSale = await Products.findAll({
            include: [{association: "brands"}, {association: "categories"}, {association: "users"}, {association: "favUsers"}],
            where: {
                user_id: userId
            }
        });
        // Me traje los productos que el usuario tiene en venta --> productsOnSale

        res.render('./users/profile', {
            favProducts: favProducts,
            productsOnSale: productsOnSale
        });
    },
    myPurchases: async function(req, res) {
        if (!req.session.userLogged) return res.redirect('/users/login');
        const userId = req.session.userLogged.id;

        let shoppingCart = await ShoppingCarts.findOne({
            include: [{association: "users"}, {association: "products"}],
            where: {
                user_id: userId,
                status: 0  // Necesito los carrito "inactivo" o ya cerrados.
            }
        });

        shoppingCart = shoppingCart ? shoppingCart : '';

        // Me traigo las asociaciones de los productos que me llegan en el shopping cart.
        if (shoppingCart) {
            // Brands
            for await (product of shoppingCart.products) {
                product.brands = await product.getBrands();
            }
            // Categories
            for await (product of shoppingCart.products) {
                product.categories = await product.getCategories();
            }
        }

        res.render('./users/my-purchases', {
            shoppingCart: shoppingCart
        });
    },
    register: function(req, res) {
        res.render('./users/register-form');
    },
    recover: function(req, res) {
        res.render('./users/recover', {

        });
    },
    list: async function(req, res) {
        if (!req.session.userLogged || req.session.userLogged.role != 'admin') return res.redirect('/users/login');

        // Update de los datos de los archivos
        const users = await Users.findAll();
        res.render('./users/user-list', {
            filter : '',
            users: users,
        });
    },
    processRegister: async function(req, res) {
        const files = req.files;
        let avatarFilename = 'default.jpg';
        let bannerFilename = 'default-banner.jpg';
        
        if (files.length > 0) {
            for (let i=0; i<files.length; i++) {
                if (files[i].fieldname == 'profileImage') {
                    avatarFilename = files[i].filename;
                } else if (files[i].fieldname == 'bannerImage') {
                    bannerFilename = files[i].filename;
                }
            }
        }

        let user = req.body;
        let errors = validationResult(req);
        if (!errors.isEmpty()){
            const avatarPath = path.join(__dirname, '../../public/images/users/profiles/' + avatarFilename);
            const bannerPath = path.join(__dirname, '../../public/images/users/banners/' + bannerFilename);
            if (avatarFilename != 'default.jpg') userFunction.removeImage(avatarPath);
            if (bannerFilename != 'default-banner.jpg') userFunction.removeImage(bannerPath);
            return res.render('./users/register-form', {
                errors: errors.mapped(), // Mapped convierte el array de errores en un obj literal con (name del elemento) y sus diferentes propiedades
                old: user
            });
        }

        const emailInDb = await User.findByEmailDb(user.email);
        if (emailInDb.length > 0) {
            console.log("Este email ya esta registrado!"); // Por el momento se deja asi xdxd
            return res.render('./users/register-form', {
                // Arreglar para que dsp si se vea bien el error.
                errorMsg: {
                    email: {
                        msg: 'Este email ya esta registrado!'
                    }
                },
                oldData: user
            });
        }

        let dataUser = {
            ...user,
            email: user.email.toLowerCase(),
            password: bcrypt.hashSync(user.password, 10),
            avatar: avatarFilename,
            banner: bannerFilename
        }

        // Creo el usuario (tanto en la db como en el json)
        // const userCreated = User.create(dataUser); // Por el momento voy a hacer que se guarden los usuarios tanto en el users.json como en la db.
        const dbUserCreated = await User.createUserDb(dataUser);

        if (dbUserCreated) {
            res.redirect('/users/login');
        } else {
            res.render('./users/register-form', {
                // Arreglar para que dsp si se vea bien el error.
                errorMsg: {
                    email: {
                        msg: 'Un problema ha ocurrido mientras se creaba tu usuario!'
                    }
                },
                oldData: user
            });
        }

    },

    editIndex: async function(req, res) {
        // Update de los datos de los archivos
        let errorMsg = '';
        const id = req.params.id;

        const editUser = await Users.findByPk(id);

        res.render('./users/user-edit', {
            errorMsg : errorMsg,
            user: req.session.userLogged, // Se usa para el nav-bar
            editUser: editUser,
        });
    },

    editUser: async function(req, res) {
        const files = req.files; 
        const id = req.params.id; // Id del usuario a modificar.
        const user = req.body; // Datos recibidos del form de edicion.
        let loggedUser = req.session.userLogged;

        const editUser = await Users.findByPk(id);

        // Set new avatar/banner if modified, otherwise set the previous avatar/banner image.
        // Cambie la forma de nombrar a los files. req.files[0].filename es avatarName y  req.files[1].filename es bannerName
        let avatarFilename = editUser.avatar;
        let bannerFilename = editUser.banner;

        if (files.length > 0) {
            for (let i=0; i<files.length; i++) {
                if (files[i].fieldname == 'profileImage') {
                    // Elimino el anterior avatar.
                    const avatarPath = path.join(__dirname, '../../public/images/users/profiles/' + avatarFilename);
                    userFunction.removeImage(avatarPath);
                    // Le asigno el nuevo avatar.
                    avatarFilename = files[i].filename;
                } else if (files[i].fieldname == 'bannerImage') {
                    // Elimino el anterior banner.
                    const bannerPath = path.join(__dirname, '../../public/images/users/banners/' + bannerFilename);
                    userFunction.removeImage(bannerPath);
                    // Le asigno el nuevo banner.
                    bannerFilename = files[i].filename;
                }
            }
        }

        let dataUser = {
            ...user,
            avatar: avatarFilename,
            banner: bannerFilename
        }

        const updateResult = await User.editUserDb(dataUser, id);
        if (!updateResult) return res.send("Ha ocurrido un problema al editar el usuario");

        const updatedUser = await Users.findByPk(id);   // Necesito los datos actualizados asi que vuelvo a buscar el registro.

        if (loggedUser.id == id) {
            // Actualizo los datos del usuario activo en el session en caso de que este haya modificado sus propios datos.
            req.session.userLogged = updatedUser;  
        }

        if (loggedUser.role == 'admin') {
            return res.redirect('/users/list');
        }

        res.redirect('/');
    },
    deleteUser: async function(req, res) {
        if (!req.params.id) return;
        const id = req.params.id;
        let deleteUser = await Users.findByPk(id);
        let activeUser = req.session.userLogged;

        // Remove image files.
        const avatarPath = path.join(__dirname, '../../public/images/users/profiles/' + deleteUser.avatar);
        const bannerPath = path.join(__dirname, '../../public/images/users/banners/' + deleteUser.banner);
        userFunction.removeImage(avatarPath);
        userFunction.removeImage(bannerPath);

        // Borro el user de la db
        await Users.destroy({
            where: {
                id: id
            },
            force: true 
        });
        

        if (activeUser.id == id) {
            // Si estoy borrando mi propio usuario.
            req.session.userLogged = '';
            res.redirect('/users/login');
        } else {
            // Esto es por si en algun momento pinta poder borrar otros usuarios que no sean nuestros xdxd
            console.log("Has borrado un usuario que no es tuyo picaron");
            res.redirect('/');
        }

    },
    logout: function(req, res) {
        res.clearCookie("userEmail"); // Borro las coockies
        req.session.destroy(); // Borra todo lo que haya en session.
        return res.redirect('/');
    },
    search: async function(req, res) {
        if (!req.session.userLogged || req.session.userLogged.role != 'admin') return res.redirect('/users/login');
        const users = await Users.findAll();

        let userSearch = req.query.search;
        let userResults = []

        for (let i = 0; i < users.length; i++) {
            if (users[i].username.toLowerCase().includes(userSearch.toLowerCase()) || users[i].fullname.toLowerCase().includes(userSearch.toLowerCase())) {
                userResults.push(users[i])
            }
        }
        
        res.render('./users/user-list', {
            filter : '',
            users: userResults,
        });
    },
    filter: async function(req, res) {
        if (!req.session.userLogged || req.session.userLogged.role != 'admin') return res.redirect('/users/login');
        const filter = req.query.filter;

        const users = await Users.findAll();
        
        let userResults = [];
        switch (filter) {
            case 'all':
                userResults = users;
                break;
            case 'id':
                userResults = await userFunction.getUsersOrderedByIdDb();
                break;
            case 'role':
                userResults = await userFunction.getUsersOrderedByRoleDb();
                break;
            case 'name':
                userResults = await userFunction.getUsersOrderedByNameDb();
                break;
            case 'country':
                userResults = await userFunction.getUsersOrderedByCountryDb();
                break;
            default:
                res.send("Error");
        }

        res.render('./users/user-list', {
            filter : filter,
            users : userResults,
        });
    },
    test: async function(req, res) {

        const editUser = await Users.findByPk(25);

        // Set the profile image name if exists, otherwise set the previous image name.
        res.send(editUser.banner);

    }
};

module.exports = usersController;