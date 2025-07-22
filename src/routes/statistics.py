from flask import Blueprint, request, jsonify
from modules.statistics.stats import analyze_text, create_plot, create_wordcloud

statistics_bp = Blueprint('statistics', __name__, template_folder='templates')

@statistics_bp.route('/statistics', methods=['GET', 'POST'])
def analyze_api():
    data = request.get_json()
    text = data.get('text', '')
    remove_stopwords = data.get('remove_stopwords', False)
    if not text:
        return jsonify({"error": "No text provided"}), 400
    stats = analyze_text(text, remove_stopwords=remove_stopwords)
    #plot = create_plot(stats['word_freq'])     
    wordcloud = create_wordcloud(stats['word_freq'])  
    return jsonify({
        "stats": stats,
        #"plot": plot,
        "wordcloud": wordcloud
    })