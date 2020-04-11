module.exports = function (options, imports, register) {
  var mongoose = imports.db;
  var app = options.app;
  var googleApi = options.googleApi;
  var findOrCreate = require('mongoose-findorcreate');
  var _ = require('lodash');
  var ensure = require('connect-ensure-login');
  var router = require('express').Router();
  var request = require('request');
  var moment = require('moment');
  var momentDurationFormatSetup = require("moment-duration-format");

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

  momentDurationFormatSetup(moment);

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

    var videoId = url.includes('v=') ? url.split('v=')[1] : '';
    var ampersandPosition = videoId.indexOf('&');
    if (ampersandPosition !== -1) {
      videoId = videoId.substring(0, ampersandPosition);
    }

    var youtubeQueryUrl = "https://www.googleapis.com/youtube/v3/videos?id=" + videoId + " &part=contentDetails&key=" + googleApi.apiKey;

    request(youtubeQueryUrl, function (err, response, body) {
      var videoDuration = null;
      if (body.error !== null && body.error !== undefined) {
        var videoInfo = body.items[0];
        var complexDuration = videoInfo.contentDetails.duration;

        videoDuration = parseISO8601Duration(complexDuration);
      }

      var s = {
        user: user,
        name: name,
        type: type,
        url: url,
        playing: false,
        time: 0,
        lastUpdate: Date.now(),
        duration: videoDuration,
        watchers: [],
        private: private,
      };

      sessions.createOrUpdate(s, function (err) {
        res.redirect('/sessions/' + req.user.id);
      });
    });
  });

  router.post('/', function (req, res) {
    if (req.body.session !== null && req.body.session !== undefined && req.body.session !== "" && req.body.session.match(/^[a-zA-Z0-9]{5,}/) !== null) {
      res.redirect('/sessions/' + req.body.session);
    } else {
      res.redirect('/sessions/not-found');
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

  function parseISO8601Duration(iso8601Duration) {
    var iso8601DurationRegex = /(-)?P(?:([.,\d]+)Y)?(?:([.,\d]+)M)?(?:([.,\d]+)W)?(?:([.,\d]+)D)?T(?:([.,\d]+)H)?(?:([.,\d]+)M)?(?:([.,\d]+)S)?/;

    var matches = iso8601Duration.match(iso8601DurationRegex);

    return {
      sign: matches[1] === undefined ? '+' : '-',
      years: matches[2] === undefined ? 0 : matches[2],
      months: matches[3] === undefined ? 0 : matches[3],
      weeks: matches[4] === undefined ? 0 : matches[4],
      days: matches[5] === undefined ? 0 : matches[5],
      hours: matches[6] === undefined ? 0 : matches[6],
      minutes: matches[7] === undefined ? 0 : matches[7],
      seconds: matches[8] === undefined ? 0 : matches[8]
    };
  }
};
