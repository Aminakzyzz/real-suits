"""Small, offline speech adapter using eSpeak NG's built-in synthetic voices.

No voice samples, network access, API keys, shell, or neural model download is
needed. Install the ``espeak-ng`` system package before starting the service.
"""

from __future__ import annotations

import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import wave


class SpeechError(ValueError):
    """Invalid speech request or an unavailable/failed speech engine."""


_VOICES = (
    {"id": "en-gb", "name": "English · British synthetic", "language": "en", "provider": "espeak-ng"},
    {"id": "es", "name": "Español · synthetic", "language": "es", "provider": "espeak-ng"},
    {"id": "fr", "name": "Français · synthetic", "language": "fr", "provider": "espeak-ng"},
)
_DEFAULTS = {voice["language"]: voice["id"] for voice in _VOICES}


class SpeechEngine:
    """Produce complete WAV files atomically, safe for concurrent requests."""

    def __init__(self, executable: str | None = None, *, timeout_seconds: float = 20.0) -> None:
        self.executable = executable or "espeak-ng"
        self.timeout_seconds = timeout_seconds

    def voices(self) -> list[dict[str, str]]:
        """Return independent metadata copies; caller mutation cannot change policy."""
        return [dict(voice) for voice in _VOICES]

    def synthesize(
        self,
        text: str,
        language: str,
        voice: str | None,
        output_path: Path,
        speed: int = 170,
    ) -> dict[str, str | int]:
        if not isinstance(text, str) or not text.strip() or len(text) > 1000:
            raise SpeechError("Speech text must contain 1–1000 characters.")
        if any(ord(character) < 32 and character not in "\n\r\t" for character in text):
            raise SpeechError("Speech text contains unsupported control characters.")
        if not isinstance(language, str) or language not in _DEFAULTS:
            raise SpeechError("Supported speech languages are en, es, and fr.")
        if isinstance(speed, bool) or not isinstance(speed, int) or not 120 <= speed <= 240:
            raise SpeechError("Speech speed must be an integer from 120 to 240 words per minute.")
        selected_voice = _DEFAULTS[language] if voice is None else voice
        if not isinstance(selected_voice, str) or not any(
            item["id"] == selected_voice and item["language"] == language for item in _VOICES
        ):
            raise SpeechError("Select an offered voice matching the requested language.")
        executable = shutil.which(self.executable)
        if executable is None:
            raise SpeechError("eSpeak NG is unavailable. Install the espeak-ng system package.")

        destination = Path(output_path)
        temporary_path: Path | None = None
        try:
            destination.parent.mkdir(parents=True, exist_ok=True)
            with tempfile.NamedTemporaryFile(
                prefix=f".{destination.name}.", suffix=".wav", dir=destination.parent, delete=False
            ) as temporary:
                temporary_path = Path(temporary.name)
            # Text is stdin, never an option or shell command. Voice and speed are
            # allowlisted; the destination is an independent argv element.
            completed = subprocess.run(
                [executable, "-v", selected_voice, "-s", str(speed), "-w", str(temporary_path), "--stdin"],
                input=text.strip(),
                text=True,
                encoding="utf-8",
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                timeout=self.timeout_seconds,
                check=False,
            )
            if completed.returncode:
                raise SpeechError(f"eSpeak NG failed with exit code {completed.returncode}.")
            with wave.open(str(temporary_path), "rb") as audio:
                frame_count = audio.getnframes()
                sample_rate = audio.getframerate()
                if frame_count <= 0 or sample_rate <= 0 or audio.getcomptype() != "NONE":
                    raise SpeechError("eSpeak NG returned an empty or unsupported WAV file.")
                duration_ms = round(frame_count * 1000 / sample_rate)
            os.replace(temporary_path, destination)
            return {
                "provider": "espeak-ng",
                "voice": selected_voice,
                "language": language,
                "durationMs": duration_ms,
                "mimeType": "audio/wav",
            }
        except subprocess.TimeoutExpired as error:
            raise SpeechError("eSpeak NG synthesis timed out.") from error
        except (OSError, EOFError, wave.Error) as error:
            raise SpeechError(f"Could not create speech audio: {error}") from error
        finally:
            if temporary_path is not None:
                temporary_path.unlink(missing_ok=True)
