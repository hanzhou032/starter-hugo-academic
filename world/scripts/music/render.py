#!/usr/bin/env python3
"""Render Islands of Discovery: an original, deterministic orchestral score.

Dependencies: numpy scipy mido imageio-ffmpeg (see README.md).
The downloaded instrument recordings are VSCO 2 CE / CC0, never game music.
"""
import argparse
import hashlib
import json
import math
import subprocess
import urllib.request
import warnings
from collections import defaultdict
from pathlib import Path

import imageio_ffmpeg
import mido
import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, resample_poly, sosfilt

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
SR = 44100
SEED = 10102026
CHORDS = {
    'Dm': (38, [57, 62, 65, 69]), 'Bb': (34, [58, 62, 65, 69]),
    'F': (41, [57, 60, 65, 67]), 'C': (36, [55, 60, 64, 67]),
    'Gm': (43, [55, 58, 62, 65]), 'A': (33, [57, 61, 64, 69]),
}
# Two distinct eight-bar themes, written for this portfolio. (MIDI note, beats.)
THEME_A = [
    [(74, 1.5), (69, .5), (77, 1), (76, 1)],
    [(74, 2), (72, 1), (69, 1)],
    [(70, 1), (74, 1), (77, 1), (81, 1)],
    [(79, 2), (77, 1), (74, 1)],
    [(69, 1), (72, .5), (74, .5), (76, 1), (77, 1)],
    [(76, 1), (72, 1), (67, 2)],
    [(67, .5), (70, .5), (74, 1), (77, 1), (76, 1)],
    [(73, 1), (76, 1), (69, 2)],
]
THEME_B = [
    [(77, 2), (81, 1), (79, .5), (77, .5)],
    [(76, 1.5), (72, .5), (79, 2)],
    [(79, 1), (77, .5), (74, .5), (70, 2)],
    [(69, 1), (74, 2), (76, 1)],
    [(77, 1.5), (74, .5), (70, 1), (74, 1)],
    [(72, 2), (69, 1), (77, 1)],
    [(79, 1), (74, 1), (70, .5), (69, .5), (67, 1)],
    [(69, 1), (73, .5), (76, .5), (81, 1.5), (76, .5)],
]
A_HARMONY = ['Dm', 'Dm', 'Bb', 'Gm', 'F', 'C', 'Gm', 'A']
B_HARMONY = ['F', 'C', 'Gm', 'Dm', 'Bb', 'F', 'Gm', 'A']
SECTIONS = [
    ('Clouds', 8, 86, .42), ('First crossing', 16, 92, .72),
    ('The quiet courtyard', 8, 86, .38), ('Open horizons', 16, 94, .75),
    ('Gathering', 8, 94, .61), ('Together', 8, 94, .94), ('Home', 8, 84, .44),
]
PAN = {'violin': -.32, 'violin_short': -.28, 'viola': -.06,
       'cello': .26, 'cello_short': .28, 'horn': -.16, 'flute': .15,
       'harp': -.42, 'timpani': .1, 'drum': 0, 'cymbal': .35, 'roll': -.2}
GAIN = {'violin': .095, 'violin_short': .066, 'viola': .07,
        'cello': .095, 'cello_short': .091, 'horn': .18, 'flute': .13,
        'harp': .09, 'timpani': .14, 'drum': .16, 'cymbal': .055, 'roll': .045}
PROGRAM = {'violin': 48, 'violin_short': 48, 'viola': 48, 'cello': 42,
           'cello_short': 42, 'horn': 60, 'flute': 73, 'harp': 46,
           'timpani': 47, 'drum': 0, 'cymbal': 0, 'roll': 0}


