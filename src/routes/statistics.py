from flask import Blueprint, request, jsonify
from modules.statistics.stats import analyze_text, create_plot, create_wordcloud
from extensions import limiter
from utils.input_validation import validate_text_input

statistics_bp = Blueprint('statistics', __name__, template_folder='templates')

@statistics_bp.route('/statistics', methods=['GET', 'POST'])
@limiter.limit("20 per minute")
def analyze_api():
    data = request.get_json(silent=True) or {}
    text, text_error = validate_text_input(data.get('text'))
    if text_error is not None:
        payload, status = text_error
        return jsonify(payload), status

    remove_stopwords = data.get('remove_stopwords', False)

    stats = analyze_text(text, remove_stopwords=remove_stopwords)
    #plot = create_plot(stats['word_freq'])     
    #wordcloud = create_wordcloud(stats['word_freq'])  
    return jsonify({
        "stats": stats,
        #"plot": plot,
        #"wordcloud": wordcloud
    })