from __future__ import annotations

import argparse
import io
import json
import os
import re
import wave
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any, Final, Optional, Sequence, Union, Iterable, Tuple

import numpy as np

import onnxruntime 

REPO_ROOT = Path(__file__).resolve().parents[3]
MODEL_PATH_ENV = "PIPER_TTS_MODEL_PATH"
CONFIG_PATH_ENV = "PIPER_TTS_CONFIG_PATH"
DEFAULT_MODEL_PATH = REPO_ROOT / "src" / "model" / "tts" / "viettts.onnx"
DEFAULT_CONFIG_PATH = REPO_ROOT / "src" / "model" / "tts" / "config.json"

DEFAULT_NOISE_SCALE: Final = 0.667
DEFAULT_LENGTH_SCALE: Final = 1.0
DEFAULT_NOISE_W_SCALE: Final = 0.8

DEFAULT_HOP_LENGTH: Final = 256

@dataclass
class PiperConfig:
    """Piper configuration"""

    num_symbols: int
    """Number of phonemes."""

    num_speakers: int
    """Number of speakers."""

    sample_rate: int
    """Sample rate of output audio."""

    espeak_voice: str
    """Name of espeak-ng voice or alphabet."""

    phoneme_id_map: Mapping[str, Sequence[int]]
    """Phoneme -> [id,]."""

    phoneme_type: PhonemeType
    """espeak or text."""

    speaker_id_map: Mapping[str, int] = field(default_factory=dict)
    """Speaker -> id"""

    piper_version: Optional[str] = None

    # Inference settings
    length_scale: float = DEFAULT_LENGTH_SCALE
    noise_scale: float = DEFAULT_NOISE_SCALE
    noise_w_scale: float = DEFAULT_NOISE_W_SCALE

    hop_length: int = DEFAULT_HOP_LENGTH

    @staticmethod
    def from_dict(config: dict[str, Any]) -> "PiperConfig":
        """Load configuration from a dictionary."""
        inference = config.get("inference", {})

        return PiperConfig(
            num_symbols=config["num_symbols"],
            num_speakers=config["num_speakers"],
            sample_rate=config["audio"]["sample_rate"],
            noise_scale=inference.get("noise_scale", DEFAULT_NOISE_SCALE),
            length_scale=inference.get("length_scale", DEFAULT_LENGTH_SCALE),
            noise_w_scale=inference.get("noise_w", DEFAULT_NOISE_W_SCALE),
            #
            espeak_voice=config["espeak"]["voice"],
            phoneme_id_map=config["phoneme_id_map"],
            phoneme_type=PhonemeType(config.get("phoneme_type", PhonemeType.ESPEAK)),
            speaker_id_map=config.get("speaker_id_map", {}),
            #
            piper_version=config.get("piper_version"),
            #
            hop_length=config.get("hop_length", DEFAULT_HOP_LENGTH),
        )

    def to_dict(self) -> dict[str, Any]:
        """Convert configuration to a dictionary."""
        config_dict = {
            "audio": {
                "sample_rate": self.sample_rate,
            },
            "espeak": {
                "voice": self.espeak_voice,
            },
            "phoneme_type": self.phoneme_type.value,
            "num_symbols": self.num_symbols,
            "num_speakers": self.num_speakers,
            "inference": {
                "noise_scale": self.noise_scale,
                "length_scale": self.length_scale,
                "noise_w": self.noise_w_scale,
            },
            "phoneme_id_map": self.phoneme_id_map,
            "speaker_id_map": self.speaker_id_map,
            "hop_length": self.hop_length,
        }

        if self.piper_version:
            config_dict["piper_version"] = self.piper_version

        return config_dict


@dataclass
class SynthesisConfig:
    """Configuration for Piper synthesis."""

    speaker_id: Optional[int] = None
    """Index of speaker to use (multi-speaker voices only)."""

    length_scale: Optional[float] = None
    """Phoneme length scale (< 1 is faster, > 1 is slower)."""

    noise_scale: Optional[float] = None
    """Amount of generator noise to add."""

    noise_w_scale: Optional[float] = None
    """Amount of phoneme width noise to add."""

    normalize_audio: bool = True
    """Enable/disable scaling audio samples to fit full range."""

    volume: float = 1.0
    """Multiplier for audio samples (< 1 is quieter, > 1 is louder)."""

