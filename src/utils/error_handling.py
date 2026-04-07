from flask import jsonify
import logging
from utils.logging_utils import build_log_message


LOGGER = logging.getLogger("vta.api.errors")

def handle_error(error):
    LOGGER.exception(build_log_message("errors", "handled_error", error_type=type(error).__name__))
    response = {
        "success": False,
        "error": {
            "type": type(error).__name__,
            "message": str(error)
        }
    }
    return jsonify(response), 400

def handle_not_found(error):
    LOGGER.warning(build_log_message("errors", "resource_not_found", error_type=type(error).__name__))
    response = {
        "success": False,
        "error": {
            "type": "NotFound",
            "message": "Resource not found"
        }
    }
    return jsonify(response), 404

def handle_internal_server_error(error):
    LOGGER.exception(build_log_message("errors", "internal_server_error", error_type=type(error).__name__))
    response = {
        "success": False,
        "error": {
            "type": "InternalServerError",
            "message": "An internal server error occurred"
        }
    }
    return jsonify(response), 500