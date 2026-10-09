// Two streamed sources, joined at playback time. No soundtrack files are copied.
const TI8_SOURCE = 'https://chancethomas.com/player/3720614/tracks/4617170.mp3';
const TI10_VIDEO = 'VaJNlXkyUt8';
const CROSSFADE = 8;
let youtubeAPI;

function loadYouTube() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (youtubeAPI) return youtubeAPI;
  youtubeAPI = new Promise((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    const script = document.createElement('script'); script.src = 'https://www.youtube.com/iframe_api';
    const timeout = setTimeout(() => reject(new Error('YouTube player timed out')), 15000);
    script.onerror = () => { clearTimeout(timeout); reject(new Error('YouTube unavailable')); };
    window.onYouTubeIframeAPIReady = () => { clearTimeout(timeout); previous?.(); resolve(window.YT); };
    document.head.append(script);
  }).catch(error => { youtubeAPI = null; throw error; });
  return youtubeAPI;
}

function createTI10Deck() {
  let player, preparing, ready = false, failed = false, wanted = false, disposed = false, pending, volume = 0;
  const mount = document.createElement('div'); mount.id = 'ti10-menu-player';
  document.querySelector('#soundtrack-player').append(mount);
  function settle(error) {
    if (!pending) return;
    clearTimeout(pending.timeout); const request = pending; pending = null;
    if (error) request.reject(error); else request.resolve();
  }
  const deck = {
    name: 'TI10', level: .29,
    get time() { return ready ? player.getCurrentTime() : 0; },
    get duration() { return ready ? player.getDuration() : 0; },
    get playing() { return ready && player.getPlayerState() === 1; },
    get ended() { return ready && player.getPlayerState() === 0; },
    get failed() { return failed; },
    setVolume(value) { volume = value; if (ready) player.setVolume(value * 100); },
    prepare() {
      if (preparing) return preparing;
      preparing = loadYouTube().then(YT => new Promise((resolve, reject) => {
        if (disposed) { reject(new Error('Player disposed')); return; }
        const timeout = setTimeout(() => reject(new Error('TI10 player timed out')), 15000);
        player = new YT.Player(mount, {
          width: '100%', height: '200', videoId: TI10_VIDEO,
          playerVars: { autoplay: 0, playsinline: 1, controls: 0, disablekb: 1, rel: 0, origin: location.origin },
          events: {
            onReady() {
              clearTimeout(timeout);
              if (disposed) { player.destroy(); reject(new Error('Player disposed')); return; }
              ready = true; player.setVolume(0); player.playVideo(); resolve();
            },
            onStateChange(event) {
              if (event.data !== 1) return;
              if (disposed || !wanted) { player.pauseVideo(); player.seekTo(0, true); }
              else { player.setVolume(volume * 100); settle(); }
            },
            onError() { failed = true; clearTimeout(timeout); const error = new Error('TI10 playback unavailable'); settle(error); reject(error); }
          }
        });
      })).catch(error => { failed = true; throw error; });
      return preparing;
    },
    async play() {
      wanted = true;
      await deck.prepare();
      if (disposed || !wanted) throw new DOMException('Playback cancelled', 'AbortError');
      if (failed) throw new Error('TI10 playback unavailable');
      if (deck.playing) return;
      return new Promise((resolve, reject) => {
        settle(new DOMException('Playback superseded', 'AbortError'));
        pending = { resolve, reject, timeout: setTimeout(() => { failed = true; settle(new Error('TI10 playback timed out')); }, 10000) };
        player.setVolume(volume * 100); player.unMute(); player.playVideo();
      });
    },
    pause() { wanted = false; settle(new DOMException('Playback cancelled', 'AbortError')); if (ready) player.pauseVideo(); },
    seek(time) { if (ready) player.seekTo(time, true); },
    dispose() { disposed = true; deck.pause(); if (player?.destroy) player.destroy(); mount.remove(); }
  };
  return deck;
}

