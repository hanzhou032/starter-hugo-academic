// An original, looping fantasy score: D-minor strings, a horn-like melody,
// bells and low drums. No recordings or melodies from Dota are used.
export function createWorldAudio() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) throw new Error('Web Audio unavailable');
  const context = new AudioContext(), master = context.createGain(), music = context.createGain(), effects = context.createGain();
  const limiter = context.createDynamicsCompressor();
  limiter.threshold.value = -16; limiter.knee.value = 16; limiter.ratio.value = 5; limiter.attack.value = .006; limiter.release.value = .2;
  music.gain.value = .56; effects.gain.value = .65; master.gain.value = 0;
  music.connect(master); effects.connect(master); master.connect(limiter); limiter.connect(context.destination);
  const reverb = context.createConvolver(), wet = context.createGain(); wet.gain.value = .22;
  const impulse = context.createBuffer(2, Math.floor(context.sampleRate * 2.7), context.sampleRate);
  let noiseSeed = 47329;
  const random = () => { noiseSeed = (1664525 * noiseSeed + 1013904223) >>> 0; return noiseSeed / 4294967296; };
  for (let ch = 0; ch < 2; ch++) {
    const data = impulse.getChannelData(ch); let smooth = 0;
    for (let i = 0; i < data.length; i++) { smooth = smooth * .55 + (random() * 2 - 1) * .45; data[i] = smooth * (1 - i / data.length) ** 2.8; }
  }
  reverb.buffer = impulse; reverb.connect(wet); wet.connect(master);
  const noise = context.createBuffer(1, context.sampleRate, context.sampleRate);
  const noiseData = noise.getChannelData(0);
  for (let i = 0; i < noiseData.length; i++) noiseData[i] = random() * 2 - 1;
  const frequency = midi => 440 * 2 ** ((midi - 69) / 12);
  const harmonics = new Float32Array(20);
  for (let i = 1; i < harmonics.length; i++) harmonics[i] = Math.exp(-i * .17) / i;
  const stringWave = context.createPeriodicWave(new Float32Array(20), harmonics);
  const beat = 60 / 96, eighth = beat / 2;
  const chords = [[50,57,62,65],[46,53,58,62],[41,53,57,60],[48,55,60,64],[43,55,58,62],[46,53,58,65],[45,57,61,64],[50,57,62,65]];
  const melody = [[74,77,76,69],[70,74,77,74],[72,76,77,81],[79,76,72,67],[74,77,79,82],[81,77,74,70],[73,76,81,79],[77,76,74,69]];
  let enabled = false, disposed = false, timer = null, nextNote = 0, step = 0, lastImpact = -10, simultaneousHits = 0;

  function route(gain, bus, pan = 0, reverberant = true) {
    const stereo = context.createStereoPanner(); stereo.pan.value = pan;
    gain.connect(stereo); stereo.connect(bus); if (reverberant) stereo.connect(reverb);
    return stereo;
  }
  function voice(midi, at, duration, volume, kind = 'strings', pan = 0) {
    const gain = context.createGain(), filter = context.createBiquadFilter(); filter.type = 'lowpass';
    const brass = kind === 'horn', bell = kind === 'bell', bass = kind === 'bass';
    const attack = bell ? .006 : brass ? .09 : bass ? .035 : Math.min(.3, duration * .4);
    const release = bell ? .7 : brass ? .3 : .45;
    const end = at + duration + release;
    filter.frequency.setValueAtTime(bell ? 4500 : brass ? 500 : bass ? 260 : 1300, at);
    if (brass) { filter.frequency.linearRampToValueAtTime(1900, at + .14); filter.frequency.exponentialRampToValueAtTime(700, end); }
    filter.Q.value = brass ? .7 : .25; filter.connect(gain);
    gain.gain.setValueAtTime(.0001, at); gain.gain.exponentialRampToValueAtTime(volume, at + attack);
    gain.gain.exponentialRampToValueAtTime(volume * (bell ? .22 : .74), at + Math.max(attack + .01, duration));
    gain.gain.exponentialRampToValueAtTime(.0001, end);
    const stereo = route(gain, music, pan), oscillators = [];
    for (let i = 0; i < (bass ? 1 : 2); i++) {
      const oscillator = context.createOscillator(); oscillator.type = bell || bass ? 'sine' : brass ? 'sawtooth' : 'triangle';
      if (kind === 'strings') oscillator.setPeriodicWave(stringWave);
      oscillator.frequency.value = frequency(midi) * (bell && i ? 2.003 : 1); oscillator.detune.value = bell ? 0 : i ? 5 : -5;
      oscillator.connect(filter); oscillator.start(at); oscillator.stop(end + .02); oscillators.push(oscillator);
    }
    oscillators.at(-1).onended = () => { oscillators.forEach(o => o.disconnect()); filter.disconnect(); gain.disconnect(); stereo.disconnect(); };
  }
  function noiseBurst(at, duration, volume, cutoff, bus, pan = 0, metallic = false) {
    const source = context.createBufferSource(), filter = context.createBiquadFilter(), gain = context.createGain();
    source.buffer = noise; source.playbackRate.value = .85 + random() * .3;
    filter.type = metallic ? 'highpass' : 'lowpass'; filter.frequency.value = cutoff;
    gain.gain.setValueAtTime(.0001, at); gain.gain.linearRampToValueAtTime(volume, at + .004); gain.gain.exponentialRampToValueAtTime(.0001, at + duration);
    source.connect(filter); filter.connect(gain); const stereo = route(gain, bus, pan, bus === music);
    source.start(at, random() * .3); source.stop(at + duration + .02);
    source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); stereo.disconnect(); };
  }
  function drum(at, strong = false) {
    const oscillator = context.createOscillator(), gain = context.createGain(), length = strong ? .58 : .32;
    oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(strong ? 125 : 170, at); oscillator.frequency.exponentialRampToValueAtTime(strong ? 43 : 65, at + .18);
    gain.gain.setValueAtTime(.0001, at); gain.gain.exponentialRampToValueAtTime(strong ? .28 : .12, at + .005); gain.gain.exponentialRampToValueAtTime(.0001, at + length);
    oscillator.connect(gain); const stereo = route(gain, music, strong ? -.08 : .1);
    oscillator.start(at); oscillator.stop(at + length + .01); oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); stereo.disconnect(); };
    noiseBurst(at, .13, strong ? .07 : .035, 900, music);
  }
  function schedule() {
    if (disposed || !enabled || context.state !== 'running') return;
    // Resume after throttling without scheduling a burst of overdue notes.
    if (nextNote < context.currentTime) nextNote = context.currentTime + .04;
    while (nextNote < context.currentTime + .18) {
      const bar = Math.floor(step / 8) % 32, pulse = step % 8, chord = chords[bar % 8], full = bar >= 8 && bar < 28;
      if (pulse === 0) {
        chord.forEach((note, i) => voice(note, nextNote, beat * 4, full ? .024 : .019, 'strings', (i - 1.5) * .25));
        voice(chord[0] - 12, nextNote, beat * 2, .09, 'bass');
        if (bar % 4 === 0) voice(chord[2] + 12, nextNote, 1.1, .022, 'bell', .35);
      }
      if (pulse === 4) voice(chord[0] - 12, nextNote, beat * 1.8, .065, 'bass');
      if (bar >= 4 && bar < 28) {
        const note = chord[[0,2,1,2,0,3,1,2][pulse]] + 12;
        voice(note, nextNote, eighth * .68, full ? .027 : .018, 'strings', pulse % 2 ? .35 : -.35);
      }
      if (pulse % 2 === 0 && bar >= 8 && bar < 24) voice(melody[bar % 8][pulse / 2], nextNote, beat * .85, .032, 'horn', -.12);
      if (pulse === 0 || (full && pulse === 4)) drum(nextNote, pulse === 0);
      if (full && [3,6,7].includes(pulse)) drum(nextNote, false);
      nextNote += eighth; step++;
    }
  }
  async function setEnabled(value) {
    if (disposed) return false;
    enabled = value;
    if (enabled) {
      await context.resume();
      if (disposed) return false;
      if (!timer) { nextNote = context.currentTime + .05; timer = setInterval(schedule, 80); }
      schedule();
    }
    master.gain.cancelScheduledValues(context.currentTime);
    master.gain.setTargetAtTime(enabled ? .68 : 0, context.currentTime, enabled ? .35 : .045);
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
    oscillator.connect(gain); const stereo = route(gain, effects, pan, false);
    oscillator.start(at); oscillator.stop(at + .33); oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); stereo.disconnect(); };
  }
  function visibility() {
    if (disposed) return;
    if (document.hidden) context.suspend().catch(() => {});
    else if (enabled) context.resume().then(schedule).catch(() => {});
  }
  document.addEventListener('visibilitychange', visibility);
  function dispose() {
    if (disposed) return; disposed = true; enabled = false; clearInterval(timer);
    document.removeEventListener('visibilitychange', visibility); context.close().catch(() => {});
  }
  return { setEnabled, toggle: () => setEnabled(!enabled), hit, dispose, get enabled() { return enabled; } };
}
