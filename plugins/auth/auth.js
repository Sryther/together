module.exports = function (options, imports, register) {
  var app = options.app;
  var pass = options.passport;
  var User = imports.users.model;
  var passport = require('passport');
  var FacebookStrategy = require('passport-facebook').Strategy;
  var GoogleStrategy = require('passport-google-oauth2').Strategy;
  var router = require('express').Router();
  var FB = require('fb');
  var google = require('googleapis');
  var _ = require('lodash');
  var crypto = require('crypto');

  var FACEBOOK_CLIENT_ID = pass.facebook.id;
  var FACEBOOK_CLIENT_SECRET = pass.facebook.secret;
  var GOOGLE_CLIENT_ID = pass.google.id;
  var GOOGLE_CLIENT_SECRET = pass.google.secret;

  var request = require('request').defaults({ encoding: null });

  var FACEBOOK_SALT = "facebookSalt";
  var GOOGLE_SALT = "googleSalt";

  passport.use(new FacebookStrategy({
      clientID: FACEBOOK_CLIENT_ID,
      clientSecret: FACEBOOK_CLIENT_SECRET,
      callbackURL: (options.app.isDev ? 'http://localhost:' + options.app.port : 'https://' + app.host) + '/auth/facebook/callback',
    },
    function (accessToken, refreshToken, profile, callback) {
      FB.setAccessToken(accessToken);
      FB.api(profile.id, {fields: ['id', 'name', 'gender', 'verified']}, function (userFb) {
        if (!userFb || userFb.error) {
          return callback(userFb.error || {});
        }

        FB.api(profile.id + '/picture?redirect=false&height=128&width=128', function (pictureFb) {
          if (!pictureFb || pictureFb.error) {
            return callback(pictureFb.error || {});
          }

          request.get(pictureFb.data.url, function (error, response) {
            var imageData = "";
            if (!error && response.statusCode === 200) {
              imageData = "data:" + response.headers["content-type"] + ";base64," + new Buffer(response.body).toString('base64');
            }

            var u = {
              id: crypto.createHash('md5').update(FACEBOOK_SALT + profile.id).digest('hex'),
              username: profile.username,
              displayName: userFb.name,
              gender: userFb.gender,
              profileUrl: profile.profileUrl,
              provider: profile.provider,
              verified: userFb.verified,
              bio: null,
              image: imageData,
            };

            User.findOrCreate({ id: u.id }, u, {upsert: true}, function (err, user) {
              return callback(err, user);
            });
          });
        });
      });
    }
  ));

  passport.use(new GoogleStrategy({
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: (options.app.isDev ? 'http://localhost:' + options.app.port : 'https://' + app.host) + '/auth/google/callback',
    },
    function(accessToken, refreshToken, profile, callback) {
      var img = profile._json.picture;
      var imageData = '';

      request.get(img, function (error, response, body) {
        if (!error && response.statusCode === 200) {
          imageData = "data:" + response.headers["content-type"] + ";base64," + new Buffer(body).toString('base64');
        }

        var u = {
          id: crypto.createHash('md5').update(GOOGLE_SALT + profile.id).digest('hex'),
          username: profile.displayName,
          displayName: profile.displayName,
          gender: profile.gender,
          profileUrl: profile._json.url,
          provider: profile.provider,
          verified: profile._json.verified,
          bio: profile._json.tagline,
          image: img,
        };

        User.findOrCreate({ id: u.id }, u, {upsert: true}, function (err, user) {
          return callback(err, user);
        });
      });
    }
  ));

  passport.serializeUser(function (user, callback) {
    callback(null, user);
  });

  passport.deserializeUser(function (obj, callback) {
    callback(null, obj);
  });

  router.get('/error', function (req, res) {
    res.render('auth/error', {});
  });

  router.get('/facebook', passport.authenticate('facebook'));

  router.get('/facebook/callback', passport.authenticate('facebook', {
      failureRedirect: '/',
    }), function (req, res) {
      res.redirect(req.session.returnTo || '/');
    }, function (err, req, res, next) {
      if (err) {
        console.log('err', JSON.stringify(err, null, 2));
      }

      res.redirect('/auth/error');
    }
  );

  router.get('/google', passport.authenticate('google', {
    scope: [
      'https://www.googleapis.com/auth/plus.login',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/plus.me',
    ]
  }));

  router.get('/google/callback',
    passport.authenticate('google', {
      failureRedirect: '/',
    }), function (req, res) {
      res.redirect(req.session.returnTo || '/');
    }, function (err, req, res, next) {
      if (err) {
        console.log('err', JSON.stringify(err, null, 2));
      }

      res.redirect('/auth/error');
    });

  router.get('/signin', function (req, res) {
    res.render('guest/signin', {
      user: req.user,
    });
  });

  router.get('/signout', function (req, res) {
    req.logout();
    res.redirect('/');
  });

  register(null, {
    auth: {
      passport: passport,
      router: router,
    },
  });
};
