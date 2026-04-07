from __future__ import annotations

import argparse
import io
import os
import re
import wave
from functools import lru_cache
from pathlib import Path
from typing import Iterable
import logging

from piper import PiperVoice
from utils.logging_utils import build_log_message


LOGGER = logging.getLogger("vta.api.tts_model")

try:
    from piper import SynthesisConfig
except ImportError:  # Backward compatibility for older piper package layouts.
    try:
        from piper.voice import SynthesisConfig  # type: ignore
    except ImportError:
        SynthesisConfig = None  # type: ignore


REPO_ROOT = Path(__file__).resolve().parents[3]
MODEL_PATH_ENV = "PIPER_TTS_MODEL_PATH"
CONFIG_PATH_ENV = "PIPER_TTS_CONFIG_PATH"

DEFAULT_MODEL_CANDIDATES = (
    REPO_ROOT / "src" / "model" / "tts" / "viettts.onnx",
    REPO_ROOT / "src" / "model" / "tts" / "en_US-lessac-medium.onnx",
)


def _env_float(name: str, default: float) -> float:
    raw_value = os.getenv(name)
    if raw_value is None:
        return default
    try:
        return float(raw_value)
    except ValueError:
        return default


NONLINEAR_SPEED_EXPONENT = max(_env_float("PIPER_TTS_SPEED_EXPONENT", 1.2), 1.01)
MIN_LENGTH_SCALE = 0.1
PARAGRAPH_BREAK_MARKER = "__TTS_PARAGRAPH_BREAK__"
PARAGRAPH_BREAK_MS = max(_env_float("PIPER_TTS_PARAGRAPH_BREAK_MS", 280.0), 0.0)


def _resolve_model_paths() -> tuple[Path, Path]:
    env_model_path = os.getenv(MODEL_PATH_ENV)
    env_config_path = os.getenv(CONFIG_PATH_ENV)

    candidate_models: list[Path] = []
    if env_model_path:
        candidate_models.append(Path(env_model_path).expanduser())
    candidate_models.extend(DEFAULT_MODEL_CANDIDATES)

    model_path = next((path for path in candidate_models if path.exists()), None)
    if model_path is None:
        searched = "\n".join(str(path) for path in candidate_models)
        raise FileNotFoundError(
            "Piper ONNX model not found. Set PIPER_TTS_MODEL_PATH or place a model in one of:\n"
            f"{searched}"
        )

    if env_config_path:
        config_path = Path(env_config_path).expanduser()
    else:
        config_path = model_path.with_name("config.json")

    if not config_path.exists():
        raise FileNotFoundError(
            f"Piper config.json not found at: {config_path}. "
            f"Set {CONFIG_PATH_ENV} to the correct path."
        )

    return model_path, config_path


@lru_cache(maxsize=4)
def _load_voice(model_path: str, config_path: str, use_cuda: bool = False) -> PiperVoice:
    return PiperVoice.load(model_path, config_path=config_path, use_cuda=use_cuda)


def _split_text_chunks(text_or_chunks: str | list[str] | tuple[str, ...]) -> list[str]:
    if isinstance(text_or_chunks, (list, tuple)):
        return [str(chunk).strip() for chunk in text_or_chunks if str(chunk).strip()]

    text = str(text_or_chunks or "").strip()
    if not text:
        return []

    chunks = [chunk.strip() for chunk in re.split(r"(?<=[.!?])\s+|\n+", text) if chunk.strip()]
    return chunks or [text]


