# Free speech engine for the first autonomous demo

The vision service uses **eSpeak NG**, running locally to generate WAV audio in
English, Spanish, and French. These are built-in synthetic voices. They do not
imitate or clone a named commentator, and no recordings, paid API, credentials,
or model download are needed.

This is a functioning speech backend for validating event timing, audio delivery,
and synchronized playback. Its voice is recognizably synthetic. It should not be
presented as broadcast-quality neural commentary.

## Running and integrating

Install the `espeak-ng` system package. The service's `SpeechEngine` in
`services/vision/touchline_vision/speech.py` provides:

```python
from pathlib import Path
from touchline_vision.speech import SpeechEngine

speech = SpeechEngine()
print(speech.voices())
metadata = speech.synthesize(
    "A beautiful pass into the box.", "en", None,
    Path("/tmp/commentary.wav"), speed=170,
)
```

The returned metadata includes the provider, selected voice, language, MIME type,
and measured WAV duration in milliseconds. English defaults to `en-gb`, Spanish
to `es`, and French to `fr`. Only a voice matching the selected language is
accepted. Speed is 120–240 words per minute. Text must contain 1–1000 characters.

Text travels over standard input to a subprocess without a shell. The engine
writes to a unique temporary file, validates the WAV, and atomically replaces the
destination. A failed or timed-out synthesis leaves any previous destination
untouched. Parallel requests use independent temporary files. The service must
choose its own output paths and apply request authentication/rate limits at its
API boundary.

## Authorization and redistribution

[The upstream project](https://github.com/espeak-ng/espeak-ng) publishes eSpeak
NG under GPL-3.0-or-later. It is free software, including for commercial use under
its license conditions; “free” is not a claim of public-domain code. Preserve the
license and meet applicable source-distribution obligations when redistributing
the executable or a container containing it. This adapter calls the installed
executable; it does not bundle an engine binary or download external voices.

## Optional neural English voice

`NeuralSpeechEngine` in `services/vision/touchline_vision/neural_speech.py` adds
the `piper-en` voice when Piper and the model are installed. The API remains the
same as eSpeak; select `voice="piper-en"` and `language="en"`. Other voices and
requests with `voice=None` continue to use eSpeak. This local CPU neural voice
uses 22,050 Hz, mono, 16-bit WAV audio. It supports English only; Spanish and
French retain the synthetic baseline. Playback speed adjusts the model's length
scale relative to its default; the words-per-minute parameter is approximate.

From `services/vision`, install and prepare it once:

```sh
uv pip install --python .venv/bin/python -e '.[neural]'
.venv/bin/python -m touchline_vision.neural_speech setup
```

Setup explicitly downloads the approximately 63.5 MB **en_US-ljspeech-medium**
model and configuration from a pinned revision, verifies their SHA-256 hashes,
and writes the model card and provenance beside the ignored `.runtime/voices`
files. It never downloads a model in response to a synthesis request. The model
loads once per engine and synthesis is serialized to protect shared phonemizer
state. CPU inference uses two threads. Waiting for the synthesis lock is bounded;
in-process neural inference itself is synchronous and has no hard interrupt.

The [individual LJ Speech model card](https://huggingface.co/rhasspy/piper-voices/blob/c10ece1aade47bb51c153c893d14e5bf8e5b7117/en/en_US/ljspeech/medium/MODEL_CARD)
identifies public-domain LJ Speech training data. The
[dataset publisher](https://keithito.com/LJ-Speech-Dataset/) states its text,
audio, and annotations are public domain in the US. The model repository has MIT
license metadata; the [Piper runtime](https://github.com/OHF-Voice/piper1-gpl)
is GPL-3.0-or-later. Preserve notices and applicable source-distribution
obligations when distributing the runtime. No trained weights enter Git.

**The Lessac voice is intentionally excluded.** Its
[individual model card](https://huggingface.co/rhasspy/piper-voices/blob/main/en/en_US/lessac/medium/MODEL_CARD)
links to a [Blizzard 2013 research license](https://www.cstr.ed.ac.uk/projects/blizzard/2013/lessac_blizzard2013/license.html)
whose research definition excludes commercial speech-product development.
Repository-wide MIT metadata does not settle that separate dataset restriction.
The [official Piper voice guide](https://github.com/OHF-Voice/piper1-gpl/blob/main/docs/VOICES.md)
directs users to each voice's own model card; evaluate additional models
individually before adding them.

Voice cloning is a separate future feature requiring the voice owner's
authorization. It is unnecessary for the current demo or any of the built-in
voices above. Checked against primary upstream sources on 2026-10-17.
