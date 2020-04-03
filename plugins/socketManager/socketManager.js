module.exports = function(options, imports, register) {
    var _ = require('lodash');
    var sessionsController = imports.sessions.controller;
    var ioFactory = imports.socket.factory;

    var sockets = {};

    register(null, {
        "socketManager": {
            middleware: function(req, res, next) {
                // Only catch /sessions ROUTES
                var index = req.originalUrl.indexOf('sessions');
                if (index > -1) {
                    sessionsController.all(function(err, sessions) {
                        console.log(sessions);
                        sessions.forEach(function(session) {
                            if (sockets[session.user] === undefined) { // Set only if doesn't already exist
                                sockets[session.user] = ioFactory(session.user);
                            }
                        });
                        next();
                    });
                } else {
                    next();
                }
            }
        }
    });
};
