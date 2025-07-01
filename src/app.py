from flask import Flask
from routes.preprocessing import preprocessing_bp
from routes.pos_ner import pos_ner_bp
from routes.sentiment import sentiment_bp
from routes.classification import classification_bp
from routes.summarization import summarization_bp
from routes.statistics import statistics_bp
from flask_cors import CORS

def create_app():
    app = Flask(__name__)
    CORS(app)
    app.config['JSON_AS_ASCII'] = False  # To handle Vietnamese characters correctly
    # Register blueprints
    app.register_blueprint(preprocessing_bp, url_prefix='/api/preprocessing')
    app.register_blueprint(pos_ner_bp, url_prefix='/api/pos-ner')
    app.register_blueprint(sentiment_bp, url_prefix='/api/sentiment')
    app.register_blueprint(classification_bp, url_prefix='/api/classification')
    app.register_blueprint(summarization_bp, url_prefix='/api/summarization')
    app.register_blueprint(statistics_bp, url_prefix='/api/statistics')

    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True)