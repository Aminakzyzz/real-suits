"""Exercise actual offline synthesis plus validation and failed-write isolation."""

from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest
from unittest.mock import patch
import wave

from touchline_vision.speech import SpeechEngine, SpeechError


class SpeechValidationTests(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = SpeechEngine()
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.destination = Path(self.temporary.name) / "speech.wav"

    def test_invalid_requests_fail_before_any_process_or_file(self) -> None:
        cases = [
            {"text": ""}, {"text": "   "}, {"text": "a" * 1001}, {"text": "hi\0there"},
            {"text": None}, {"language": "de"}, {"language": None},
            {"voice": "../../arbitrary"}, {"voice": "fr"}, {"voice": "en-gb; touch /tmp/x"},
            {"speed": 119}, {"speed": 241}, {"speed": True}, {"speed": 170.0},
        ]
        with patch("touchline_vision.speech.subprocess.run") as run:
            for overrides in cases:
                with self.subTest(overrides=overrides):
                    request = {"text": "A fine pass.", "language": "en", "voice": None, "output_path": self.destination}
                    request.update(overrides)
                    with self.assertRaises(SpeechError):
                        self.engine.synthesize(**request)
            run.assert_not_called()
        self.assertFalse(self.destination.exists())

    def test_voice_metadata_is_not_mutable_policy(self) -> None:
        voices = self.engine.voices()
        self.assertEqual({item["language"] for item in voices}, {"en", "es", "fr"})
        voices[0]["id"] = "hijacked"
        self.assertEqual(self.engine.voices()[0]["id"], "en-gb")

    def test_missing_executable_has_actionable_error(self) -> None:
        engine = SpeechEngine(executable="touchline-certainly-missing-espeak")
        with self.assertRaisesRegex(SpeechError, "Install the espeak-ng"):
            engine.synthesize("A fine pass.", "en", None, self.destination)

    def test_failed_synthesis_preserves_existing_audio_and_cleans_temporary_file(self) -> None:
        self.destination.write_bytes(b"previous-good-audio")
        with patch("touchline_vision.speech.shutil.which", return_value="/usr/bin/espeak-ng"), patch(
            "touchline_vision.speech.subprocess.run", return_value=subprocess.CompletedProcess([], 1)
        ):
            with self.assertRaisesRegex(SpeechError, "exit code 1"):
                self.engine.synthesize("A fine pass.", "en", None, self.destination)
        self.assertEqual(self.destination.read_bytes(), b"previous-good-audio")
        self.assertEqual(list(self.destination.parent.iterdir()), [self.destination])

    def test_timeout_cleans_up_and_does_not_publish_file(self) -> None:
        with patch("touchline_vision.speech.shutil.which", return_value="/usr/bin/espeak-ng"), patch(
            "touchline_vision.speech.subprocess.run", side_effect=subprocess.TimeoutExpired("espeak-ng", 20)
        ):
            with self.assertRaisesRegex(SpeechError, "timed out"):
                self.engine.synthesize("A fine pass.", "en", None, self.destination)
        self.assertEqual(list(self.destination.parent.iterdir()), [])


@unittest.skipUnless(shutil.which("espeak-ng"), "Install espeak-ng for actual synthesis tests")
class SpeechIntegrationTests(unittest.TestCase):
    def test_real_multilingual_wav_and_measured_duration(self) -> None:
        engine = SpeechEngine()
        with tempfile.TemporaryDirectory() as directory:
            for language, text in [("en", "A beautiful pass into the box."), ("es", "Un gran pase al área."), ("fr", "Une belle passe dans la surface.")]:
                with self.subTest(language=language):
                    output = Path(directory) / language / "commentary.wav"
                    result = engine.synthesize(text, language, None, output)
                    self.assertEqual(result["provider"], "espeak-ng")
                    self.assertEqual(result["mimeType"], "audio/wav")
                    self.assertGreater(result["durationMs"], 100)
                    with wave.open(str(output), "rb") as audio:
                        self.assertEqual(result["durationMs"], round(1000 * audio.getnframes() / audio.getframerate()))
                        self.assertGreater(len(audio.readframes(audio.getnframes())), 0)

    def test_shell_looking_text_is_only_spoken_and_concurrent_writes_are_valid(self) -> None:
        engine = SpeechEngine()
        with tempfile.TemporaryDirectory() as directory:
            marker = Path(directory) / "must-not-exist"
            text = f"--help; $(touch {marker}) `touch {marker}`"
            paths = [Path(directory) / f"clip-{index}.wav" for index in range(3)]
            with ThreadPoolExecutor(max_workers=3) as workers:
                results = list(workers.map(lambda output: engine.synthesize(text, "en", None, output), paths))
            self.assertFalse(marker.exists())
            self.assertTrue(all(result["durationMs"] > 0 for result in results))
            self.assertEqual(set(Path(directory).iterdir()), set(paths))


if __name__ == "__main__":
    unittest.main()
