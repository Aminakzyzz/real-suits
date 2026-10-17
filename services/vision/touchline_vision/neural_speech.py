"""Optional local Piper voice, with pinned, verified LJ Speech model setup.

The model publisher identifies LJ Speech as public-domain training data. This is
not the similarly named Lessac voice (whose dataset has research-only terms).
"""

from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import shutil
import tempfile
import threading
import wave

from .speech import SpeechEngine, SpeechError


MODEL_REPO = "rhasspy/piper-voices"
MODEL_REVISION = "c10ece1aade47bb51c153c893d14e5bf8e5b7117"
MODEL_DIRECTORY = "en/en_US/ljspeech/medium"
MODEL_NAME = "en_US-ljspeech-medium.onnx"
MODEL_SHA256 = "6f52a751e2349abe7a76735eb09dc1875298c77ea2342ffd2fef79ff81b87f22"
CONFIG_SHA256 = "141d612cc0a95ed7efc1ca936b845c2364967f2e9217c5dbfcf69fc4d6c65860"
DEFAULT_MODEL_PATH = Path(__file__).resolve().parents[1] / ".runtime" / "voices" / MODEL_NAME
_PIPER_LOCK = threading.Lock()


class NeuralSpeechEngine(SpeechEngine):
    """Expose one optional neural English voice alongside built-in eSpeak voices."""

    def __init__(self, model_path: Path | None = None, **kwargs) -> None:
        super().__init__(**kwargs)
        self.model_path = Path(model_path) if model_path is not None else DEFAULT_MODEL_PATH
        self._voice = None

    def _available(self) -> bool:
        return (
            importlib.util.find_spec("piper") is not None
            and self.model_path.is_file()
            and Path(f"{self.model_path}.json").is_file()
        )

    def voices(self) -> list[dict[str, str]]:
        result = super().voices()
        if self._available():
            result.append({"id": "piper-en", "name": "English · LJ Speech neural", "language": "en", "provider": "piper"})
        return result

    def _load(self):
        # Public Piper dataclass construction permits bounded ORT thread counts.
        # The convenience .load() uses machine-wide default CPU thread counts.
        import onnxruntime as ort
        from piper import PiperVoice
        from piper.config import PiperConfig

        config = json.loads(Path(f"{self.model_path}.json").read_text(encoding="utf-8"))
        if config.get("audio", {}).get("sample_rate") != 22050:
            raise SpeechError("The configured neural voice must use 22,050 Hz audio.")
        options = ort.SessionOptions()
        options.intra_op_num_threads = 2
        options.inter_op_num_threads = 1
        return PiperVoice(
            session=ort.InferenceSession(str(self.model_path), sess_options=options, providers=["CPUExecutionProvider"]),
            config=PiperConfig.from_dict(config),
        )

    def synthesize(self, text: str, language: str, voice: str | None, output_path: Path, speed: int = 170) -> dict[str, str | int]:
        if voice != "piper-en":
            return super().synthesize(text, language, voice, output_path, speed)
        if not isinstance(text, str) or not text.strip() or len(text) > 1000:
            raise SpeechError("Speech text must contain 1–1000 characters.")
        if any(ord(character) < 32 and character not in "\n\r\t" for character in text):
            raise SpeechError("Speech text contains unsupported control characters.")
        if language != "en":
            raise SpeechError("The LJ Speech neural voice supports English only.")
        if isinstance(speed, bool) or not isinstance(speed, int) or not 120 <= speed <= 240:
            raise SpeechError("Speech speed must be an integer from 120 to 240 words per minute.")
        if not self._available():
            raise SpeechError("Optional neural speech is unavailable. Install .[neural] and run python -m touchline_vision.neural_speech setup.")
        if not _PIPER_LOCK.acquire(timeout=self.timeout_seconds):
            raise SpeechError("The neural speech engine is busy. Retry shortly.")
        temporary_path: Path | None = None
        try:
            if self._voice is None:
                self._voice = self._load()
            from piper import SynthesisConfig
            destination = Path(output_path)
            destination.parent.mkdir(parents=True, exist_ok=True)
            with tempfile.NamedTemporaryFile(prefix=f".{destination.name}.", suffix=".wav", dir=destination.parent, delete=False) as temporary:
                temporary_path = Path(temporary.name)
            with wave.open(str(temporary_path), "wb") as output:
                self._voice.synthesize_wav(text.strip(), output, syn_config=SynthesisConfig(length_scale=170 / speed))
            with wave.open(str(temporary_path), "rb") as output:
                if output.getframerate() != 22050 or output.getnframes() <= 0 or output.getcomptype() != "NONE":
                    raise SpeechError("The neural engine returned invalid audio.")
                duration_ms = round(output.getnframes() * 1000 / output.getframerate())
            os.replace(temporary_path, destination)
            return {"provider": "piper", "voice": "piper-en", "language": "en", "durationMs": duration_ms, "mimeType": "audio/wav"}
        except SpeechError:
            raise
        except Exception as error:
            raise SpeechError(f"Neural speech could not be generated: {error}") from error
        finally:
            if temporary_path is not None:
                temporary_path.unlink(missing_ok=True)
            _PIPER_LOCK.release()


