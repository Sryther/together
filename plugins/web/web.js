module.exports = function(options, imports, register) {
    var router = require('express').Router();
    var sessions = imports.sessions;

    router.get("/", function(req, res) {
        if (req.user) {
            sessions.controller.get(req.user.id, function (err, session) {
                res.render('home', {
                    user: req.user,
                    session: err ? null : session
                });
            });
        } else {
            res.render('home', {
                user: req.user,
                session: null
            });
        }
    });

    router.get("/policy", function(req, res) {
        if (req.user) {
            sessions.controller.get(req.user.id, function (err, session) {
                res.render('guest/policy', {
                    user: req.user,
                    session: err ? null : session
                });
            });
        } else {
            res.render('guest/policy', {
                user: req.user,
                session: null
            });
        }
    });

    register(null, {
        "web": {
            router: router
        }
    });
};
