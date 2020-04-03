'use strict';

// Load the IFrame Player API code asynchronously.
var tag = document.createElement('script');
tag.src = 'https://www.youtube.com/iframe_api?version=3';
var firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

// Replace the 'ytplayer' element with an <iframe> and
// YouTube player after the API code downloads.
var player = null;
var video = '';
var time = 0;
var lastUpdate = 0;
var playing = false;
var target = null;

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

function onYouTubeIframeAPIReady() {
  player = new YT.Player('ytplayer', {
    height: '390',
    width: '640',
    playerVars: {
      autoplay: 0,
      controls: 1,
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
    if (currentTime < time - 1 || currentTime > time + 1) {
      event.target.seekTo(time);
    }
    event.target.playVideo();
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
    if (lastUpdate) {
      var now = Date.now() / 1000;
      var last = lastUpdate / 1000;
      var timer = timerStart / 1000;
      var deltaStartPage = now - timer;
      var delta = (now - last) + deltaStartPage;
      time = time + delta;
    }

    target.loadVideoById(video, time, 'default');

    if (playing) {
      onPlay(time);
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
  if (target && curUser === curSession) {
    socket.emit('play', target.getCurrentTime());
  }
}

function pause() {
  if (target && curUser === curSession) {
    socket.emit('pause', target.getCurrentTime());
  }
}

function stop() {
  if (target && curUser === curSession) {
    socket.emit('stop', 0);
  }
}

function setTime() {
  if (target) {
    if (curUser === curSession) {
      socket.emit('time', target.getCurrentTime());
    }
  }
}

// Events
function onVideo(v) {
  if (video !== '') {
    location.reload();
  }
  video = v.id;
  time = v.time;
  playing = v.playing;
  lastUpdate = v.lastUpdate;
  loadVideo();
}

function onPlay(time) {
  playing = true;

  if (target) {
    target.seekTo(time, true);
    target.playVideo();

    if (!$('#playButton').hasClass('btn-success')) {
      $('#playButton').addClass('btn-success');
    }

    $('#pauseButton').removeClass('btn-warning');
    $('#stopButton').removeClass('btn-danger');
  }
}

function onPause() {
  playing = false;

  if (target) {
    target.pauseVideo();
    $('#playButton').removeClass('btn-success');

    if (!$('#pauseButton').hasClass('btn-warning')) {
      $('#pauseButton').addClass('btn-warning');
    }

    $('#stopButton').removeClass('btn-danger');
  }
}

function onStop() {
  playing = false;
  time = 0;

  if (target) {
    target.stopVideo();
    $('#playButton').removeClass('btn-success');
    $('#pauseButton').removeClass('btn-warning');
    if (!$('#stopButton').hasClass('btn-danger')) {
      $('#stopButton').addClass('btn-danger');
    }
  }
}

function onTime(t) {
  time = t + 1;
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
      '<span class="pull-right"><a title="' + name + '" target="_blank" href="/users/' + id + '">'+
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
  }
}

function buildMessage(id, message, sender, user) {
  console.log(watchers[user.id])
  return '<div class="message-wrapper ' + sender + '" id="mess-' + id + '">' +
    '<div class="circle-wrapper animated bounceIn"><img src="' + watchers[user.id].image + '" class="circle-wrapper"' +
    ' title="' + user.displayName + '"/></div>' +
    '<div class="text-wrapper">' + message + '</div>' +
    '</div>';
}