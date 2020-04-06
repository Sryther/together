'use strict';

// Load the IFrame Player API code asynchronously.
var tag = document.createElement('script');
tag.src = 'https://www.youtube.com/iframe_api?version=3';
var firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

var audio = new Audio('/assets/sounds/knock_brush.ogg');
var muted = false;

// Replace the 'ytplayer' element with an <iframe> and
// YouTube player after the API code downloads.
var player = null;
var video = '';
var lastVideo = '';
var lastUpdate = 0;
var playing = false;
var target = null;
var duration = 0;

var idMessage = 0;

var myLastMessage = '';

var bot = {
  id: 'bot',
  hidden: true,
  image: '/assets/img/bot.png',
  displayName: 'TOGETHER Bot',
  username: 'bot'
};

var watchers = {
  'bot': bot
};

$(document).ready(onDocumentReady);

function mute() {
  muted = !muted;

  if (muted) {
    $("#mute").removeClass('fa-bell');
    $("#mute").addClass('fa-bell-slash');
  } else {
    $("#mute").removeClass('fa-bell-slash');
    $("#mute").addClass('fa-bell');
  }
}

function onYouTubeIframeAPIReady() {
  player = new YT.Player('ytplayer', {
    height: '390',
    width: '640',
    playerVars: {
      autoplay: 0,
      controls: 1,
      autohide: 0,
      disablekb: 1,
      fs: 1,
      showinfo: 0,
      iv_load_policy: 3,
      cc_load_policy: 1
    },
    events: {
      onReady: onPlayerReady,
      onStateChange: onStateChange,
    },
  });
}

function onPlayerReady(event) {
  target = event.target;
  loadVideo();
}

function onStateChange(event) {
  if (!playing) {
    event.target.pauseVideo();
  } else {
    var currentTime = event.target.getCurrentTime()

    if (event.target && curUser !== curSession) {
      if (currentTime < time - 1 || currentTime > time + 1) {
        event.target.seekTo(time);
      }
      event.target.playVideo();
    } else {
      var curTime = Math.round(target.getCurrentTime());
      if (time !== null && curTime !== 0 && curTime !== null && curTime !== undefined) {
        time = curTime;
        socket.emit('time', curTime);
      }
    }
  }
}

function sendMessage() {
  if ($('#m').val() !== '') {
    myLastMessage = $('#m').val();
    socket.emit('message', myLastMessage);
    $('#m').val('');
  }
}

/**
 * Load a video using a player and an url
 * @param  {String}  video   Youtube Video URL
 * @param  {Number}  time    Time of the video
 * @param  {Number}  since
 * @param  {Boolean} playing Is the video playing
 * @return {null}
 */
function loadVideo() {
  if (target && video) {
    if (lastUpdate && playing) {
      var now = Date.now() / 1000;
      var last = lastUpdate / 1000;
      var timer = timerStart / 1000;
      var deltaStartPage = now - timer;
      var delta = (now - last) + deltaStartPage;
      time = Math.round(time + delta);
    }

    if (duration !== 0 && time > duration) {
      time = duration;
      playing = false;

      if ($("#pause-button") && $("#play-button")) {
        $("#pause-button").css("display", "none");
        $("#play-button").css("display", "inline-block");
      }
    }

    if (time !== null) {
      target.loadVideoById(video, time, 'default');

      if (playing) {
        onPlay(time);
      }
    }
  }
}

/**
 * Called when the document is ready
 * @return null
 */
function onDocumentReady() {
  // Tchat
  $('#send').click(function () {
    sendMessage();
    return false;
  });

  $('#m').keydown(function (event) {
    if (event.keyCode === 13) {
      sendMessage();
      return false;
    }
  });

  $('#send').prop('disabled', false);

  socket.on('video', onVideo);

  // Video controls
  socket.on('doPlay', onPlay);
  socket.on('doPause', onPause);
  socket.on('doStop', onStop);
  socket.on('doTime', onTime);
  socket.on('list', onList);
  socket.on('message', onMessage);
}

function play() {
  if (target && curUser === curSession) {;
    socket.emit('play', time)

    if ($("#pause-button") && $("#play-button")) {
      $("#pause-button").css("display", "inline-block");
      $("#play-button").css("display", "none");
    }
  }
}

function pause() {
  if (target && curUser === curSession) {
    socket.emit('pause', Math.round(target.getCurrentTime()));

    if ($("#pause-button") && $("#play-button")) {
      $("#pause-button").css("display", "none");
      $("#play-button").css("display", "inline-block");
    }
  }
}

