// Play the visitor-requested recording through YouTube; never copy its audio.
export const SOUNDTRACK = Object.freeze({
  videoId: 'IIpB4PiIwcI',
  title: '旅人（伴奏）',
  artist: '王铮亮',
  url: 'https://www.youtube.com/watch?v=IIpB4PiIwcI',
});
let apiPromise;
function loadYouTube() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    const script = document.createElement('script'); script.src = 'https://www.youtube.com/iframe_api';
    const timeout = setTimeout(() => reject(new Error('YouTube player timed out')), 15000);
    script.onerror = () => { clearTimeout(timeout); script.remove(); reject(new Error('YouTube unavailable')); };
    window.onYouTubeIframeAPIReady = () => {
      clearTimeout(timeout); previous?.(); resolve(window.YT);
    };
    document.head.append(script);
  }).catch(error => { apiPromise = null; throw error; });
  return apiPromise;
}

export function createYouTubeMusic({ onState = () => {} } = {}) {
  let player, preparing, wanted = false, ready = false, disposed = false, failed = false, timeout;
  const container = document.querySelector('#music-player');
  function state(value) { if (!disposed) onState(value); }
  function play() {
    if (!ready || disposed || !wanted || document.hidden) return;
    player.setVolume(30); player.unMute(); player.playVideo();
  }
  function prepare() {
    if (preparing) return preparing;
    preparing = loadYouTube().then(YT => new Promise((resolve, reject) => {
      if (disposed) { resolve(); return; }
      const mount = document.createElement('div'); container.replaceChildren(mount);
      timeout = setTimeout(() => reject(new Error('YouTube player timed out')), 15000);
      player = new YT.Player(mount, {
        host: 'https://www.youtube-nocookie.com', width: '100%', height: '240', videoId: SOUNDTRACK.videoId,
        playerVars: { autoplay: 0, playsinline: 1, controls: 1, rel: 0, loop: 1, playlist: SOUNDTRACK.videoId, origin: location.origin },
        events: {
          onReady() {
            clearTimeout(timeout);
            if (disposed) { player.destroy(); resolve(); return; }
            ready = true; player.setVolume(30);
            if (wanted && !document.hidden) play(); else player.pauseVideo();
            resolve();
          },
          onStateChange(event) {
            if (disposed) return;
            if (event.data === 1) {
              if (!wanted || document.hidden) { player.pauseVideo(); return; }
              state('playing');
            } else if (event.data === 3 && wanted) state('loading');
            else if (event.data === 0 && wanted && !document.hidden) {
              player.seekTo(0, true); play();
            } else if (event.data === 2 && wanted) state('paused');
          },
          onAutoplayBlocked() { if (wanted) state('interaction'); },
          onError() { failed = true; clearTimeout(timeout); state('unavailable'); reject(new Error('YouTube playback unavailable')); },
        },
      });
    })).catch(() => { failed = true; if (wanted) state('unavailable'); });
    return preparing;
  }
  function setEnabled(value) {
    if (disposed) return;
    wanted = value;
    if (!value) { if (ready) player.pauseVideo(); state('muted'); return; }
    state('loading');
    if (failed) {
      clearTimeout(timeout); player?.destroy(); player = null; preparing = null; ready = false; failed = false;
    }
    if (ready) play(); else prepare();
  }
  function dispose() {
    if (disposed) return;
    disposed = true; wanted = false; clearTimeout(timeout); player?.destroy(); container.replaceChildren();
  }
  return { setEnabled, dispose };
}