export function createMenuMedley({ onState = () => {} } = {}) {
  const element = new Audio(); element.id = 'ti8-menu-theme'; element.preload = 'none'; element.src = TI8_SOURCE;
  document.body.append(element);
  const ti8 = {
    name: 'TI8', level: .32,
    get time() { return element.currentTime; }, get duration() { return element.duration; },
    get playing() { return !element.paused && element.readyState >= 3; },
    get ended() { return element.ended; }, get failed() { return Boolean(element.error); },
    setVolume(value) { element.volume = value; }, play() { if (element.error) element.load(); return element.play(); },
    pause() { element.pause(); }, seek(time) { element.currentTime = time; },
    dispose() { element.pause(); element.removeAttribute('src'); element.load(); element.remove(); }
  };
  const decks = [ti8, createTI10Deck()];
  let enabled = false, disposed = false, active = 0, transition, pending = false, version = 0, timer;
  function status(state) {
    if (disposed) return;
    const track = transition ? `${decks[active].name} → ${decks[1 - active].name}` : decks[active].name;
    onState(state, { track, partial: decks.some(d => d.failed) });
  }
  function levels() {
    const progress = transition ? Math.min(1, Math.max(0, (decks[1 - active].time - transition.start) / transition.duration)) : 0;
    // Equal-power crossfade, with a gentle acceleration at the two ends.
    const eased = progress * progress * (3 - 2 * progress);
    decks[active].setVolume(decks[active].level * Math.cos(eased * Math.PI / 2));
    decks[1 - active].setVolume(decks[1 - active].level * Math.sin(eased * Math.PI / 2));
    return progress;
  }
  function startTransition() {
    if (pending || transition || decks[1 - active].failed) return;
    pending = true;
    const from = active, next = decks[1 - from], request = version;
    next.seek(0); next.setVolume(0);
    next.play().then(() => {
      if (disposed || !enabled || request !== version) return;
      pending = false;
      const left = decks[from].duration - decks[from].time;
      transition = { start: next.time, duration: Number.isFinite(left) && left > 0 ? Math.min(CROSSFADE, left) : .8 };
      status('playing'); levels();
    }).catch(error => {
      if (request !== version || disposed) return;
      pending = false; next.pause(); next.seek(0);
      if (error.name !== 'AbortError') status(decks[active].failed ? 'unavailable' : 'playing');
    });
  }
  function tick() {
    if (!enabled || disposed || document.hidden) return;
    if (transition) {
      const next = decks[1 - active];
      if (next.failed) {
        next.pause(); transition = null; levels(); status('playing');
      } else if (next.playing && levels() >= 1) {
        decks[active].pause(); decks[active].seek(0); active = 1 - active; transition = null;
        levels(); status('playing');
      }
      return;
    }
    const current = decks[active];
    if (current.failed || (current.duration > 0 && current.duration - current.time <= CROSSFADE)) startTransition();
    if (current.ended && !pending && !transition) {
      if (decks[1 - active].failed) {
        current.seek(0); current.play().then(() => status('playing')).catch(() => status('unavailable'));
      } else startTransition();
    }
  }
  function setEnabled(value) {
    if (disposed || enabled === value) return;
    enabled = value; version++;
    if (!value) {
      if (pending) { decks[1 - active].seek(0); pending = false; }
      decks.forEach(d => d.pause()); clearInterval(timer); timer = null; status('paused'); return;
    }
    const request = version;
    if (decks[1].failed) {
      decks[1].dispose(); decks[1] = createTI10Deck(); active = 0; transition = null;
    }
    decks[1].prepare().catch(() => { if (enabled) status(decks[active].failed ? 'unavailable' : 'playing'); });
    levels(); status('loading');
    const playing = transition ? decks : [decks[active]];
    Promise.all(playing.map(d => d.play())).then(() => {
      if (request === version && enabled) status('playing');
    }).catch(error => {
      if (request === version && enabled && error.name !== 'AbortError') {
        if (transition) { decks[1 - active].pause(); transition = null; levels(); }
        status('unavailable'); tick();
      }
    });
    if (!timer) timer = setInterval(tick, 80);
  }
  function dispose() {
    if (disposed) return;
    setEnabled(false); disposed = true; clearInterval(timer); decks.forEach(d => d.dispose());
  }
  return { setEnabled, dispose };
}