function stop() {
  if (target && curUser === curSession) {
    socket.emit('stop', 0);

    if ($("#pause-button") && $("#play-button")) {
      $("#pause-button").css("display", "none");
      $("#play-button").css("display", "inline-block");
    }
  }
}

function setTime() {
  if (target) {
    if (curUser === curSession) {
      if (target.getDuration() !== 0) {
        socket.emit('duration', target.getDuration());
      }

      var curTime = Math.round(target.getCurrentTime());
      if (time !== null && curTime !== 0 && curTime !== null && curTime !== undefined) {
        socket.emit('time', curTime);
      }
    }
  }
}

// Events
function onVideo(v) {
  if (video !== '' && v.id !== lastVideo) {
    $("#session-name").html(v.name);
    $("#url-video").attr("href", v.url);
    $("#url-video").html(v.url);

    onMessage({
      user: bot,
      msg: 'La vidéo a été modifiée.'
    });

    socket.emit('welcome', curUser);
  }

  video = v.id;
  lastVideo = v.id;
  time = v.time;
  playing = v.playing;
  lastUpdate = v.lastUpdate;
  duration = v.duration;
  loadVideo();
}

function onPlay(time) {
  playing = true;

  if (target) {
    target.seekTo(time, true);
    target.playVideo();

    if (target.getDuration() !== 0) {
      socket.emit('duration', target.getDuration());
    }

    if (curUser === curSession) {
      if ($("#pause-button") && $("#play-button")) {
        $("#pause-button").css("display", "inline-block");
        $("#play-button").css("display", "none");
      }
    }
  }
}

function onPause() {
  playing = false;

  if (target) {
    target.pauseVideo();

    if (target.getDuration() !== 0) {
      socket.emit('duration', target.getDuration());
    }

    if (curUser === curSession) {
      if ($("#pause-button") && $("#play-button")) {
        $("#pause-button").css("display", "none");
        $("#play-button").css("display", "inline-block");
      }
    }
  }
}

function onStop() {
  playing = false;
  time = 0;

  if (target) {
    target.stopVideo();

    if (curUser === curSession) {
      if ($("#pause-button") && $("#play-button")) {
        $("#pause-button").css("display", "none");
        $("#play-button").css("display", "inline-block");
      }
    }
  }
}

function onTime(t) {
  var curTime = time;

  time = t + 1;
  if (curTime > time + 1 || curTime < time - 1) {
    console.log('update!')
    if (target) {
      target.seekTo(time);
    }
  }
}

function onList(session) {
  $('#watchers').html('');
  watchers = {
    'bot': bot
  };
  $.each(session.watchers, function (key, value) {
    var id = value.id;
    var displayName = value.displayName;
    var name = displayName;

    if (name.length > 17) {
      displayName = name.substring(0, 17) + '...';
    }

    watchers[value.id] = value;

    $('#watchers').append('<li class="list-group-item" id="user-' + id + '">' +
      '<span class="pull-right" style="max-width: calc(100% - 16px); height: 16px; max-height: 16px"><a title="' + name + '" target="_blank" href="/users/' + id + '" style="margin-left: 5px; display: block; white-space: nowrap; overflow: hidden; width: 100%; max-width: 100%; text-overflow: ellipsis; max-height: 16px; height: 16px">'+
      displayName + '</a></span> <img src="' + value.image + '" style="width: 16px; border-radius: 50%;" /></li>');
  });

  $('#numberWatchers').html(session.watchers.length);
}

function onMessage(data) {
  var sender = 'them';
  if (data.user.id === curUser) {
    sender = 'me';
  }

  var message = buildMessage(idMessage, data.msg, sender, data.user);
  if (message !== '') {
    $('#content').append($(message));
    $('#inner').scrollTop($('#inner').prop('scrollHeight'));

    emojify.run(document.getElementById('mess-' + idMessage));

    idMessage++;

    if (sender !== 'me' && !muted) {
      audio.volume = 0.2;
      audio.play();
    }
  }
}

function buildMessage(id, message, sender, user) {
  return '<div class="message-wrapper ' + sender + '" id="mess-' + id + '">' +
    '<div class="circle-wrapper animated bounceIn"><img src="' + watchers[user.id].image + '" class="circle-wrapper"' +
    ' title="' + user.displayName + '"/></div>' +
    '<div class="text-wrapper">' + message + '</div>' +
    '</div>';
}