from flask import Blueprint

analysis_bp = Blueprint('analysis', __name__)

# Import routes for different analysis functionalities
from .preprocessing import preprocessing_bp
from .pos_ner import pos_ner_bp
from .sentiment import sentiment_bp
from .classification import classification_bp
from .summarization import summarization_bp
from .statistics import statistics_bp

# Register the blueprints
analysis_bp.register_blueprint(preprocessing_bp, url_prefix='/preprocessing')
analysis_bp.register_blueprint(pos_ner_bp, url_prefix='/pos-ner')
analysis_bp.register_blueprint(sentiment_bp, url_prefix='/sentiment')
analysis_bp.register_blueprint(classification_bp, url_prefix='/classification')
analysis_bp.register_blueprint(summarization_bp, url_prefix='/summarization')
analysis_bp.register_blueprint(statistics_bp, url_prefix='/statistics')