def _build_syn_config(
    *,
    slow: bool = False,
    length_scale: float | None = None,
    speed: float | None = None,
    noise_scale: float | None = None,
    noise_w_scale: float | None = None,
    volume: float | None = None,
    normalize_audio: bool | None = None,
):
    if SynthesisConfig is None:
        return None

    resolved_length_scale = length_scale
    if resolved_length_scale is None and speed is not None and speed > 0:
        resolved_length_scale = max(1.0 / (speed ** NONLINEAR_SPEED_EXPONENT), MIN_LENGTH_SCALE)
    if resolved_length_scale is None and slow:
        resolved_length_scale = 1.25

    kwargs = {}
    if volume is not None:
        kwargs["volume"] = float(volume)
    if resolved_length_scale is not None:
        kwargs["length_scale"] = float(resolved_length_scale)
    if noise_scale is not None:
        kwargs["noise_scale"] = float(noise_scale)
    if noise_w_scale is not None:
        kwargs["noise_w_scale"] = float(noise_w_scale)
    if normalize_audio is not None:
        kwargs["normalize_audio"] = bool(normalize_audio)

    return SynthesisConfig(**kwargs) if kwargs else SynthesisConfig()


class PiperTTS:
    def __init__(self, voiceConfig=None, session=None, use_cuda: bool = False):
        self.voiceConfig = voiceConfig
        self.session = session
        self.use_cuda = use_cuda
        self._voice: PiperVoice | None = None

    def _ensure_voice(self) -> PiperVoice:
        if self._voice is None:
            model_path, config_path = _resolve_model_paths()
            self._voice = _load_voice(str(model_path), str(config_path), self.use_cuda)
            self.voiceConfig = self._voice.config
        return self._voice

    def getSpeakers(self) -> list[int]:
        config = self.voiceConfig or getattr(self._ensure_voice(), "config", None)
        num_speakers = max(int(getattr(config, "num_speakers", 1) or 1), 1)
        return list(range(num_speakers))

    def synthesize_wav(
        self,
        text: str,
        *,
        speaker_id: int | None = None,
        slow: bool = False,
        length_scale: float | None = None,
        speed: float | None = None,
        noise_scale: float | None = None,
        noise_w_scale: float | None = None,
        volume: float | None = None,
        normalize_audio: bool | None = None,
    ) -> io.BytesIO:
        voice = self._ensure_voice()
        buffer = io.BytesIO()
        syn_config = _build_syn_config(
            slow=slow,
            length_scale=length_scale,
            speed=speed,
            noise_scale=noise_scale,
            noise_w_scale=noise_w_scale,
            volume=volume,
            normalize_audio=normalize_audio,
        )

        with wave.open(buffer, "wb") as wav_file:
            kwargs = {}
            if speaker_id is not None:
                kwargs["speaker_id"] = int(speaker_id)
            if syn_config is not None:
                kwargs["syn_config"] = syn_config
            voice.synthesize_wav(text, wav_file, **kwargs)

        buffer.seek(0)
        return buffer

    def stream(self, text: str, options: dict | None = None) -> Iterable[dict]:
        options = options or {}
        for piece in _split_text_chunks(text):
            wav_buffer = self.synthesize_wav(
                piece,
                speaker_id=options.get("speaker_id"),
                slow=bool(options.get("slow", False)),
                length_scale=options.get("length_scale"),
                speed=options.get("speed"),
                noise_scale=options.get("noise_scale"),
                noise_w_scale=options.get("noise_w_scale"),
                volume=options.get("volume"),
                normalize_audio=options.get("normalize_audio"),
            )

            with wave.open(io.BytesIO(wav_buffer.getvalue()), "rb") as wav_reader:
                yield {
                    "text": piece,
                    "audio": wav_reader.readframes(wav_reader.getnframes()),
                    "sample_rate": wav_reader.getframerate(),
                    "sample_width": wav_reader.getsampwidth(),
                    "sample_channels": wav_reader.getnchannels(),
                }


def synthesize_tts_wav(
    *,
    text: str,
    slow: bool = False,
    speaker_id: int | None = None,
    length_scale: float | None = None,
    speed: float | None = None,
    noise_scale: float | None = None,
    noise_w_scale: float | None = None,
    volume: float | None = None,
    normalize_audio: bool | None = None,
    use_cuda: bool = False,
) -> io.BytesIO:
    tts = PiperTTS(use_cuda=use_cuda)
    return tts.synthesize_wav(
        text,
        speaker_id=speaker_id,
        slow=slow,
        length_scale=length_scale,
        speed=speed,
        noise_scale=noise_scale,
        noise_w_scale=noise_w_scale,
        volume=volume,
        normalize_audio=normalize_audio,
    )


