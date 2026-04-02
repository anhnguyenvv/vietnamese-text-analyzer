import importlib
import io

from flask import Blueprint, jsonify, request, send_file

from extensions import limiter
from utils.input_validation import validate_text_input


tts_bp = Blueprint("tts", __name__)

ALLOWED_LANGS = {"vi", "en"}


@tts_bp.route("/synthesize", methods=["POST"])
@limiter.limit("20 per minute")
def synthesize_speech():
    payload = request.get_json(silent=True) or {}
    text, text_error = validate_text_input(payload.get("text"), max_length=5000)
    if text_error is not None:
        error_payload, status = text_error
        return jsonify(error_payload), status

    lang = str(payload.get("lang", "vi")).strip().lower()
    if lang not in ALLOWED_LANGS:
        return jsonify({"error": f"lang must be one of: {', '.join(sorted(ALLOWED_LANGS))}"}), 400

    slow = bool(payload.get("slow", False))

    try:
        gtts_module = importlib.import_module("gtts")
    except Exception:
        return jsonify({"error": "TTS dependency is missing. Please install gTTS."}), 503

    try:
        engine = gtts_module.gTTS(text=text, lang=lang, slow=slow)
        audio_buffer = io.BytesIO()
        engine.write_to_fp(audio_buffer)
        audio_buffer.seek(0)
        return send_file(
            audio_buffer,
            mimetype="audio/mpeg",
            as_attachment=False,
            download_name="speech.mp3",
        )
    except Exception as exc:
        return jsonify({"error": f"Failed to synthesize speech: {exc}"}), 500