def setup(model_path: Path = DEFAULT_MODEL_PATH) -> Path:
    """Explicitly download and verify one 63.5 MB model; never on a web request."""
    from huggingface_hub import hf_hub_download

    model_path = Path(model_path)
    model_path.parent.mkdir(parents=True, exist_ok=True)
    for filename, expected_hash in ((MODEL_NAME, MODEL_SHA256), (f"{MODEL_NAME}.json", CONFIG_SHA256), ("MODEL_CARD", None)):
        source = Path(hf_hub_download(MODEL_REPO, f"{MODEL_DIRECTORY}/{filename}", revision=MODEL_REVISION))
        digest = hashlib.sha256(source.read_bytes()).hexdigest()
        if expected_hash is not None and digest != expected_hash:
            raise SpeechError(f"Downloaded {filename} failed SHA-256 verification.")
        target = model_path if filename == MODEL_NAME else Path(f"{model_path}.json") if filename.endswith(".json") else model_path.parent / "LJSPEECH_MODEL_CARD"
        temporary_path = None
        try:
            with tempfile.NamedTemporaryFile(dir=target.parent, prefix=".piper-setup-", delete=False) as temporary:
                temporary_path = Path(temporary.name)
                with source.open("rb") as input_file:
                    shutil.copyfileobj(input_file, temporary)
            os.replace(temporary_path, target)
        finally:
            if temporary_path is not None:
                temporary_path.unlink(missing_ok=True)
    (model_path.parent / "LJSPEECH_PROVENANCE.json").write_text(json.dumps({
        "modelRepo": MODEL_REPO, "revision": MODEL_REVISION,
        "modelSha256": MODEL_SHA256, "configSha256": CONFIG_SHA256,
        "modelLicense": "MIT (publisher repository metadata)",
        "trainingDataLicense": "Public domain (LJ Speech publisher and individual voice model card)",
        "runtimeLicense": "GPL-3.0-or-later (piper-tts 1.8.0)",
        "modelCard": f"https://huggingface.co/{MODEL_REPO}/blob/{MODEL_REVISION}/{MODEL_DIRECTORY}/MODEL_CARD",
        "dataset": "https://keithito.com/LJ-Speech-Dataset/",
    }, indent=2) + "\n", encoding="utf-8")
    return model_path


def main() -> None:
    parser = argparse.ArgumentParser(description="Prepare the optional free LJ Speech neural voice")
    parser.add_argument("command", choices=["setup"])
    parser.add_argument("--model", type=Path, default=DEFAULT_MODEL_PATH)
    args = parser.parse_args()
    print(f"Neural voice installed: {setup(args.model)}")


if __name__ == "__main__":
    main()
