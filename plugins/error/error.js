module.exports = function(options, imports, register) {
    var PrettyError = require("pretty-error");
    var error = new PrettyError();
    error.skipNodeFiles();
    error.skipPackage('express');
    // error.start();

    register(null, {
        error: error
    });
};
