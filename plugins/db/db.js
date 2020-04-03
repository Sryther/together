module.exports = function(options, imports, register) {
    var mongoose = require('mongoose');
    mongoose.connect(options.addr);
    var db = mongoose.connection;

    register(null, {
        "db": mongoose
    });
};
