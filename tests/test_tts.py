from pathlib import Path
from types import SimpleNamespace

import io
import wave

import pytest

import modules.tts.tts as tts_module


def test_resolve_model_paths_prefers_config_json_next_to_model(monkeypatch, tmp_path):
    model_dir = tmp_path / "src" / "model" / "tts"
    model_dir.mkdir(parents=True)

    model_path = model_dir / "viettts.onnx"
    config_path = model_dir / "config.json"
    model_path.write_text("model", encoding="utf-8")
    config_path.write_text("{}", encoding="utf-8")

    monkeypatch.setattr(tts_module, "DEFAULT_MODEL_CANDIDATES", (model_path,))
    monkeypatch.delenv(tts_module.MODEL_PATH_ENV, raising=False)
    monkeypatch.delenv(tts_module.CONFIG_PATH_ENV, raising=False)
    tts_module._load_voice.cache_clear()

    resolved_model_path, resolved_config_path = tts_module._resolve_model_paths()

    assert resolved_model_path == model_path
    assert resolved_config_path == config_path


def test_split_text_chunks_supports_sentences_and_lists():
    assert tts_module._split_text_chunks("Xin chào. Thế giới!\nHôm nay.") == ["Xin chào.", "Thế giới!", "Hôm nay."]
    assert tts_module._split_text_chunks(["  A  ", "", "B"]) == ["A", "B"]


def test_build_syn_config_uses_nonlinear_speed_mapping(monkeypatch):
    captured = {}

    class DummySynthesisConfig:
        def __init__(self, **kwargs):
            captured.update(kwargs)

    monkeypatch.setattr(tts_module, "SynthesisConfig", DummySynthesisConfig)
    monkeypatch.setattr(tts_module, "NONLINEAR_SPEED_EXPONENT", 1.2)

    config = tts_module._build_syn_config(speed=2)

    assert config is not None
    assert captured["length_scale"] == pytest.approx(1 / (2 ** 1.2), rel=1e-6)


def test_synthesize_tts_chunks_wav_inserts_paragraph_silence(monkeypatch):
    sample_rate = 22050

    def make_wav_bytes(frame_count):
        buffer = io.BytesIO()
        with wave.open(buffer, "wb") as wav_file:
            wav_file.setnchannels(1)
            wav_file.setsampwidth(2)
            wav_file.setframerate(sample_rate)
            wav_file.writeframes(b"\x01\x00" * frame_count)
        buffer.seek(0)
        return buffer.getvalue()

    class DummyTTS:
        def __init__(self, use_cuda=False):
            self.use_cuda = use_cuda

        def synthesize_wav(self, text, **kwargs):
            return io.BytesIO(make_wav_bytes(20))

    monkeypatch.setattr(tts_module, "PiperTTS", DummyTTS)

    out_buffer = tts_module.synthesize_tts_chunks_wav(
        chunks=["Doan 1", tts_module.PARAGRAPH_BREAK_MARKER, "Doan 2"],
    )

    with wave.open(io.BytesIO(out_buffer.getvalue()), "rb") as wav_file:
        total_frames = wav_file.getnframes()

    expected_min_frames = 20 + 20 + int((tts_module.PARAGRAPH_BREAK_MS / 1000.0) * sample_rate)
    assert total_frames >= expected_min_frames


def test_piper_tts_stream_yields_chunk_payloads(monkeypatch):
    voice_config = SimpleNamespace(sample_rate=22050, num_speakers=2, phoneme_id_map={})
    tts = tts_module.PiperTTS(voiceConfig=voice_config, session=object())

    class DummyVoice:
        config = voice_config

        def synthesize_wav(self, text, wav_file, syn_config=None):
            wav_file.setnchannels(1)
            wav_file.setsampwidth(2)
            wav_file.setframerate(22050)
            wav_file.writeframes(b"\x01\x00" * 4)

    tts._voice = DummyVoice()

    payloads = list(tts.stream("Xin chào. Thế giới!", options={"slow": False}))

    assert [payload["text"] for payload in payloads] == ["Xin chào.", "Thế giới!"]
    assert all(isinstance(payload["audio"], bytes) and payload["audio"] for payload in payloads)
    assert tts.getSpeakers() == [0, 1]
