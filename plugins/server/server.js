module.exports = function(options, imports, register) {
    var http = require('http');
    var app = imports.app;
    var socket = imports.socket;

    var server = {
        launch: function() {
            /* Launch the server */
            var server = http.createServer(app);
            socket.create(server);

            server.listen(options.port, function(err) {
                if (err) console.error(err);
                console.log("Server listening on port " + options.port);
            });
        }
    };

    register(null, {
        "server": server
    });
};
