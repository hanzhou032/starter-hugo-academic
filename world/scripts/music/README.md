# Islands of Discovery

An original 3:15 orchestral composition for Han Zhou's sky-island portfolio.
The user requested the sweeping fantasy atmosphere of TI8 and TI10, followed by
an explicit request for new music without the source recordings. This piece
uses newly written themes, harmony and orchestration. No Dota melody was
transcribed; no TI8/TI10 recording, excerpt, stream, or player API is used.

The two themes move between a restrained D-minor horn melody and a brighter
F-major passage. Divisi strings, a 3+3+2 cello pulse, harp arpeggios, flute
responses, timpani and soft cymbal swells connect seven sections. The final
D-minor cadence broadens and fades for a quiet return to the opening.

`score.json` is the complete note-event score with section/bar timing;
`islands-of-discovery.mid` is a timing-preserving reference MIDI. The MIDI uses
approximate General MIDI programs; the shipped performance is rendered from
the specific samples in `samples.json`. Instrument audio comes from VSCO 2
Community Edition (Versilian Studios / Sam Gossner and contributors including
Ivy Audio), released under **CC0-1.0**. The manifest pins every URL to a source
commit and includes its Git blob checksum. Raw samples are cached outside the
repository. See `assets/music/VSCO-CC0-LICENSE.txt`.

The renderer resamples nearby recorded notes, preserves their attack, applies
musical release envelopes, varies timing and dynamics with a repeatable seed,
seats the instruments in stereo, and adds damped hall reflections. FFmpeg
masters the MP3 to a target of -19 LUFS with -2 dBTP headroom. This is a sampled
performance, not a recording of a live orchestra.

To reproduce from `world/` with Python 3:

```sh
python3 -m venv /tmp/han-world-music
/tmp/han-world-music/bin/pip install -r scripts/music/requirements.txt
/tmp/han-world-music/bin/python scripts/music/render.py
```

On macOS, if Python lacks the system certificate path, set
`SSL_CERT_FILE=/etc/ssl/cert.pem` for that command. Downloads verify their pinned
Git blob checksums. Use `--cache PATH` for another external sample cache.

The browser only creates the local audio element after the visitor presses the
speaker control or M. It loops the rendered MP3, routes it with synthesized
battle effects through Web Audio, and pauses when the page is hidden. Nothing
is downloaded from music/video platforms.
