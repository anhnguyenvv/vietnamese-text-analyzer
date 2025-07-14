from flask import Flask, request
from routes.preprocessing import preprocessing_bp
from routes.pos import pos_bp
from routes.ner import ner_bp
from routes.sentiment import sentiment_bp
from routes.classification import classification_bp
from routes.summarization import summarization_bp
from routes.statistics import statistics_bp
from flask_cors import CORS
from routes.feedback import feedback_bp
import logging
logging.getLogger("transformers.modeling_utils").setLevel(logging.ERROR)

from database.db import save_system_log  
def log_to_db(level, message, module="system"):
    try:
        save_system_log(level=level, message=message, module=module)
    except Exception as e:
        print("Log DB error:", e)

def create_app():
    app = Flask(__name__)
    CORS(app)

    app.config['JSON_AS_ASCII'] = False  # To handle Vietnamese characters correctly
    # Register blueprints
    app.register_blueprint(feedback_bp, url_prefix='/api/feedback')
    app.register_blueprint(preprocessing_bp, url_prefix='/api/preprocessing')
    app.register_blueprint(pos_bp, url_prefix='/api/pos')
    app.register_blueprint(ner_bp, url_prefix='/api/ner')
    app.register_blueprint(sentiment_bp, url_prefix='/api/sentiment')
    app.register_blueprint(classification_bp, url_prefix='/api/classification')
    app.register_blueprint(summarization_bp, url_prefix='/api/summarization')
    app.register_blueprint(statistics_bp, url_prefix='/api/statistics')

    @app.after_request
    def after_request(response):
        log_to_db(
            level="INFO",
            message=f"{request.method} {request.path} - {response.status_code}",
            module="request"
        )
        return response

    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=False, host='0.0.0.0', port=5000)