def merge_phonemizer_output_preserve_punct(text: str, phonemes: Any) -> str:
    """
    Mirrors mergePhonemizerOutputPreservePunct() in src/lib/piper-tts.js.
    - phonemes can be string OR list/tuple of strings OR dict-like outputs.
    - preserves clause separators [,;:] found in original text.
    """
    if isinstance(phonemes, str):
        return phonemes

    if isinstance(phonemes, dict):
        maybe = phonemes.get("text") or phonemes.get("phonemes")
        if isinstance(maybe, str):
            return maybe
        return str(maybe if maybe is not None else phonemes)

    if not isinstance(phonemes, (list, tuple)):
        return "" if phonemes is None else str(phonemes)

    separators = re.findall(r"[,;:]", text)

    result = []
    sep_idx = 0
    first = True

    for raw_part in phonemes:
        if not raw_part:
            continue
        part = str(raw_part).strip()
        if not part:
            continue

        if not first:
            sep = separators[sep_idx] if sep_idx < len(separators) else ","
            result.append(f"{sep} ")
            sep_idx += 1
        else:
            first = False

        result.append(part)

    return "".join(result)


@dataclass
class RawAudio:
    audio: np.ndarray  # float32 mono, [-1,1]
    sample_rate: int

    def write_wav(self, out_path: Union[str, Path]) -> None:
        out_path = Path(out_path)
        x = np.asarray(self.audio, dtype=np.float32)
        x = np.clip(x, -1.0, 1.0)
        pcm16 = (x * 32767.0).astype(np.int16)

        out_path.parent.mkdir(parents=True, exist_ok=True)
        with wave.open(str(out_path), "wb") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(int(self.sample_rate))
            wf.writeframes(pcm16.tobytes())

