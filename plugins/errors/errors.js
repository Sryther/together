module.exports = function(options, imports, register) {
    var router = require('express').Router();

    router.get('/404', function(req, res) {
        res.render('errors/404', {
            user: req.user
        });
    });

    register(null, {
        "errors": {
            router: router
        }
    });
};