'use strict';

const ALL_QUALITIES = ['highres', 'hd1080', 'hd720', 'large', 'medium', 'small'];

// Load the IFrame Player API code asynchronously.
const tag = document.createElement('script');
const firstScriptTag = document.getElementsByTagName('script')[0];
tag.src = 'https://www.youtube.com/iframe_api';
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

function togetherApp(sessionInfo, socket) {
  const audio = new Audio('/assets/sounds/knock_brush.ogg');

  const bot = {
    id: 'bot',
    hidden: true,
    image: '/assets/img/bot.png',
    displayName: 'Bot',
    username: 'bot'
  };

  // Replace the 'ytplayer' element with an <iframe> and
  // YouTube player after the API code downloads.
  const playerInfo = {
    player: null,
    target: null,
    video: '',
    lastVideo: '',
    lastUpdate: 0,
    time: sessionInfo.time,
    playing: false,
    duration: 0,
    currentQuality: 'auto',
    theatreMode: false,
  };

  const currentSessionInfo = {
    session: sessionInfo.current,
    notificationsMuted: false,
    lastMessageId: 0,
    myLastMessage: '',
    watchers: {
      'bot': bot
    },
  };

  const currentUser = sessionInfo.currentUser;
  const currentHost = sessionInfo.originHost;

  // Elements
  const mainContainer = $("#main-container");
  const currentTimeEl = $("#current-time");
  const muteBtnEl = $("#mute-notifications");
  const muteIconEl = $("#mute-icon");
  const messageEl = $("#m");
  const pauseBtnEl = $("#pause-button");
  const playBtnEl = $("#play-button");
  const stopBtnEl = $("#stop-button");
  const volumeEl = $(".volume");
  const sendEl = $("#send");
  const qualitiesEl = $("#quality-drop a");
  const urlVideoEl = $("#url-video");
  const sessionNameEl = $("#session-name");
  const maxTimeEl = $("#max-time");
  const watchersEl = $("#watchers");
  const numberWatchersEl = $("#numberWatchers");
  const innerEl = $("#inner");
  const contentEl = $("#content");
  const playerEl = $(".player");
  const fullscreenBtnEl = $("#fs-button");
  const theatreButton = $("#theatre-button");
  const watchersContainerEl = $("#wachers-ctn");
  const messageWrapper = $(".messenger-wrapper");
  const shareCtn = $(".share-ctn");
  const alertScreenCtn = $("#alert-screen");

  // First timer
  const initDurationMoment = moment.duration(playerInfo.time, "seconds");
  currentTimeEl.html(moment.utc(initDurationMoment.as('milliseconds')).format('HH:mm:ss'));

  initialize();

  setInterval(setTime, 1000);
  setInterval(displayTimers, 1000);

  function mute() {
    currentSessionInfo.notificationsMuted = !currentSessionInfo.notificationsMuted;

    if (currentSessionInfo.notificationsMuted) {
      muteIconEl.removeClass('fa-bell');
      muteIconEl.addClass('fa-bell-slash');
    } else {
      muteIconEl.removeClass('fa-bell-slash');
      muteIconEl.addClass('fa-bell');
    }
  }

  function displayTimers() {
    let durationMoment = playerInfo.time || null;
    if (playerInfo.target && playerInfo.target.getCurrentTime() !== 0) {
      const currentTime = playerInfo.target.getCurrentTime();
      durationMoment = moment.duration(Math.round(currentTime), "seconds");
    } else {
      if (playerInfo.time) {
        durationMoment = moment.duration(playerInfo.time, "seconds");
      } else {
        durationMoment = moment.duration(0, "seconds");
      }
    }

    currentTimeEl.html(moment.utc(durationMoment.as('milliseconds')).format('HH:mm:ss'));
  }

  function onPlayerReady(event) {
    playerInfo.target = event.target;

    loadVideo();
  }

  function onStateChange(event) {
    setQualityControls();

    if (!playerInfo.playing) {
      playerInfo.target.pauseVideo();
    } else {
      const currentTime = event.target.getCurrentTime();

      if (event.target && currentUser !== currentSessionInfo.session) {
        if (currentTime < playerInfo.time - 1 || currentTime > playerInfo.time + 1) {
          playerInfo.target.seekTo(playerInfo.time);
        }
        playerInfo.target.playVideo();
      } else {
        const curTime = Math.round(playerInfo.target.getCurrentTime());

        if (playerInfo.time !== null && curTime !== 0 && curTime !== null && curTime !== undefined) {
          playerInfo.time = curTime;
          socket.emit('time', curTime);
        }
      }
    }
  }

  function sendMessage() {
    if (messageEl.val() !== '') {
      currentSessionInfo.myLastMessage = messageEl.val();
      socket.emit('message', currentSessionInfo.myLastMessage);
      messageEl.val('');
    }
  }

  function setQualityControls() {
    const availableQualities = playerInfo.target.getAvailableQualityLevels();

    if (availableQualities !== undefined) {
      for (let quality of ALL_QUALITIES) {
        const li = $("#quality-" + quality);

        if (availableQualities.indexOf(quality) === -1) {
          li.addClass("disabled");
          li.click(function () {});
        } else {
          li.removeClass("disabled");
          li.click(function () {
            changeQuality(quality);
          });
        }
      }
    }
  }

  /**
   * Load a video using a player and an url
   * @return {null}
   */
  function loadVideo() {
    if (playerInfo.target && playerInfo.video) {
      if (playerInfo.lastUpdate && playerInfo.playing) {
        const now = Date.now() / 1000;
        const last = playerInfo.lastUpdate / 1000;
        const timer = timerStart / 1000;
        const deltaStartPage = now - timer;
        const delta = (now - last) + deltaStartPage;
        playerInfo.time = Math.round(playerInfo.time + delta);
      }

      if (playerInfo.duration !== 0 && playerInfo.time > playerInfo.duration) {
        playerInfo.time = playerInfo.duration;
        playerInfo.playing = false;

        if (pauseBtnEl && playBtnEl) {
          pauseBtnEl.css("display", "none");
          playBtnEl.css("display", "inline-block");
        }
      }

      volumeEl.slider({
        min: 0,
        max: 100,
        value: 100,
        range: "min",
        slide: function (event, ui) {
          if (playerInfo.target) {
            playerInfo.target.setVolume(ui.value);
          }
        }
      });

      if (playerInfo.time !== null) {
        playerInfo.target.loadVideoById(playerInfo.video, playerInfo.time, 'default');

        setQualityControls();

        if (playerInfo.playing) {
          onPlay(playerInfo.time);
        }
      }
    }
  }

  /**
   * Called when the document is ready
   * @return null
   */
  function initialize() {
    // Tchat
    sendEl.click(function () {
      sendMessage();
      return false;
    });

    messageEl.keydown(function (event) {
      if (event.keyCode === 13) {
        sendMessage();
        return false;
      }
    });

    if (playBtnEl) {
      playBtnEl.click(play);
    }

    if (pauseBtnEl) {
      pauseBtnEl.click(pause);
    }

    if (stopBtnEl) {
      stopBtnEl.click(stop);
    }

    fullscreenBtnEl.click(toFullscreen);
    muteBtnEl.click(mute);

    theatreButton.click(toTheatre);

    sendEl.prop('disabled', false);

    socket.on('video', onVideo);

    // Video controls
    socket.on('doPlay', onPlay);
    socket.on('doPause', onPause);
    socket.on('doStop', onStop);
    socket.on('doTime', onTime);
    socket.on('list', onList);
    socket.on('message', onMessage);

    playerInfo.player = new YT.Player('ytplayer', {
      height: '390',
      width: '640',
      playerVars: {
        autoplay: 0,
        controls: 0,
        autohide: 0,
        disablekb: 1,
        fs: 1,
        showinfo: 0,
        showsearch: 0,
        enablejsapi: 1,
        hl: 'fr',
        iv_load_policy: 3,
        cc_load_policy: 0,
        loop: 0,
        modestbranding: 1,
        origin: currentHost,
        rel: 0
      },
      events: {
        onReady: onPlayerReady,
        onStateChange: onStateChange,
        onPlaybackQualityChange: onPlayerPlaybackQualityChange,
      },
    });
  }

  function play() {
    if (playerInfo.target && currentUser === currentSessionInfo.session) {
      socket.emit('play', playerInfo.time);

      if (pauseBtnEl && playBtnEl) {
        pauseBtnEl.css("display", "inline-block");
        playBtnEl.css("display", "none");
      }
    }
  }

  function pause() {
    if (playerInfo.target && currentUser === currentSessionInfo.session) {
      socket.emit('pause', Math.round(playerInfo.target.getCurrentTime()));

      if (pauseBtnEl && playBtnEl) {
        pauseBtnEl.css("display", "none");
        playBtnEl.css("display", "inline-block");
      }
    }
  }

  function stop() {
    if (playerInfo.target && currentUser === currentSessionInfo.session) {
      socket.emit('stop', 0);

      if (pauseBtnEl && playBtnEl) {
        pauseBtnEl.css("display", "none");
        playBtnEl.css("display", "inline-block");
      }
    }
  }

  function toTheatre() {
    playerInfo.theatreMode = !playerInfo.theatreMode;
    const iconSvg = theatreButton.find('svg');

    const titleCtn = $("#title-ctn");
    const sessionCtn = $("#session-ctn");
    const footer = $(".footer");

    const playerCtn2 = $(".player-ctn");
    const playerEl2 = $(".player");
    const basicControls = $(".basic-controls");
    const volumeCtn = $(".volume");
    const volumeSlider = $(".volume .ui-slider-handle");
    const controlsCtn = $(".controls");
    const htmlEl = $("html");
    const messengerCtn = $("#messenger-ctn");

    const iframe = $(playerInfo.target.getIframe());

    if (playerInfo.theatreMode) {
      theatreButton.addClass("active");
      theatreButton.addClass("btn-primary");
      theatreButton.removeClass("btn-default");

      titleCtn.hide();

      sessionCtn.removeClass("col-xs-12").removeClass("col-sm-12").removeClass("col-md-8").removeClass("col-lg-7");
      sessionCtn.addClass("col-xs-10").addClass("col-sm-10").addClass("col-md-9").addClass("col-lg-9");

      mainContainer.removeClass("container");
      mainContainer.addClass("container-fluid");
      mainContainer.addClass("theatre");
      htmlEl.addClass("theatre");
      messengerCtn.addClass("theatre");

      volumeCtn.addClass("theatre");
      volumeSlider.addClass("theatre");
      basicControls.addClass("theatre");
      playerCtn2.addClass("theatre");
      playerEl2.addClass("theatre");
      controlsCtn.addClass("theatre");

      iconSvg.attr('style', 'fill: #fff');

      watchersContainerEl.hide();

      shareCtn.hide();
      alertScreenCtn.hide();
      footer.hide();

      iframe.attr('width', '1280px');
      iframe.attr('height', '720px');
    } else {
      theatreButton.removeClass("active");
      theatreButton.removeClass("btn-primary");
      theatreButton.addClass("btn-default");

      titleCtn.show();

      sessionCtn.removeClass("col-xs-10").removeClass("col-sm-10").removeClass("col-md-9").removeClass("col-lg-9");
      sessionCtn.addClass("col-xs-12").addClass("col-sm-12").addClass("col-md-8").addClass("col-lg-7");

      mainContainer.addClass("container");
      mainContainer.removeClass("container-fluid");
      mainContainer.removeClass("theatre");
      htmlEl.removeClass("theatre");
      messengerCtn.removeClass("theatre");

      volumeCtn.removeClass("theatre");
      volumeSlider.removeClass("theatre");
      basicControls.removeClass("theatre");
      playerCtn2.removeClass("theatre");
      playerEl2.removeClass("theatre");
      controlsCtn.removeClass("theatre");

      iconSvg.attr('style', '');

      iframe.attr('width', '640px');
      iframe.attr('height', '390px');

      shareCtn.show();
      alertScreenCtn.show();
      footer.show();

      watchersContainerEl.show();
    }
  }

  function toFullscreen() {
    if (playerInfo.target) {
      const iframe = playerInfo.target.getIframe();
      var requestFullScreen = iframe.requestFullScreen || iframe.mozRequestFullScreen || iframe.webkitRequestFullScreen;
      if (requestFullScreen) {
        requestFullScreen.bind(iframe)();
      }
    }
  }

  function changeQuality(quality) {
    if (playerInfo.target) {
      playerInfo.currentQuality = quality;

      for (let href of qualitiesEl) {
        $(href).removeClass("text-primary");
      }
      const qualityToHighlight = $("#quality-" + quality + " > a");
      qualityToHighlight.addClass("text-primary");

      playerInfo.target.setPlaybackQuality(quality);
    }
  }

  function onPlayerPlaybackQualityChange(event) {
    const playbackQuality = playerInfo.target.getPlaybackQuality();
    if (playbackQuality !== currentSessionInfo.currentQuality) {
      playerInfo.target.setPlaybackQuality(currentSessionInfo.currentQuality);
    }
  }

  function setTime() {
    if (playerInfo.target) {
      if (currentUser === currentSessionInfo.session) {
        if (playerInfo.target.getDuration() !== 0) {
          socket.emit('duration', playerInfo.target.getDuration());
        }

        const currentTime = Math.round(playerInfo.target.getCurrentTime());
        if (playerInfo.time !== null && currentTime !== 0 && currentTime !== null && currentTime !== undefined) {
          socket.emit('time', currentTime);
        }
      }
      buildPlayer();
    }
  }

  // Events
  function onVideo(v) {
    if (playerInfo.video !== '' && v.id !== playerInfo.lastVideo) {
      sessionNameEl.html(v.name);
      urlVideoEl.attr("href", v.url);
      urlVideoEl.html(v.url);

      currentTimeEl.html('00:00:00');

      onMessage({
        user: bot,
        msg: 'La vidéo a été modifiée.'
      });

      socket.emit('welcome', currentUser);
    }

    playerInfo.video = v.id;
    playerInfo.lastVideo = v.id;
    playerInfo.time = v.time;
    playerInfo.playing = v.playing;
    playerInfo.lastUpdate = v.lastUpdate;
    playerInfo.duration = v.duration;

    if (playerInfo.duration && playerInfo.duration > 0) {
      const durationMoment = moment.duration(playerInfo.duration, "seconds");
      maxTimeEl.html(moment.utc(durationMoment.as('milliseconds')).format('HH:mm:ss'));
    }

    loadVideo();
  }

  function onPlay(time) {
    playerInfo.playing = true;

    if (playerInfo.target) {
      playerInfo.target.seekTo(time, true);
      playerInfo.target.playVideo();

      setTimeout(setQualityControls, 500);

      if (playerInfo.target.getDuration() !== 0) {
        socket.emit('duration', playerInfo.target.getDuration());

        buildPlayer();
      }

      if (currentUser === currentSessionInfo.session) {
        if (pauseBtnEl && playBtnEl) {
          pauseBtnEl.css("display", "inline-block");
          playBtnEl.css("display", "none");
        }
      }
    }
  }

  function onPause() {
    playerInfo.playing = false;

    if (playerInfo.target) {
      playerInfo.target.pauseVideo();

      if (playerInfo.target.getDuration() !== 0) {
        socket.emit('duration', playerInfo.target.getDuration());
      }

      if (currentUser === currentSessionInfo.session) {
        if (pauseBtnEl && playBtnEl) {
          pauseBtnEl.css("display", "none");
          playBtnEl.css("display", "inline-block");
        }
      }
    }
  }

  function onStop() {
    playerInfo.playing = false;
    playerInfo.time = 0;

    if (playerInfo.target) {
      playerInfo.target.stopVideo();

      if (currentUser === currentSessionInfo.session) {
        if (pauseBtnEl && playBtnEl) {
          pauseBtnEl.css("display", "none");
          playBtnEl.css("display", "inline-block");
        }
      }
    }
  }

  function onTime(t) {
    const currentTime = playerInfo.time;

    playerInfo.time = t + 1;
    if (currentTime > playerInfo.time + 1 || currentTime < playerInfo.time - 1) {
      if (playerInfo.target) {
        playerInfo.target.seekTo(playerInfo.time);
      }
    }
  }

  function onList(session) {
    watchersEl.html('');

    currentSessionInfo.watchers = {
      'bot': bot
    };

    $.each(session.watchers, function (key, value) {
      const id = value.id;
      let displayName = value.displayName;
      const name = displayName;

      if (name.length > 17) {
        displayName = name.substring(0, 17) + '...';
      }

      currentSessionInfo.watchers[value.id] = value;

      watchersEl.append('<li class="list-group-item" id="user-' + id + '">' +
          '<span class="pull-right" style="max-width: calc(100% - 16px); height: 16px; max-height: 16px"><a title="' + name + '" target="_blank" href="/users/' + id + '" style="margin-left: 5px; display: block; white-space: nowrap; overflow: hidden; width: 100%; max-width: 100%; text-overflow: ellipsis; max-height: 16px; height: 16px">' +
          displayName + '</a></span> <img src="' + value.image + '" style="width: 16px; border-radius: 50%;" /></li>');
    });

    numberWatchersEl.html(session.watchers.length);
  }

  function onMessage(data) {
    let sender = 'them';
    if (data.user.id === currentUser) {
      sender = 'me';
    }

    const message = buildMessage(currentSessionInfo.lastMessageId, data.msg, sender, data.user);
    if (message !== '') {
      contentEl.append(message);
      innerEl.scrollTop(innerEl.prop('scrollHeight'));
      emojify.run(document.getElementById('mess-' + currentSessionInfo.lastMessageId));

      currentSessionInfo.lastMessageId++;

      if (sender !== 'me' && !currentSessionInfo.notificationsMuted) {
        audio.volume = 0.2;
        audio.play().then(r => {
        });
      }
    }
  }

  function buildPlayer() {
    playerEl.slider({
      min: 0,
      max: playerInfo.duration,
      value: playerInfo.time,
      range: "min",
      slide: function (event, ui) {
        if (currentUser === currentSessionInfo.session) {
          socket.emit('time', ui.value);
        } else {
          playerEl.slider('value', playerInfo.time);
        }

        const div = $(ui.handle).data("bs.tooltip").$tip[0];
        const pos = $.extend({}, $(ui.handle).offset(), { width: $(ui.handle).get(0).offsetWidth,
          height: $(ui.handle).get(0).offsetHeight
        });

        const actualWidth = div.offsetWidth;

        const offset = {left: pos.left + pos.width / 2 - actualWidth / 2}
        $(div).offset(offset);

        $(div).find(".tooltip-inner").text(moment.utc(moment.duration(Math.round(ui.value), "seconds").as('milliseconds')).format('HH:mm:ss'));
      }
    });

    playerEl.find(".ui-slider-handle:first").attr('data-original-title', moment.utc(moment.duration(Math.round(playerInfo.time), "seconds").as('milliseconds')).format('HH:mm:ss'));

    playerEl.find(".ui-slider-handle:first")
        .tooltip({
          title: moment.utc(moment.duration(Math.round(playerInfo.time), "seconds").as('milliseconds')).format('HH:mm:ss'),
          trigger: "hover focus"
        });

    const durationMoment = moment.duration(Math.round(playerInfo.duration), "seconds");
    maxTimeEl.html(moment.utc(durationMoment.as('milliseconds')).format('HH:mm:ss'));
  }

  function buildMessage(id, message, sender, user) {
    const mainDiv = $('<div />', {
      class: "message-wrapper " + sender,
      id: "mess-" + id
    });

    const wrapperDiv = $('<div />', {
      class: "circle-wrapper animated bounceIn",
      title: currentSessionInfo.watchers[user.id].displayName + ' à ' + moment().format('HH:mm:ss')
    });

    if (sender === 'them') {
      wrapperDiv.tooltip({
        placement: 'right',
        trigger: 'hover focus'
      });
    }

    const imgDiv = $('<img />', {
      src: currentSessionInfo.watchers[user.id].image,
      class: 'circle-wrapper',
      title: user.displayName
    });

    const textWrapper = $('<div />', {
      class: 'text-wrapper',
      html: message
    });

    wrapperDiv.append(imgDiv);

    mainDiv.append(wrapperDiv);
    mainDiv.append(textWrapper)


    return mainDiv;
  }
}