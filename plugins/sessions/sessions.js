module.exports = function (options, imports, register) {
  var mongoose = imports.db;
  var app = options.app;
  var findOrCreate = require('mongoose-findorcreate');
  var _ = require('lodash');
  var ensure = require('connect-ensure-login');
  var router = require('express').Router();
  var moment = require('moment');

  var sessionSchema = mongoose.Schema({
    user: String,
    type: String,
    url: String,
    playing: Boolean,
    time: Number,
    name: String,
    lastUpdate: Number,
    watchers: Array,
    private: Boolean,
    duration: Number,
  });
  sessionSchema.plugin(findOrCreate);

  var Session = mongoose.model('Session', sessionSchema);

  var sessions = {
    all: function (callback) {
      Session.find({ private: true }, function (err, sessions) {
        if (err) return callback(err);
        callback(null, sessions);
      });
    },

    get: function (user, callback) {
      Session.findOne({
        user: user,
      }, function (err, session) {
        if (err) return callback(err);
        callback(null, session);
      });
    },

    create: function (session, callback) {
      var newSession = new Session(session);

      newSession.save(function (err) {
        if (err) return callback(err);
        callback();
      });
    },

    createOrUpdate: function (sess, callback) {
      var s = {
        user: sess.user,
        name: sess.name,
        type: sess.type,
        url: sess.url,
        playing: sess.playing,
        time: sess.time,
        lastUpdate: Date.now(),
        watchers: sess.watchers,
        private: sess.private,
        duration: 0,
      };

      Session.update({
        user: s.user,
      }, s, { upsert: true }, function (err, s) {
        if (err) {
          return callback(err);
        }

        callback();
      });
    },

    update: function (sess, callback) {
      var s = {
        user: sess.user,
        name: sess.name,
        type: sess.type,
        url: sess.url,
        playing: sess.playing,
        time: sess.time,
        lastUpdate: Date.now(),
        watchers: sess.watchers,
        private: sess.private,
        duration: sess.duration,
      };

      Session.update({
        user: s.user,
      }, s, function (err, s) {
        if (err) {
          return callback(err);
        }

        callback();
      });
    },

    addWatcher: function (user, watcher, callback) {
      Session.update({
        user: user,
      }, { $addToSet: { watchers: watcher } }, function (err) {
        if (err) {
          return callback(err);
        }

        callback();
      });
    },

    removeWatcher: function (user, watcher, callback) {
      Session.update({
        user: user,
      }, { $pull: { watchers: watcher } }, function (err) {
        if (err) {
          return callback(err);
        }

        callback();
      });
    },
  };

  router.get('/create', ensure.ensureLoggedIn('/auth/signin'), function (req, res) {
    var id = req.params.id;
    res.render('app/sessions/create', {
      user: req.user,
    });
  });

  router.post('/create', ensure.ensureLoggedIn('/auth/signin'), function (req, res) {
    var user = req.user.id;
    var name = req.body.name;
    var type = req.body.type;
    var url = req.body.url;
    var private = req.body.private;

    var s = {
      user: user,
      name: name,
      type: type,
      url: url,
      playing: false,
      time: 0,
      lastUpdate: Date.now(),
      watchers: [],
      private: private,
      duration: 0,
    };

    sessions.createOrUpdate(s, function (err) {
      res.redirect('/sessions/' + req.user.id);
    });
  });

  router.post('/', ensure.ensureLoggedIn('/auth/signin'), function (req, res) {
    if (req.body.session !== null && req.body.session !== undefined && req.body.session !== "") {
      res.redirect('/sessions/' + req.body.session);
    } else {
      res.redirect('/');
    }
  });

  // router.get('/', ensure.ensureLoggedIn('/auth/signin'), function (req, res) {
  //   sessions.all(function (err, sessions) {
  //     sessions = _.map(sessions, function(session) {
  //       session.lastUpdateHumanized = moment.duration(moment().diff(session.lastUpdate)).humanize();
  //       return session;
  //     });
  //
  //     res.render('app/sessions/all', {
  //       user: req.user,
  //       sessions: sessions,
  //       host: app.host,
  //     });
  //   });
  // });

  router.get('/:user', ensure.ensureLoggedIn('/auth/signin'), function (req, res) {
    var user = req.params.user;
    sessions.get(user, function (err, s) {
      res.render('app/sessions/get', {
        user: req.user,
        id: user,
        session: s,
        host: app.host + (app.isDev ? ':' + app.port : ''),
      });
    });
  });


  register(null, {
    sessions: {
      model: Session,
      controller: sessions,
      router: router,
    },
  });
};