@dataclass
class PiperTTS:
    """A voice for Piper."""

    session: onnxruntime.InferenceSession
    """ONNX session."""

    config: PiperConfig
    """Piper voice configuration."""


    download_dir: Path = Path.cwd()
    """Path to download resources."""

    # For Arabic text only
    use_tashkeel: bool = True
    tashkeel_diacritizier: Optional[TashkeelDiacritizer] = None
    taskeen_threshold: Optional[float] = 0.8

    @staticmethod
    def load(
        model_path: Union[str, Path],
        config_path: Optional[Union[str, Path]] = None,
        use_cuda: bool = False,
        espeak_data_dir: Union[str, Path] = ESPEAK_DATA_DIR,
        download_dir: Optional[Union[str, Path]] = None,
    ) -> "PiperVoice":
        """
        Load an ONNX model and config.

        :param model_path: Path to ONNX voice model.
        :param config_path: Path to JSON voice config (defaults to model_path + ".json").
        :param use_cuda: True if CUDA (GPU) should be used instead of CPU.
        :param espeak_data_dir: Path to espeak-ng data dir (defaults to internal data).
        :param download_dir: Path to download resources (defaults to current directory).
        :return: Voice object.
        """
        if config_path is None:
            config_path = f"{model_path}.json"
            _LOGGER.debug("Guessing voice config path: %s", config_path)

        with open(config_path, "r", encoding="utf-8") as config_file:
            config_dict = json.load(config_file)

        providers: list[Union[str, tuple[str, dict[str, Any]]]]
        if use_cuda:
            providers = [
                (
                    "CUDAExecutionProvider",
                    {"cudnn_conv_algo_search": "HEURISTIC"},
                )
            ]
            _LOGGER.debug("Using CUDA")
        else:
            providers = ["CPUExecutionProvider"]

        if download_dir is None:
            download_dir = Path.cwd()

        return PiperVoice(
            config=PiperConfig.from_dict(config_dict),
            session=onnxruntime.InferenceSession(
                str(model_path),
                sess_options=onnxruntime.SessionOptions(),
                providers=providers,
            ),
            espeak_data_dir=Path(espeak_data_dir),
            download_dir=Path(download_dir),
        )

    def phonemize(self, text: str) -> list[list[str]]:
        """
        Text to phonemes grouped by sentence.

        :param text: Text to phonemize.
        :return: List of phonemes for each sentence.
        """
        global _ESPEAK_PHONEMIZER

        if self.config.phoneme_type == PhonemeType.TEXT:
            # Phonemes = codepoints
            return [list(unicodedata.normalize("NFD", text))]

        if self.config.phoneme_type == PhonemeType.PINYIN:
            from .phonemize_chinese import ChinesePhonemizer

            # Use g2pW-based phonemizer
            phonemizer = getattr(self, "_chinese_phonemizer", None)
            if phonemizer is None:
                phonemizer = ChinesePhonemizer(self.download_dir / "g2pW")
                setattr(self, "_chinese_phonemizer", phonemizer)

            return phonemizer.phonemize(text)

        if self.config.phoneme_type != PhonemeType.ESPEAK:
            raise ValueError(f"Unexpected phoneme type: {self.config.phoneme_type}")

        phonemes: list[list[str]] = []
        text_parts = _PHONEME_BLOCK_PATTERN.split(text)
        prev_raw_phonemes = False
        for i, text_part in enumerate(text_parts):
            if text_part.startswith("[["):
                prev_raw_phonemes = True

                # Phonemes
                if not phonemes:
                    # Start new sentence
                    phonemes.append([])

                if (i > 0) and (text_parts[i - 1].endswith(" ")):
                    phonemes[-1].append(" ")

                phonemes[-1].extend(text_part[2:-2].strip())

                if (i < (len(text_parts)) - 1) and (text_parts[i + 1].startswith(" ")):
                    phonemes[-1].append(" ")

                continue

            # Arabic diacritization
            if (self.config.espeak_voice == "ar") and self.use_tashkeel:
                if self.tashkeel_diacritizier is None:
                    self.tashkeel_diacritizier = TashkeelDiacritizer()

                text_part = self.tashkeel_diacritizier(
                    text_part, taskeen_threshold=self.taskeen_threshold
                )

            with _ESPEAK_PHONEMIZER_LOCK:
                if _ESPEAK_PHONEMIZER is None:
                    _ESPEAK_PHONEMIZER = EspeakPhonemizer(self.espeak_data_dir)

                text_part_phonemes = _ESPEAK_PHONEMIZER.phonemize(
                    self.config.espeak_voice, text_part
                )

                if prev_raw_phonemes and text_part_phonemes:
                    # Add to previous block of phonemes first if it came from [[ raw phonemes]]
                    phonemes[-1].extend(text_part_phonemes[0])
                    text_part_phonemes = text_part_phonemes[1:]

                phonemes.extend(text_part_phonemes)

            prev_raw_phonemes = False

        if phonemes and (not phonemes[-1]):
            # Remove empty phonemes
            phonemes.pop()

        return phonemes

    def phonemes_to_ids(self, phonemes: list[str]) -> list[int]:
        """
        Phonemes to ids.

        :param phonemes: List of phonemes.
        :return: List of phoneme ids.
        """

        if self.config.phoneme_type == PhonemeType.PINYIN:
            from .phonemize_chinese import phonemes_to_ids as chinese_phonemes_to_ids

            return chinese_phonemes_to_ids(phonemes, self.config.phoneme_id_map)

        return phonemes_to_ids(phonemes, self.config.phoneme_id_map)

    def synthesize(
        self,
        text: str,
        syn_config: Optional[SynthesisConfig] = None,
        include_alignments: bool = False,
    ) -> Iterable[AudioChunk]:
        """
        Synthesize one audio chunk per sentence from from text.

        :param text: Text to synthesize.
        :param syn_config: Synthesis configuration.
        :param include_alignments: If True and the model supports it, include phoneme/audio alignments.
        """
        if syn_config is None:
            syn_config = _DEFAULT_SYNTHESIS_CONFIG

        sentence_phonemes = self.phonemize(text)
        _LOGGER.debug("text=%s, phonemes=%s", text, sentence_phonemes)

        for phonemes in sentence_phonemes:
            if not phonemes:
                continue

            phoneme_ids = self.phonemes_to_ids(phonemes)

            phoneme_id_samples: Optional[np.ndarray] = None
            audio_result = self.phoneme_ids_to_audio(
                phoneme_ids, syn_config, include_alignments=include_alignments
            )
            if isinstance(audio_result, tuple):
                # Audio + alignments
                audio, phoneme_id_samples = audio_result
            else:
                # Audio only
                audio = audio_result

            if syn_config.normalize_audio:
                max_val = np.max(np.abs(audio))
                if max_val < 1e-8:
                    # Prevent division by zero
                    audio = np.zeros_like(audio)
                else:
                    audio = audio / max_val

            if syn_config.volume != 1.0:
                audio = audio * syn_config.volume

            audio = np.clip(audio, -1.0, 1.0).astype(np.float32)

            phoneme_alignments: Optional[list[PhonemeAlignment]] = None
            if (phoneme_id_samples is not None) and (
                len(phoneme_id_samples) == len(phoneme_ids)
            ):
                # Create phoneme/audio alignments by determining the phoneme ids
                # produced by each phoneme (including the next PAD), and then
                # summing the audio sample counts for those phoneme ids.
                pad_ids = self.config.phoneme_id_map.get(PAD, [])
                phoneme_id_idx = 0
                phoneme_alignments = []
                alignment_failed = False
                for phoneme in itertools.chain([BOS], phonemes, [EOS]):
                    expected_ids = self.config.phoneme_id_map.get(phoneme, [])

                    ids_to_check: Sequence[int]
                    if phoneme != EOS:
                        ids_to_check = list(itertools.chain(expected_ids, pad_ids))
                    else:
                        ids_to_check = expected_ids

                    start_phoneme_id_idx = phoneme_id_idx
                    for phoneme_id in ids_to_check:
                        if phoneme_id_idx >= len(phoneme_ids):
                            # Ran out of phoneme ids
                            alignment_failed = True
                            break

                        if phoneme_id != phoneme_ids[phoneme_id_idx]:
                            # Bad alignment
                            alignment_failed = True
                            break

                        phoneme_id_idx += 1

                    if alignment_failed:
                        break

                    phoneme_alignments.append(
                        PhonemeAlignment(
                            phoneme=phoneme,
                            phoneme_ids=ids_to_check,
                            num_samples=sum(
                                phoneme_id_samples[start_phoneme_id_idx:phoneme_id_idx]
                            ),
                        )
                    )

                if alignment_failed:
                    phoneme_alignments = None
                    _LOGGER.debug("Phoneme alignment failed")

            yield AudioChunk(
                sample_rate=self.config.sample_rate,
                sample_width=2,
                sample_channels=1,
                audio_float_array=audio,
                phonemes=phonemes,
                phoneme_ids=phoneme_ids,
                phoneme_id_samples=phoneme_id_samples,
                phoneme_alignments=phoneme_alignments,
            )

    def synthesize_wav(
        self,
        text: str,
        wav_file: wave.Wave_write,
        syn_config: Optional[SynthesisConfig] = None,
        set_wav_format: bool = True,
        include_alignments: bool = False,
    ) -> Optional[list[PhonemeAlignment]]:
        """
        Synthesize and write WAV audio from text.

        :param text: Text to synthesize.
        :param wav_file: WAV file writer.
        :param syn_config: Synthesis configuration.
        :param set_wav_format: True if the WAV format should be set automatically.
        :param include_alignments: If True and the model supports it, return phoneme/audio alignments.

        :return: Phoneme/audio alignments if include_alignments is True, otherwise None.
        """
        alignments: list[PhonemeAlignment] = []
        first_chunk = True
        for audio_chunk in self.synthesize(
            text, syn_config=syn_config, include_alignments=include_alignments
        ):
            if first_chunk:
                if set_wav_format:
                    # Set audio format on first chunk
                    wav_file.setframerate(audio_chunk.sample_rate)
                    wav_file.setsampwidth(audio_chunk.sample_width)
                    wav_file.setnchannels(audio_chunk.sample_channels)

                first_chunk = False

            wav_file.writeframes(audio_chunk.audio_int16_bytes)

            if include_alignments and audio_chunk.phoneme_alignments:
                alignments.extend(audio_chunk.phoneme_alignments)

        if include_alignments:
            return alignments

        return None

    def phoneme_ids_to_audio(
        self,
        phoneme_ids: list[int],
        syn_config: Optional[SynthesisConfig] = None,
        include_alignments: bool = False,
    ) -> Union[np.ndarray, Tuple[np.ndarray, Optional[np.ndarray]]]:
        """
        Synthesize raw audio from phoneme ids.

        :param phoneme_ids: List of phoneme ids.
        :param syn_config: Synthesis configuration.
        :param include_alignments: Return samples per phoneme id if True.
        :return: Audio float numpy array from voice model (unnormalized, in range [-1, 1]).

        If include_alignments is True and the voice model supports it, the return
        value will be a tuple instead with (audio, phoneme_id_samples) where
        phoneme_id_samples contains the number of audio samples per phoneme id.
        """
        if syn_config is None:
            syn_config = _DEFAULT_SYNTHESIS_CONFIG

        speaker_id = syn_config.speaker_id
        length_scale = syn_config.length_scale
        noise_scale = syn_config.noise_scale
        noise_w_scale = syn_config.noise_w_scale

        if length_scale is None:
            length_scale = self.config.length_scale

        if noise_scale is None:
            noise_scale = self.config.noise_scale

        if noise_w_scale is None:
            noise_w_scale = self.config.noise_w_scale

        phoneme_ids_array = np.expand_dims(np.array(phoneme_ids, dtype=np.int64), 0)
        phoneme_ids_lengths = np.array([phoneme_ids_array.shape[1]], dtype=np.int64)
        scales = np.array(
            [noise_scale, length_scale, noise_w_scale],
            dtype=np.float32,
        )

        args = {
            "input": phoneme_ids_array,
            "input_lengths": phoneme_ids_lengths,
            "scales": scales,
        }

        if self.config.num_speakers <= 1:
            speaker_id = None

        if (self.config.num_speakers > 1) and (speaker_id is None):
            # Default speaker
            speaker_id = 0

        if speaker_id is not None:
            sid = np.array([speaker_id], dtype=np.int64)
            args["sid"] = sid

        # Synthesize through onnx
        result = self.session.run(
            None,
            args,
        )
        audio = result[0].squeeze()
        if not include_alignments:
            return audio

        if len(result) == 1:
            # Alignment is not available from voice model
            return audio, None

        # Number of samples for each phoneme id
        phoneme_id_samples = (result[1].squeeze() * self.config.hop_length).astype(
            np.int64
        )

        return audio, phoneme_id_samples