def score():
    rng = np.random.default_rng(SEED)
    events, bars, sections = [], [], []
    now = 0.
    for name, count, bpm, dynamic in SECTIONS:
        sections.append({'name': name, 'start': round(now, 3), 'bars': count, 'bpm': bpm})
        for j in range(count):
            # Small phrase breathing; the last four bars gently broaden.
            tempo = bpm - (1.6 if j % 8 == 7 else 0) - (max(0, j - 3) * 1.4 if name == 'Home' else 0)
            beat = 60 / tempo
            harmony = B_HARMONY if name == 'Open horizons' else A_HARMONY
            chord = harmony[j % 8]
            if name == 'Clouds': chord = ['Dm', 'Dm', 'Bb', 'Bb', 'F', 'C', 'Gm', 'A'][j]
            if name == 'Home': chord = ['Dm', 'Bb', 'F', 'C', 'Gm', 'A', 'Dm', 'Dm'][j]
            bass, notes = CHORDS[chord]
            bars.append({'start': round(now, 4), 'bpm': round(tempo, 2), 'chord': chord, 'section': name})
            swell = dynamic * (1 + .08 * math.sin((j % 8) / 7 * math.pi))

            def add(ins, note, offset=0., duration=1., level=1.):
                jitter = rng.normal(0, .008) if ins not in ('drum', 'timpani') else 0
                events.append({'instrument': ins, 'note': note,
                               'start': round(max(0, now + offset * beat + jitter), 5),
                               'duration': round(duration * beat, 5),
                               'velocity': round(swell * level * rng.uniform(.94, 1.04), 4)})

            # Divisi sustained strings with common tones and soft overlap.
            add('cello', bass + 12, duration=4.12, level=.77)
            add('viola', notes[0], duration=4.08, level=.68)
            add('viola', notes[1], duration=4.08, level=.57)
            add('violin', notes[2], duration=4.12, level=.69)
            add('violin', notes[3], duration=4.12, level=.42)
            flowing = name in ('First crossing', 'Open horizons', 'Gathering', 'Together')
            if flowing:
                # The 3+3+2 pulse gives the accompaniment momentum under 4/4.
                for k, offset in enumerate([0, .5, 1, 1.5, 2, 2.5, 3, 3.5]):
                    n = [bass + 12, bass + 19, bass + 24, bass + 19][k % 4]
                    add('cello_short', n, offset, .42, .58 if k in (0, 3, 6) else .39)
                for k, offset in enumerate([0, 1.5, 3]):
                    add('violin_short', notes[k % 4] + 12, offset, .5, .48)
                if j % 2 == 0:
                    add('drum', 60, 0, 2.2, .72)
                    add('timpani', 60, 2.5, 1.35, .44)
                if name == 'Together':
                    add('drum', 60, 2, 1.8, .57)
                    if j % 4 == 0: add('cymbal', 60, 0, 4, .68)
            # Harp notes are staggered, not a block chord.
            for k, offset in enumerate([0, .5, 1, 2, 2.5, 3]):
                add('harp', notes[[0, 1, 2, 3, 2, 1][k]] + 12, offset, 2.25, .66 if flowing else .92)
            if name in ('Clouds', 'The quiet courtyard', 'Home'):
                if name == 'Clouds' and j < 4:
                    if j % 2 == 0: add('flute', notes[2] + 12, 1, 2.6, .62)
                elif name == 'Home' and j >= 6:
                    add('horn', 62, 0, 3.8, .6 if j == 6 else .34)
                    add('flute', 74, .5, 3.2, .5 if j == 6 else .2)
                else:
                    phrase = THEME_A[j % 8]
                    offset = 0
                    for note, duration in phrase:
                        add('flute', note, offset, duration * .91, .86)
                        offset += duration
            else:
                phrase = THEME_B[j % 8] if name == 'Open horizons' else THEME_A[j % 8]
                offset = 0
                for note, duration in phrase:
                    lead = 'flute' if name == 'Gathering' else 'horn'
                    add(lead, note if lead == 'flute' else note - 12, offset, duration * .95, .95)
                    if name == 'Together' or (name == 'Open horizons' and j >= 8):
                        add('violin', note, offset + .02, duration * .96, .75)
                    offset += duration
                if j % 8 == 7: add('roll', 60, 0, 3.95, .63)
            now += 4 * beat
    # Last harmony is allowed to ring; fade into a natural quiet loop boundary.
    return {'title': 'Islands of Discovery', 'seed': SEED, 'sample_rate': SR,
            'duration': round(now + 3.5, 5), 'sections': sections, 'bars': bars, 'events': events}


