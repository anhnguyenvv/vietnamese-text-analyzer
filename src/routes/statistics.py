import logging

from flask import Blueprint, request, jsonify
from modules.statistics.stats import analyze_text, create_plot, create_wordcloud
from extensions import limiter
from utils.input_validation import validate_text_input
from utils.logging_utils import build_log_message

statistics_bp = Blueprint('statistics', __name__, template_folder='templates')
LOGGER = logging.getLogger("vta.api.statistics")

@statistics_bp.route('/statistics', methods=['GET', 'POST'])
@limiter.limit("20 per minute")
def analyze_api():
    data = request.get_json(silent=True) or {}
    text, text_error = validate_text_input(data.get('text'))
    if text_error is not None:
        LOGGER.warning(build_log_message("statistics", "validation_failed"))
        payload, status = text_error
        return jsonify(payload), status

    remove_stopwords = data.get('remove_stopwords', False)

    LOGGER.info(build_log_message("statistics", "request_received", remove_stopwords=remove_stopwords, path=request.path))
    stats = analyze_text(text, remove_stopwords=remove_stopwords)
    #plot = create_plot(stats['word_freq'])     
    #wordcloud = create_wordcloud(stats['word_freq'])  
    LOGGER.info(build_log_message("statistics", "request_succeeded", token_count=stats.get("word_count", 0)))
    return jsonify({
        "stats": stats,
        #"plot": plot,
        #"wordcloud": wordcloud
    })