def normalize_peak(f32: np.ndarray, target: float = 1.0) -> np.ndarray:
    if f32.size == 0:
        return f32

    maxv = float(np.max(np.abs(f32)))
    if maxv <= 1e-9:
        return f32

    gain = min(4.0, target / maxv)
    if gain < 1.0:
        return f32 * gain
    return f32


def wav_bytes_from_f32(audio_f32: np.ndarray, sample_rate: int) -> bytes:
    buffer = io.BytesIO()
    x = np.asarray(audio_f32, dtype=np.float32)
    x = np.clip(x, -1.0, 1.0)
    pcm16 = (x * 32767.0).astype(np.int16)

    with wave.open(buffer, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(int(sample_rate))
        wf.writeframes(pcm16.tobytes())

    return buffer.getvalue()


class PiperOnnxEngine(PiperTTS):
    def infer_chunk(
        self,
        text: str,
        speaker_id: int,
        length_scale: float,
        noise_scale: float,
        noise_w: float,
    ) -> np.ndarray:
        return self.synthesize(
            text=text,
            speaker_id=speaker_id,
            length_scale=length_scale,
            noise_scale=noise_scale,
            noise_w=noise_w,
        ).audio



def _resolve_model_paths() -> tuple[Path, Path]:
    configured_model_path = os.getenv(MODEL_PATH_ENV)
    configured_config_path = os.getenv(CONFIG_PATH_ENV)

    if configured_model_path:
        model_path = Path(configured_model_path).expanduser()
        config_candidates = (
            (Path(configured_config_path).expanduser(),)
            if configured_config_path
            else (
                model_path.parent / "config.json",
            )
        )
        if model_path.exists():
            for config_path in config_candidates:
                if config_path.exists():
                    return model_path, config_path

        raise FileNotFoundError(
            f"Configured TTS model paths were not found: {model_path} / {configured_config_path or model_path.parent / 'config.json'}"
        )

    if configured_config_path:
        raise FileNotFoundError(
            f"{CONFIG_PATH_ENV} is set but {MODEL_PATH_ENV} is missing. Please set both variables together."
        )

    if DEFAULT_MODEL_PATH.exists() and DEFAULT_CONFIG_PATH.exists():
        return DEFAULT_MODEL_PATH, DEFAULT_CONFIG_PATH

    model_hint = DEFAULT_MODEL_PATH
    config_hint = DEFAULT_CONFIG_PATH
    raise FileNotFoundError(
        f"No TTS ONNX model found. Set {MODEL_PATH_ENV} and {CONFIG_PATH_ENV}, or place the model/config at {model_hint} and {config_hint}."
    )


@lru_cache(maxsize=1)
def _get_tts_engine() -> PiperTTS:
    model_path, config_path = _resolve_model_paths()
    return PiperOnnxEngine(model_path=model_path, config_path=config_path)


def _resolve_length_scale(slow: bool, length_scale: float | None, speed: float | None) -> float:
    if length_scale is not None:
        return float(length_scale)
    if speed is not None:
        if speed <= 0:
            raise ValueError("speed must be greater than 0")
        return float(1.0 / speed)
    if slow:
        return 1.2
    return 1.0


def _merge_raw_chunks(chunks: list[RawAudio], pause_ms: int = 120) -> RawAudio:
    if not chunks:
        raise ValueError("No text chunks were provided for synthesis")

    sample_rate = int(chunks[0].sample_rate)
    for chunk in chunks:
        if int(chunk.sample_rate) != sample_rate:
            raise RuntimeError("Inconsistent sample rate across synthesized chunks")

    merged_parts: list[np.ndarray] = []
    pause_samples = int((max(pause_ms, 0) * sample_rate) / 1000)
    pause = np.zeros((pause_samples,), dtype=np.float32) if pause_samples > 0 else None
    for index, chunk in enumerate(chunks):
        if index > 0 and pause is not None:
            merged_parts.append(pause)
        merged_parts.append(np.asarray(chunk.audio, dtype=np.float32))

    merged_audio = np.concatenate(merged_parts).astype(np.float32, copy=False)
    return RawAudio(audio=merged_audio, sample_rate=sample_rate)


def synthesize_tts_audio(
    text: str | None = None,
    chunks: list[str] | None = None,
    slow: bool = False,
    speaker_id: int | None = None,
    length_scale: float | None = None,
    speed: float | None = 1.0,
    noise_scale: float | None = 1.0,
    noise_w_scale: float | None = 1.0,
    pause_ms: int = 120,
) -> io.BytesIO:
    engine = _get_tts_engine()

    cleaned_chunks = [str(chunk).strip() for chunk in (chunks or []) if str(chunk).strip()]
    if not cleaned_chunks:
        normalized_text = str(text or "").strip()
        if not normalized_text:
            raise ValueError("No text chunks were provided for synthesis")
        cleaned_chunks = [normalized_text]

    effective_length_scale = _resolve_length_scale(
        slow=slow,
        length_scale=length_scale,
        speed=speed,
    )
    effective_noise_scale = float(noise_scale) if noise_scale is not None else 0.667
    effective_noise_w_scale = float(noise_w_scale) if noise_w_scale is not None else 0.8
    effective_speaker_id = int(speaker_id) if speaker_id is not None else 0

    chunk_audios = [
        RawAudio(
            audio=engine.infer_chunk(
            chunk,
            speaker_id=effective_speaker_id,
            length_scale=effective_length_scale,
            noise_scale=effective_noise_scale,
            noise_w=effective_noise_w_scale,
            ),
            sample_rate=engine.sample_rate,
        )
        for chunk in cleaned_chunks
    ]
    merged = _merge_raw_chunks(chunk_audios, pause_ms=pause_ms)

    merged_audio = normalize_peak(merged.audio)
    return io.BytesIO(wav_bytes_from_f32(merged_audio, merged.sample_rate))


if __name__ == "__main__":
    text = "Xin chào thế giới. Đây là một thử nghiệm của hệ thống chuyển văn bản thành giọng nói."
    audio_buffer = synthesize_tts_audio(text=text, slow=False, speaker_id=0)
    with open("output.wav", "wb") as f:
        f.write(audio_buffer.getvalue())    
        print("Audio synthesis complete. Output saved to output.wav")