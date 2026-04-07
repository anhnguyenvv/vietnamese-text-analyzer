from pathlib import Path
from types import SimpleNamespace

import io
import wave

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
