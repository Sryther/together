module.exports = function (options, imports, register) {
  var _ = require('lodash');
  var async = require('async');
  var getYouTubeID = require('get-youtube-id');

  var usersController = imports.users.controller;
  var sessionsController = imports.sessions.controller;
  var io = null;

  var create = function create(app) {
    io = require('socket.io')(app);
  };

  var factory = function factory(user) {
    var i = io.of('/sessions/' + user);
    var usersConnected = [];
    var playing = false;
    var time = 0;
    var duration = 0;

    i.on('connection', function (socket) {
      socket.on('welcome', function (msg) {
        usersController.get(msg, function (err, watcher) {
          sessionsController.removeWatcher(user, watcher, function () {
            sessionsController.addWatcher(user, watcher, function () {
              // Save users
              usersConnected.push({
                user: watcher,
                socket: socket,
              });
              refreshList();
              refreshVideo();
              i.emit('message', {
                user: {id: "bot", displayName: "Bot", image: "/assets/img/bot.png"},
                msg: watcher.displayName + ' vient de rejoindre la session.',
              });
            });
          });
        });
      });

      socket.on('disconnect', function () {
        var index = _.findIndex(usersConnected, function (o) { return o.socket === socket; });

        if (index !== -1) {
          if (usersConnected[index].user.id === user) {
            playing = false;

            i.emit('doPause', { });

            i.emit('message', {
              user: { id: "bot", displayName: "Bot", image: "/assets/img/bot.png" },
              msg: usersConnected[index].user.displayName + ' a quitté la session. Il était le propriétaire de cette session. La vidéo est en pause.',
            });
          } else {
            i.emit('message', {
              user: { id: "bot", displayName: "Bot", image: "/assets/img/bot.png" },
              msg: usersConnected[index].user.displayName + ' a quitté la session.',
            });
          }

          updateSession(function () {
            sessionsController.removeWatcher(user, usersConnected[index].user, function () {
              usersConnected.splice(index, 1);
              refreshList();
            });
          });
        } else {
          refreshList();
        }
      });

      socket.on('message', function (msg) {
        var index = _.findIndex(usersConnected, function (o) { return o.socket === socket; });

        if (index !== -1) {
          i.emit('message', {
            user: usersConnected[index].user,
            msg: msg,
          });
        } else {

        }
      });

      // Video control

      // Play
      socket.on('play', function (t) {
        var index = _.findIndex(usersConnected, function (o) { return o.socket === socket; });

        if (usersConnected[index].user.id === user) {
          playing = true;
          time = t;
          updateSession(function () {
            i.emit('doPlay', time);
          });
        }
      });

      // Pause
      socket.on('pause', function (t) {
        var index = _.findIndex(usersConnected, function (o) { return o.socket === socket; });

        if (usersConnected[index].user.id === user) {
          playing = false;
          time = t;
          updateSession(function () {
            i.emit('doPause', { });
          });
        }
      });

      // Stop
      socket.on('stop', function (t) {
        var index = _.findIndex(usersConnected, function (o) { return o.socket === socket; });

        if (usersConnected[index].user.id === user) {
          playing = false;
          time = t;
          updateSession(function () {
            i.emit('doStop', {});
          });
        }
      });

      socket.on('time', function (t) {
        var index = _.findIndex(usersConnected, function (o) { return o.socket === socket; });

        if (index !== -1 && usersConnected[index].user.id === user) {
          time = t;
          updateSession(function (err) {});
          i.emit('doTime', time);
        }
      });

      socket.on('duration', function (d) {
        duration = d;
        updateSession(function (err) {});
      });

      function refreshList() {
        sessionsController.get(user, function (err, session) {
          i.emit('list', session);
        });
      }

      function refreshVideo(callback) {
        sessionsController.get(user, function (err, session) {
          var index = _.findIndex(usersConnected, function (o) { return o.socket === socket; });

          sessionsController.get(user, function (err, session) {
            if (usersConnected[index].user.id === user) {
              i.emit('video', {
                id: getYouTubeID(session.url),
                time: session.time,
                playing: session.playing,
                lastUpdate: session.lastUpdate,
                duration: session.duration
              });
            } else {
              socket.emit('video', {
                id: getYouTubeID(session.url),
                time: session.time,
                playing: session.playing,
                lastUpdate: session.lastUpdate,
                duration: session.duration,
              });
            }

            if (callback) {
              callback();
            }
          });
        });
      }
    });

    function updateSession(callback) {
      sessionsController.get(user, function (err, session) {
        if (err) {
          console.error(err);
        }

        var newSession = _.cloneDeep(session);
        newSession.playing = playing;
        newSession.time = time;
        newSession.duration = duration;
        sessionsController.update(newSession, function (err) {
          if (err) {
            console.error(err);
          }

          callback();
        });
      });
    }

    return i;
  };

  register(null, {
    socket: {
      factory: factory,
      create: create
    },
  });
};
