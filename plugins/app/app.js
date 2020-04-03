module.exports = function(options, imports, register) {
    var express = require('express');
    var app = express();
    var jwt = require('jsonwebtoken');
    var expressJwt = require('express-jwt');
    var morgan = require('morgan');
    var bodyParser = require('body-parser');
    var methodOverride = require('method-override');
    var swig = require('swig');
    var cookieParser = require('cookie-parser');
    var session = require('express-session');

    /// IMPORTS ///
    var error = imports.error;
    var users = imports.users;
    var sessions = imports.sessions;
    var web = imports.web;
    var auth = imports.auth;
    var socketManager = imports.socketManager;

    var allowCrossDomain = function(req, res, next) {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
        res.header('Access-Control-Allow-Headers', 'Content-Type');
        next();
    };

    // PRETTY ERRORS //
    app.use(function(err, req, res, next) {
        console.log(error.render(err));
    });

    /// CONFIGURATION ///
    app.use(express.static(options.rootFolder));
    app.use(morgan('dev')); // Log every request to the console
    app.use(bodyParser.urlencoded({
        extended: true
    }));
    app.use(methodOverride());
    app.use(cookieParser());
    app.use(allowCrossDomain);
    app.use(session({
        secret: options.secret,
        resave: true,
        saveUninitialized: true
    }));

    // Initialize Passport and restore authentication state, if any, from the session.
    app.use(auth.passport.initialize());
    app.use(auth.passport.session());
    app.use(socketManager.middleware);

    app.engine('html', swig.renderFile);
    app.set('views', options.rootFolder + '/views');
    app.set('view engine', 'html');
    app.set('view cache', false); // True in production
    swig.setDefaults({
        cache: false // True in production
    });

    /// ROUTES ///
    app.use("/", web.router);
    app.use("/users", users.router);
    app.use("/sessions", sessions.router);
    app.use("/auth", auth.router);

    register(null, {
        "app": app
    });
};
