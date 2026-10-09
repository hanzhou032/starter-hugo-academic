export function createWorldAudio({ onMusicState = () => {} } = {}) {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) throw new Error('Web Audio unavailable');
  const context = new AudioContext(), master = context.createGain(), effects = context.createGain();
  const limiter = context.createDynamicsCompressor();
  limiter.threshold.value = -16; limiter.knee.value = 16; limiter.ratio.value = 5; limiter.attack.value = .006; limiter.release.value = .2;
  effects.gain.value = .65; master.gain.value = 0;
  effects.connect(master); master.connect(limiter); limiter.connect(context.destination);

  // An original local recording; created only by the explicit sound control.
  const music = new Audio(new URL('./assets/music/islands-of-discovery.mp3', import.meta.url).href);
  music.id = 'world-soundtrack'; music.preload = 'none'; music.loop = true;
  document.body.append(music);
  const musicSource = context.createMediaElementSource(music), musicGain = context.createGain();
  musicGain.gain.value = .7; musicSource.connect(musicGain); musicGain.connect(master);
  let enabled = false, disposed = false, lastImpact = -10, simultaneousHits = 0, playbackVersion = 0;
  async function playMusic() {
    const request = ++playbackVersion;
    onMusicState('loading');
    try {
      // Call play within the activation gesture, before awaiting anything.
      if (music.error) music.load();
      await music.play();
      if (!disposed && enabled && !document.hidden && request === playbackVersion) onMusicState('playing');
    } catch (error) {
      if (!disposed && enabled && request === playbackVersion && error.name !== 'AbortError') onMusicState('unavailable');
    }
  }
  function pauseMusic() {
    playbackVersion++; music.pause();
    if (!disposed) onMusicState('paused');
  }

  let noiseSeed = 47329;
  const random = () => { noiseSeed = (1664525 * noiseSeed + 1013904223) >>> 0; return noiseSeed / 4294967296; };
  const noise = context.createBuffer(1, context.sampleRate, context.sampleRate);
  const noiseData = noise.getChannelData(0);
  for (let i = 0; i < noiseData.length; i++) noiseData[i] = random() * 2 - 1;
  function route(gain, bus, pan = 0) {
    const stereo = context.createStereoPanner(); stereo.pan.value = pan;
    gain.connect(stereo); stereo.connect(bus); return stereo;
  }
  function noiseBurst(at, duration, volume, cutoff, bus, pan = 0, metallic = false) {
    const source = context.createBufferSource(), filter = context.createBiquadFilter(), gain = context.createGain();
    source.buffer = noise; source.playbackRate.value = .85 + random() * .3;
    filter.type = metallic ? 'highpass' : 'lowpass'; filter.frequency.value = cutoff;
    gain.gain.setValueAtTime(.0001, at); gain.gain.linearRampToValueAtTime(volume, at + .004); gain.gain.exponentialRampToValueAtTime(.0001, at + duration);
    source.connect(filter); filter.connect(gain); const stereo = route(gain, bus, pan);
    source.start(at, random() * .3); source.stop(at + duration + .02);
    source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); stereo.disconnect(); };
  }
  async function setEnabled(value) {
    if (disposed) return false;
    enabled = value;
    if (enabled && !document.hidden) {
      playMusic();
      await context.resume();
      if (disposed) return false;
    } else {
      pauseMusic();
    }
    master.gain.cancelScheduledValues(context.currentTime);
    master.gain.setTargetAtTime(enabled ? .68 : 0, context.currentTime, enabled ? .12 : .045);
    if (!enabled) setTimeout(() => { if (!enabled && !disposed) context.suspend().catch(() => {}); }, 300);
    return enabled;
  }
  function hit({ critical = false, base = false, pan = 0, quiet = false } = {}) {
    if (!enabled || disposed || context.state !== 'running') return;
    const at = context.currentTime;
    if (at - lastImpact > .065) { lastImpact = at; simultaneousHits = 0; }
    if (++simultaneousHits > 3) return;
    const volume = (quiet ? .38 : 1) / Math.sqrt(simultaneousHits);
    noiseBurst(at, critical ? .18 : .1, (critical ? .22 : .13) * volume, base ? 850 : 1800, effects, pan, true);
    const oscillator = context.createOscillator(), gain = context.createGain();
    oscillator.type = 'triangle'; oscillator.frequency.setValueAtTime((base ? 280 : 720) * (.94 + random() * .12), at);
    oscillator.frequency.exponentialRampToValueAtTime(base ? 78 : critical ? 150 : 240, at + .13);
    gain.gain.setValueAtTime(.0001, at); gain.gain.linearRampToValueAtTime((critical ? .18 : .1) * volume, at + .003);
    gain.gain.exponentialRampToValueAtTime(.0001, at + (critical ? .3 : .18));
    oscillator.connect(gain); const stereo = route(gain, effects, pan);
    oscillator.start(at); oscillator.stop(at + .33); oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); stereo.disconnect(); };
  }
  function visibility() {
    if (disposed) return;
    if (document.hidden) {
      pauseMusic(); context.suspend().catch(() => {});
    } else if (enabled) {
      playMusic(); context.resume().catch(() => {});
    }
  }
  document.addEventListener('visibilitychange', visibility);
  function dispose() {
    if (disposed) return; disposed = true; enabled = false;
    document.removeEventListener('visibilitychange', visibility);
    pauseMusic(); music.removeAttribute('src'); music.load(); music.remove();
    musicSource.disconnect(); musicGain.disconnect();
    context.close().catch(() => {});
  }
  return { setEnabled, toggle: () => setEnabled(!enabled), hit, dispose, get enabled() { return enabled; } };
}
