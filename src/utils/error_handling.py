from flask import jsonify

def handle_error(error):
    response = {
        "success": False,
        "error": {
            "type": type(error).__name__,
            "message": str(error)
        }
    }
    return jsonify(response), 400

def handle_not_found(error):
    response = {
        "success": False,
        "error": {
            "type": "NotFound",
            "message": "Resource not found"
        }
    }
    return jsonify(response), 404

def handle_internal_server_error(error):
    response = {
        "success": False,
        "error": {
            "type": "InternalServerError",
            "message": "An internal server error occurred"
        }
    }
    return jsonify(response), 500