def load_samples(cache):
    by_instrument = defaultdict(list)
    manifest = json.loads((HERE / 'samples.json').read_text())
    for row in manifest['samples']:
        path = cache / row['file']
        if not path.exists():
            print('Downloading', row['path'], flush=True)
            path.write_bytes(urllib.request.urlopen(row['url'], timeout=90).read())
        data = path.read_bytes()
        digest = hashlib.sha1(b'blob ' + str(len(data)).encode() + b'\0' + data).hexdigest()
        if digest != row['sha']: raise ValueError('Sample checksum failed: ' + row['path'])
        with warnings.catch_warnings():
            warnings.simplefilter('ignore')
            sr, pcm = wavfile.read(path)
        if np.issubdtype(pcm.dtype, np.integer):
            pcm = pcm.astype(np.float32) / float(2 ** (np.iinfo(pcm.dtype).bits - 1))
        else: pcm = pcm.astype(np.float32)
        if pcm.ndim == 1: pcm = np.column_stack([pcm, pcm])
        if sr != SR:
            g = math.gcd(sr, SR)
            pcm = resample_poly(pcm, SR // g, sr // g).astype(np.float32)
        # Remove recording pre-roll without cutting the bow/breath onset.
        envelope = np.max(np.abs(pcm), axis=1)
        active = np.flatnonzero(envelope > max(.0004, envelope.max() * .008))
        if len(active): pcm = pcm[max(0, active[0] - int(.008 * SR)):]
        rms = float(np.sqrt(np.mean(pcm[:min(len(pcm), SR * 3)] ** 2)))
        pcm *= min(3., .14 / max(rms, .025))
        by_instrument[row['instrument']].append((row['note'], pcm))
    return by_instrument


def render(composition, cache, output):
    samples = load_samples(cache)
    length = int((composition['duration'] + 4) * SR)
    mix = np.zeros((length, 2), dtype=np.float32)
    pitched = {}
    percussion = {'drum', 'cymbal', 'timpani', 'roll'}
    short = {'violin_short', 'cello_short', 'harp'} | percussion
    for e in composition['events']:
        ins, note = e['instrument'], e['note']
        key = (ins, note)
        if key not in pitched:
            root, raw = min(samples[ins], key=lambda s: abs(s[0] - note))
            ratio = 2 ** ((root - note) / 12)
            pitched[key] = resample_poly(raw, round(ratio * 2000), 2000).astype(np.float32)
        source = pitched[key]
        release = .75 if ins == 'harp' else .5 if ins in percussion else .20 if ins in short else .27
        duration = e['duration']
        count = min(len(source), int((duration + release) * SR))
        chunk = source[:count].copy()
        attack = .004 if ins in short else .09 if ins == 'horn' else .07
        n = min(count, int(attack * SR))
        chunk[:n] *= np.linspace(0, 1, n, dtype=np.float32)[:, None]
        end = min(count, int(release * SR))
        chunk[-end:] *= np.linspace(1, 0, end, dtype=np.float32)[:, None] ** 1.6
        if ins == 'roll':
            chunk *= np.linspace(.08, 1, count, dtype=np.float32)[:, None]
        # Preserve a little recorded stereo width with an equal-power seat.
        mono = chunk.mean(axis=1)
        width = (chunk[:, 0] - chunk[:, 1]) * .16
        pan = PAN[ins]
        chunk[:, 0] = mono * math.sqrt((1 - pan) / 2) + width
        chunk[:, 1] = mono * math.sqrt((1 + pan) / 2) - width
        chunk *= GAIN[ins] * e['velocity']
        start = int(e['start'] * SR)
        mix[start:start + count] += chunk[:len(mix) - start]
    # Diffuse stereo hall: decorrelated, damped reflections with 1.7s decay.
    dry = mix.copy()
    for channel in [0, 1]:
        rng = np.random.default_rng(SEED + channel)
        wet = np.zeros(length, dtype=np.float32)
        filtered = sosfilt(butter(1, 3700, fs=SR, output='sos'), dry[:, channel] * .7 + dry[:, 1 - channel] * .3).astype(np.float32)
        for delay in np.linspace(.032, 2.6, 103):
            delay += rng.uniform(-.01, .01)
            shift = int(delay * SR)
            wet[shift:] += filtered[:-shift] * math.exp(-delay * 3.7) * rng.choice([-1, 1]) * .071
        mix[:, channel] += wet
    # Remove subsonic rumble, retaining the low drum body.
    mix = sosfilt(butter(2, 35, 'highpass', fs=SR, output='sos'), mix, axis=0).astype(np.float32)
    count = int(composition['duration'] * SR)
    mix = mix[:count]
    mix[:SR * 2] *= np.linspace(0, 1, SR * 2, dtype=np.float32)[:, None]
    mix[-SR * 5:] *= np.linspace(1, 0, SR * 5, dtype=np.float32)[:, None] ** 1.5
    # Leave headroom for music + live battle sounds; no clipping or hard limiter.
    mix *= .86 / np.max(np.abs(mix))
    output.mkdir(parents=True, exist_ok=True)
    wav = cache.parent / 'islands-of-discovery-master.wav'
    wavfile.write(wav, SR, (mix * 32767).astype(np.int16))
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    subprocess.run([ffmpeg, '-y', '-hide_banner', '-loglevel', 'warning', '-i', str(wav),
                    '-af', 'loudnorm=I=-19:TP=-2:LRA=12', '-c:a', 'libmp3lame', '-b:a', '192k',
                    '-metadata', 'title=Islands of Discovery', '-metadata', 'artist=Han Zhou Portfolio',
                    str(output / 'islands-of-discovery.mp3')], check=True)
    print(json.dumps({'duration': composition['duration'], 'note_events': len(composition['events']),
                      'master_peak_dbfs': float(20 * np.log10(np.max(np.abs(mix)))),
                      'master_rms_dbfs': float(20 * np.log10(np.sqrt(np.mean(mix ** 2)))),
                      'audio': str(output / 'islands-of-discovery.mp3')}, indent=2), flush=True)


def write_midi(composition):
    # A seconds-based 120-BPM reference MIDI retains all rendered event timing.
    midi = mido.MidiFile(ticks_per_beat=960)
    for channel, ins in enumerate(PAN):
        percussion_note = {'drum': 36, 'cymbal': 49, 'roll': 49}.get(ins)
        if percussion_note is not None: channel = 9
        track = mido.MidiTrack(); midi.tracks.append(track)
        track.append(mido.MetaMessage('track_name', name=ins))
        track.append(mido.Message('program_change', program=PROGRAM[ins], channel=channel))
        messages = []
        for e in composition['events']:
            if e['instrument'] != ins: continue
            start = round(e['start'] * 1920); end = round((e['start'] + e['duration']) * 1920)
            midi_note = percussion_note if percussion_note is not None else e['note']
            messages += [(start, mido.Message('note_on', note=midi_note, velocity=min(127, max(1, round(e['velocity'] * 100))), channel=channel)),
                         (end, mido.Message('note_off', note=midi_note, channel=channel))]
        previous = 0
        for tick, message in sorted(messages, key=lambda pair: pair[0]):
            message.time = tick - previous; track.append(message); previous = tick
    midi.save(HERE / 'islands-of-discovery.mid')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--cache', type=Path, default=Path('/tmp/han-world-music/samples'))
    parser.add_argument('--output', type=Path, default=ROOT / 'assets/music')
    args = parser.parse_args()
    args.cache.mkdir(parents=True, exist_ok=True)
    composition = score()
    (HERE / 'score.json').write_text(json.dumps(composition, indent=2) + '\n')
    write_midi(composition)
    render(composition, args.cache, args.output)