def synthesize_tts_chunks_wav(
    *,
    text: str | None = None,
    chunks: list[str] | None = None,
    slow: bool = False,
    speaker_id: int | None = None,
    length_scale: float | None = None,
    speed: float | None = None,
    noise_scale: float | None = None,
    noise_w_scale: float | None = None,
    volume: float | None = None,
    normalize_audio: bool | None = None,
    use_cuda: bool = False,
) -> io.BytesIO:
    if chunks is not None:
        raw_chunks = [str(chunk).strip() for chunk in chunks if str(chunk).strip()]
        if not raw_chunks:
            raise ValueError("text/chunks must contain at least one non-empty value")

        tts = PiperTTS(use_cuda=use_cuda)
        joined_frames: list[bytes] = []
        audio_format: tuple[int, int, int] | None = None

        for chunk in raw_chunks:
            if chunk == PARAGRAPH_BREAK_MARKER:
                if audio_format is None:
                    continue
                channels, sample_width, sample_rate = audio_format
                silence_frames = int((PARAGRAPH_BREAK_MS / 1000.0) * sample_rate)
                if silence_frames > 0:
                    joined_frames.append(b"\x00" * silence_frames * sample_width * channels)
                continue

            chunk_wav = tts.synthesize_wav(
                chunk,
                speaker_id=speaker_id,
                slow=slow,
                length_scale=length_scale,
                speed=speed,
                noise_scale=noise_scale,
                noise_w_scale=noise_w_scale,
                volume=volume,
                normalize_audio=normalize_audio,
            )

            with wave.open(io.BytesIO(chunk_wav.getvalue()), "rb") as wav_reader:
                channels = wav_reader.getnchannels()
                sample_width = wav_reader.getsampwidth()
                sample_rate = wav_reader.getframerate()
                frames = wav_reader.readframes(wav_reader.getnframes())

            if audio_format is None:
                audio_format = (channels, sample_width, sample_rate)
            elif audio_format != (channels, sample_width, sample_rate):
                raise RuntimeError("Inconsistent WAV format across synthesized chunks")

            joined_frames.append(frames)

        if audio_format is None:
            raise ValueError("No synthesizeable chunks were provided")

        channels, sample_width, sample_rate = audio_format
        out_buffer = io.BytesIO()
        with wave.open(out_buffer, "wb") as wav_writer:
            wav_writer.setnchannels(channels)
            wav_writer.setsampwidth(sample_width)
            wav_writer.setframerate(sample_rate)
            wav_writer.writeframes(b"".join(joined_frames))

        out_buffer.seek(0)
        return out_buffer
    else:
        text_to_speak = str(text or "").strip()

    if not text_to_speak:
        raise ValueError("text/chunks must contain at least one non-empty value")

    return synthesize_tts_wav(
        text=text_to_speak,
        slow=slow,
        speaker_id=speaker_id,
        length_scale=length_scale,
        speed=speed,
        noise_scale=noise_scale,
        noise_w_scale=noise_w_scale,
        volume=volume,
        normalize_audio=normalize_audio,
        use_cuda=use_cuda,
    )


def synthesize_tts_audio(**kwargs) -> io.BytesIO:
    return synthesize_tts_chunks_wav(**kwargs)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Synthesize speech from ONNX with Piper.")
    parser.add_argument("text", nargs="?", default="Xin chao, Đây la Một sound viet.")
    parser.add_argument("-o", "--output", default="output.wav")
    parser.add_argument("--use-cuda", action="store_true")
    args = parser.parse_args()

    wav = synthesize_tts_wav(text=args.text, use_cuda=args.use_cuda)
    with open(args.output, "wb") as out_file:
        out_file.write(wav.getvalue())
    LOGGER.info(build_log_message("tts_model", "example_synthesis_completed", output=args.output))