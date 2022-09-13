const path = require('path');
const bcrypt = require('bcrypt');
const { validationResult } = require('express-validator');
const fileOperation = require('../modules/fileControl');
const userFunction = require('../modules/userFunction');
const { v4: uuidv4 } = require('uuid');
const User = require('../modules/User');

const allUsersFile = path.join(__dirname, '../data/users.json');

const usersController = {
    login: function(req, res) {
        res.render('./users/login-form');
    },
    processLogin: function(req, res) {      
        const user = req.body;

        const userToLogin = User.findByField('email', (user.email).toLowerCase());
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
    profile: function(req, res) {
        res.render('./users/profile');
    },
    myPurchases: function(req, res) {
        res.render('./users/my-purchases');
    },
    register: function(req, res) {
        res.render('./users/register-form');
    },
    recover: function(req, res) {
        res.render('./users/recover', {

        });
    },
    list: function(req, res) {
        // Update de los datos de los archivos
        const users = fileOperation.readFile(allUsersFile);
        res.render('./users/user-list', {
            filter : '',
            users: users,
            user: req.session.userLogged
        });
    },
    processRegister: function(req, res) {
        const files = req.files;
        let avatarFilename = 'default.jpg';
        let bannerFilename = 'default-banner.jpg';
        
        console.log(files)
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
            // console.log(errors.mapped());
            return res.render('./users/register-form', {
                errors: errors.mapped(), // Mapped convierte el array de errores en un obj literal con (name del elemento) y sus diferentes propiedades
                old: user
            });
        }

        const emailInDb = User.findByField('email', user.email);
        const usernameInDb = User.findByField('username', user.username);

        if (emailInDb) {
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

        console.log(avatarFilename)
        console.log(bannerFilename)

        const userCreated = User.create(dataUser);
        res.redirect('/users/login');

    },

    editIndex: function(req, res) {
        // Update de los datos de los archivos
        let errorMsg = '';
        const id = req.params.id;
        const users = fileOperation.readFile(allUsersFile);

        let editUser = userFunction.getUserById(users, id);

        res.render('./users/user-edit', {
            errorMsg : errorMsg,
            user: req.session.userLogged, // Se usa para el nav-bar
            editUser: editUser,
        });
    },

    editUser: function(req, res) {
        let errorMsg = '';
        const files = req.files; 
        const id = req.params.id; // Id del usuario a modificar.
        const data = req.body; // Datos recibidos del form de edicion.

        // const activeUser = fileOperation.readFile(activeUserFile);
        const allUsers = fileOperation.readFile(allUsersFile); 
        const editUser = userFunction.getUserById(allUsers, id); 

        if (!(req.validProfileExtension && req.validBannerExtension)) {
            errorMsg = "Archivo de imagen no valido!";
            res.render('./users/user-edit', {
                editUser : editUser,
                errorMsg : errorMsg,
                user: req.session.userLogged
            });
            return;
        }

        // Set the profile image name if exists, otherwise set the previous image name.
        // Cambie la forma de nombrar a los files. req.files[0].filename es avatarName y  req.files[1].filename es bannerName
        const profileImageName = (files.profileImage) ? req.files.profileImage[0].filename : editUser.avatarImageName;
        const bannerImageName = (files.bannerImage) ? req.files.bannerImage[0].filename : editUser.bannerName;

        let avatarFullPath = (files.profileImage) ? req.files.profileImage[0].path : '';
        let bannerFullPath = (files.bannerImage) ? req.files.bannerImage[0].path : '';

        let modifiedUser = {
            id: editUser.id,
            accCreationDate: editUser.accCreationDate,
            name: data.name,
            username: data.username,
            password: data.password,
            avatarImageName: profileImageName,
            bannerName: bannerImageName,
            avatarPath: avatarFullPath,
            bannerPath: bannerFullPath,
            email: data.email,
            address: data.address,
            addressNumber: data.addressNumber,
            birthdate: data.birthdate,
            role: data.role,
            gender: data.gender,
            country: data.country,
            cash: data.cash,
            interests: data.interest
        };
        // return res.send(modifiedUser);
        // Actualizo el usuario activo en el session.
        req.session.userLogged = modifiedUser;

        // Elimino del servidor las anteriores imagenes del usuario en caso de que este haya subido unas nuevas.
        const profilePath = path.join(__dirname, '../../public/images/users/profiles/' + editUser.avatarImageName);
        const bannerPath = path.join(__dirname, '../../public/images/users/banners/' + editUser.bannerName);
        if (profileImageName != editUser.avatarImageName) userFunction.removeImage(profilePath);
        if (bannerImageName != editUser.bannerName) userFunction.removeImage(bannerPath);
        
        
        // Creo un nuevo array sin el elemento modificado.
        let updatedArray = userFunction.removeUserFromArray(allUsers, id);
        updatedArray.push(modifiedUser);
        fileOperation.writeFile(updatedArray, allUsersFile);

        if (editUser.role == 'admin') {
            res.redirect('/users/list');
            return;
        }
        res.redirect('/');
    },
    deleteUser: function(req, res) {
        if (!req.params.id) return;
        const id = req.params.id;
        let allUsers = fileOperation.readFile(allUsersFile); // ReadFile devuelve un array de objetos usuario.
        let activeUser = fileOperation.readFile(activeUserFile);
        
        let newArray = userFunction.removeUserFromArray(allUsers, id);
        fileOperation.writeFile(newArray, allUsersFile);
        
        if (activeUser.id == id) {
            fileOperation.writeActiveUser({}, activeUserFile); // Limpio el archivo active-user
            req.session.activeUser = {};
            res.redirect('/users/login');
        } else {
            // Esto es por si en algun momento pinta poder borrar otros usuarios que no sean nuestros xdxd
            req.session.activeUser = {}; 
            res.redirect('/users/login');
        }

        // Remove image files.
        userFunction.removeUserProfileBannerImage(allUsers, id);
    },
    logout: function(req, res) {
        res.clearCookie("userEmail"); // Borro las coockies
        req.session.destroy(); // Borra todo lo que haya en session.
        return res.redirect('/');
    },
    search: function(req, res) {
        users = fileOperation.readFile(allUsersFile);
        let userSearch = req.query.search;
        let userResults = []

        for (let i = 0; i < users.length; i++) {
            if (users[i].username.toLowerCase().includes(userSearch.toLowerCase()) || users[i].name.toLowerCase().includes(userSearch.toLowerCase())) {
                userResults.push(users[i])
            }
        }
        
        res.render('./users/user-list', {
            filter : '',
            users: userResults,
            user: req.session.userLogged
        });
    },
    filter: function(req, res) {
        const filter = req.query.filter;

        users = fileOperation.readFile(allUsersFile);
        
        let userResults = [];
        switch (filter) {
            case 'all':
                userResults = users;
                break;
            case 'id':
                userResults = userFunction.getUsersOrderedById(users);
                break;
            case 'role':
                userResults = userFunction.getUsersOrderedByRole(users);
                break;
            case 'name':
                userResults = userFunction.getUsersOrderedByName(users);
                break;
            case 'country':
                userResults = userFunction.getUsersOrderedByCountry(users);
                break;
            default:
                res.send("Error");
        }

        res.render('./users/user-list', {
            filter : filter,
            users : userResults,
            user: req.session.userLogged
        });
    }
};

module.exports = usersController;