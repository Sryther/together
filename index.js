var architect = require('architect');
var config = require('./config');

var appConfig = [
  {
    packagePath: './plugins/error',
  }, {
    packagePath: './plugins/web',
  }, {
    packagePath: './plugins/db',
    addr: config.mongodb.addr,
  }, {
    packagePath: './plugins/users',
  }, {
    packagePath: './plugins/sessions',
    app: config.app,
    googleApi: config.passport.google,
  }, {
    packagePath: './plugins/socket',
  }, {
    packagePath: './plugins/socketManager',
  }, {
    packagePath: './plugins/app',
    rootFolder: __dirname,
    secret: config.app.secret,
  }, {
    packagePath: './plugins/auth',
    app: config.app,
    passport: config.passport,
  }, {
    packagePath: './plugins/server',
    port: config.app.port,
  },
  {
    packagePath: './plugins/errors',
  }
];

// Create relative tree
var tree = architect.resolveConfig(appConfig, __dirname);

// Starting the app
architect.createApp(tree, function (err, app) {
  if (err) console.log(err);

  var services = app.services;
  var server = services.server;
  server.launch();
});
