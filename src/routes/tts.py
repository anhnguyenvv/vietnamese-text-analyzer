import io
import logging

from flask import Blueprint, jsonify, request, send_file

from database.db import load_tts_audio, load_tts_history, save_tts_history
from extensions import limiter
from modules.tts import synthesize_tts_chunks_wav
from utils.input_validation import validate_text_input
from utils.logging_utils import build_log_message


tts_bp = Blueprint("tts", __name__)
LOGGER = logging.getLogger("vta.api.tts")

ALLOWED_LANGS = {"vi", "en"}
PARAGRAPH_BREAK_MARKER = "__TTS_PARAGRAPH_BREAK__"


@tts_bp.route("/synthesize", methods=["POST"])
@limiter.limit("20 per minute")
def synthesize_speech():
    payload = request.get_json(silent=True) or {}
    LOGGER.info(
        build_log_message("tts", "synthesize_request_received", path=request.path, method=request.method),
    )

    chunks_raw = payload.get("chunks")
    chunks = None
    if chunks_raw is not None:
        if not isinstance(chunks_raw, list):
            LOGGER.warning(build_log_message("tts", "invalid_chunks_payload"))
            return jsonify({"error": "chunks must be a list of strings"}), 400

        chunks = [str(chunk).strip() for chunk in chunks_raw if str(chunk).strip()]
        if not chunks:
            LOGGER.warning(build_log_message("tts", "empty_chunks_payload"))
            return jsonify({"error": "chunks must contain at least one non-empty item"}), 400
        if len(chunks) > 120:
            LOGGER.warning(build_log_message("tts", "chunks_too_many", chunk_count=len(chunks)))
            return jsonify({"error": "chunks must not exceed 120 items"}), 400
        if any(len(chunk) > 1000 for chunk in chunks):
            LOGGER.warning(build_log_message("tts", "chunk_too_long"))
            return jsonify({"error": "each chunk must be at most 1000 characters"}), 400

    text, text_error = validate_text_input(payload.get("text"), max_length=5000)
    if chunks is None and text_error is not None:
        LOGGER.warning(build_log_message("tts", "text_validation_failed"))
        error_payload, status = text_error
        return jsonify(error_payload), status

    lang = str(payload.get("lang", "vi")).strip().lower()
    if lang not in ALLOWED_LANGS:
        LOGGER.warning(build_log_message("tts", "invalid_language", lang=lang))
        return jsonify({"error": f"lang must be one of: {', '.join(sorted(ALLOWED_LANGS))}"}), 400

    slow = bool(payload.get("slow", False))
    speaker_id_raw = payload.get("speaker_id")
    speaker_id = None
    if speaker_id_raw is not None and speaker_id_raw != "":
        try:
            speaker_id = int(speaker_id_raw)
        except (TypeError, ValueError):
            LOGGER.warning(build_log_message("tts", "invalid_speaker_id", speaker_id=speaker_id_raw))
            return jsonify({"error": "speaker_id must be an integer"}), 400

    length_scale_raw = payload.get("length_scale")
    speed_raw = payload.get("speed")
    noise_scale_raw = payload.get("noise_scale")
    noise_w_scale_raw = payload.get("noise_w_scale")

    try:
        length_scale = float(length_scale_raw) if length_scale_raw is not None else None
        speed = float(speed_raw) if speed_raw is not None else None
        noise_scale = float(noise_scale_raw) if noise_scale_raw is not None else None
        noise_w_scale = float(noise_w_scale_raw) if noise_w_scale_raw is not None else None
    except (TypeError, ValueError):
        LOGGER.warning(build_log_message("tts", "invalid_numeric_payload"))
        return jsonify({"error": "length_scale, speed, noise_scale, and noise_w_scale must be numbers"}), 400

    if speed is not None and speed <= 0:
        LOGGER.warning(build_log_message("tts", "invalid_speed_nonpositive", speed=speed))
        return jsonify({"error": "speed must be greater than 0"}), 400
    if speed is not None:
        if speed < 0.25 or speed > 3:
            LOGGER.warning(build_log_message("tts", "invalid_speed_range", speed=speed))
            return jsonify({"error": "speed must be between 0.25 and 3.0"}), 400

    try:
        audio_buffer = synthesize_tts_chunks_wav(
            text=text,
            chunks=chunks,
            slow=slow,
            speaker_id=speaker_id,
            length_scale=length_scale,
            speed=speed,
            noise_scale=noise_scale,
            noise_w_scale=noise_w_scale,
        )
        LOGGER.info(
            build_log_message(
                "tts",
                "synthesize_request_succeeded",
                lang=lang,
                chunk_count=len(chunks) if chunks is not None else 1,
                speed=speed,
                speaker_id=speaker_id,
            ),
        )

        original_text = text if text_error is None else str(payload.get("text") or "").strip()
        normalized_text = (
            " ".join(chunk for chunk in chunks if chunk != PARAGRAPH_BREAK_MARKER)
            if chunks is not None
            else original_text
        )
        save_tts_history(
            input_text=original_text,
            normalized_text=normalized_text,
            chunk_count=len(chunks) if chunks is not None else 1,
            lang=lang,
            slow=slow,
            audio_blob=audio_buffer.getvalue(),
        )

        audio_buffer.seek(0)
        return send_file(
            audio_buffer,
            mimetype="audio/wav",
            as_attachment=False,
            download_name="speech.wav",
        )
    except (FileNotFoundError, RuntimeError) as exc:
        LOGGER.warning(build_log_message("tts", "synthesize_unavailable", error=str(exc)))
        return jsonify({"error": str(exc)}), 503
    except Exception as exc:
        LOGGER.exception(build_log_message("tts", "synthesize_failed", error=str(exc)))
        return jsonify({"error": f"Failed to synthesize speech: {exc}"}), 500


@tts_bp.route("/history", methods=["GET"])
def get_tts_history():
    limit_raw = request.args.get("limit", "20")
    try:
        limit = int(limit_raw)
    except ValueError:
        LOGGER.warning(build_log_message("tts", "history_invalid_limit", limit=limit_raw))
        return jsonify({"error": "limit must be an integer"}), 400

    if limit <= 0 or limit > 200:
        LOGGER.warning(build_log_message("tts", "history_limit_out_of_range", limit=limit))
        return jsonify({"error": "limit must be between 1 and 200"}), 400

    LOGGER.info(build_log_message("tts", "history_request_received", limit=limit))
    return jsonify(load_tts_history(limit=limit))


@tts_bp.route("/history/<int:history_id>/audio", methods=["GET"])
def get_tts_history_audio(history_id: int):
    audio_blob = load_tts_audio(history_id)
    if audio_blob is None:
        LOGGER.warning(build_log_message("tts", "history_audio_not_found", history_id=history_id))
        return jsonify({"error": "TTS history item not found"}), 404

    LOGGER.info(build_log_message("tts", "history_audio_served", history_id=history_id))
    return send_file(
        io.BytesIO(audio_blob),
        mimetype="audio/wav",
        as_attachment=False,
        download_name=f"tts_{history_id}.wav",
    )