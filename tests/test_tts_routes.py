import io
import wave

from flask import Flask

import routes.tts as tts_routes
from routes.tts import tts_bp


def _make_wav_bytes():
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(22050)
        wav_file.writeframes(b"\x00\x00" * 100)
    buffer.seek(0)
    return buffer.getvalue()


def _create_tts_client():
    app = Flask(__name__)
    app.config["TESTING"] = True
    app.register_blueprint(tts_bp, url_prefix="/api/tts")
    return app.test_client()


def test_synthesize_uses_chunks_payload(monkeypatch):
    client = _create_tts_client()
    wav_bytes = _make_wav_bytes()
    saved = {}

    def fake_synthesize_tts_chunks_wav(**kwargs):
        assert kwargs["chunks"] == ["xin chào", "thế giới"]
        assert kwargs["speed"] == 0.8
        return io.BytesIO(wav_bytes)

    def fake_save_tts_history(**kwargs):
        saved.update(kwargs)

    monkeypatch.setattr(tts_routes, "synthesize_tts_chunks_wav", fake_synthesize_tts_chunks_wav)
    monkeypatch.setattr(tts_routes, "save_tts_history", fake_save_tts_history)

    response = client.post(
        "/api/tts/synthesize",
        json={
            "text": "xin chào thế giới",
            "chunks": ["xin chào", "thế giới"],
            "lang": "vi",
            "slow": False,
            "speed": 0.8,
        },
    )

    assert response.status_code == 200
    assert response.mimetype == "audio/wav"
    assert saved["chunk_count"] == 2
    assert saved["lang"] == "vi"


def test_synthesize_rejects_invalid_speed():
    client = _create_tts_client()

    response = client.post(
        "/api/tts/synthesize",
        json={
            "text": "xin chào",
            "lang": "vi",
            "speed": 0,
        },
    )

    assert response.status_code == 400
    assert "speed" in response.get_json()["error"]


def test_tts_history_list(monkeypatch):
    client = _create_tts_client()

    monkeypatch.setattr(
        tts_routes,
        "load_tts_history",
        lambda limit=20: [{"id": 1, "chunk_count": 3, "lang": "vi", "slow": 0}],
    )

    response = client.get("/api/tts/history?limit=5")

    assert response.status_code == 200
    data = response.get_json()
    assert isinstance(data, list)
    assert data[0]["id"] == 1


def test_tts_history_audio_not_found(monkeypatch):
    client = _create_tts_client()

    monkeypatch.setattr(tts_routes, "load_tts_audio", lambda history_id: None)

    response = client.get("/api/tts/history/999/audio")

    assert response.status_code == 404
    assert response.get_json()["error"] == "TTS history item not found"
