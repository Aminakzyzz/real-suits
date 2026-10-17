from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import importlib.util
import tempfile
import unittest
from unittest.mock import patch
import wave

from touchline_vision.neural_speech import DEFAULT_MODEL_PATH, NeuralSpeechEngine
from touchline_vision.speech import SpeechError


class NeuralSpeechValidationTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.directory = Path(self.temporary.name)
        self.engine = NeuralSpeechEngine(model_path=self.directory / "missing.onnx")

    def test_uninstalled_voice_is_not_advertised_and_request_fails_clearly(self):
        self.assertNotIn("piper-en", {voice["id"] for voice in self.engine.voices()})
        with self.assertRaisesRegex(SpeechError, "Install .\\[neural\\]"):
            self.engine.synthesize("The ball is visible.", "en", "piper-en", self.directory / "speech.wav")

    def test_neural_requests_validate_before_loading(self):
        for overrides in ({"text": ""}, {"text": "a" * 1001}, {"text": "hello\0world"}, {"language": "fr"}, {"speed": True}, {"speed": 241}):
            with self.subTest(overrides=overrides), patch.object(self.engine, "_load") as load:
                request = {"text": "The ball is visible.", "language": "en", "voice": "piper-en", "output_path": self.directory / "speech.wav"}
                request.update(overrides)
                with self.assertRaises(SpeechError):
                    self.engine.synthesize(**request)
                load.assert_not_called()
        self.assertEqual(list(self.directory.iterdir()), [])

    def test_load_failure_preserves_previous_output_and_releases_lock(self):
        from touchline_vision.neural_speech import _PIPER_LOCK
        output = self.directory / "previous.wav"
        output.write_bytes(b"previous-good-audio")
        with patch.object(self.engine, "_available", return_value=True), patch.object(self.engine, "_load", side_effect=RuntimeError("model load failed")):
            with self.assertRaisesRegex(SpeechError, "model load failed"):
                self.engine.synthesize("The ball is visible.", "en", "piper-en", output)
        self.assertFalse(_PIPER_LOCK.locked())
        self.assertEqual(output.read_bytes(), b"previous-good-audio")
        self.assertEqual(list(self.directory.iterdir()), [output])


@unittest.skipUnless(importlib.util.find_spec("piper") and DEFAULT_MODEL_PATH.exists(), "Run optional neural setup first")
class NeuralSpeechIntegrationTests(unittest.TestCase):
    def test_actual_neural_synthesis_and_concurrent_output(self):
        engine = NeuralSpeechEngine()
        self.assertIn("piper-en", {voice["id"] for voice in engine.voices()})
        with tempfile.TemporaryDirectory() as directory:
            paths = [Path(directory) / "one.wav", Path(directory) / "two.wav"]
            with ThreadPoolExecutor(max_workers=2) as workers:
                results = list(workers.map(lambda path: engine.synthesize("The ball is visible on the left of the picture.", "en", "piper-en", path), paths))
            for path, result in zip(paths, results):
                self.assertEqual(result["provider"], "piper")
                self.assertEqual(result["voice"], "piper-en")
                self.assertGreater(result["durationMs"], 500)
                with wave.open(str(path), "rb") as audio:
                    self.assertEqual(audio.getframerate(), 22050)
                    self.assertEqual(audio.getnchannels(), 1)
                    self.assertEqual(audio.getsampwidth(), 2)
                    self.assertEqual(result["durationMs"], round(audio.getnframes() * 1000 / audio.getframerate()))
            self.assertEqual(set(Path(directory).iterdir()), set(paths))
