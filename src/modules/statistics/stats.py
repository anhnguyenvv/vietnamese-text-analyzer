import collections
import matplotlib.pyplot as plt
plt.switch_backend('Agg')  # Use non-GUI backend for matplotlib
from modules.preprocessing.preprocess import get_stopwords
from modules.preprocessing.normalization import normalize_text
from modules.preprocessing.tokenization import tokenize_sentences, tokenize_words
from wordcloud import WordCloud
import emoji

def create_wordcloud(word_freq):
    """
    Tạo biểu đồ WordCloud từ tần suất từ.
    Trả về chuỗi base64 của ảnh wordcloud.
    """
    import io, base64
    wordcloud = WordCloud(width=800, height=400, background_color='white', font_path='arial.ttf').generate_from_frequencies(word_freq)
    plt.figure(figsize=(10, 5))
    plt.imshow(wordcloud, interpolation='bilinear')
    plt.axis('off')
    plt.tight_layout()
    buf = io.BytesIO()
    plt.savefig(buf, format='png')
    buf.seek(0)
    plot_data = base64.b64encode(buf.read()).decode('utf-8')
    buf.close()
    plt.close()
    return plot_data

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() == 'txt'

def create_plot(word_freq):
    top = word_freq.most_common(10)
    words, freqs = zip(*top)
    plt.figure(figsize=(8, 4))
    plt.bar(words, freqs, color='teal')
    plt.xticks(rotation=45)
    plt.title("Top 10 từ phổ biến")
    plt.tight_layout()
    import io, base64
    buf = io.BytesIO()
    plt.savefig(buf, format='png')
    buf.seek(0)
    plot_data = base64.b64encode(buf.read()).decode('utf-8')
    buf.close()
    plt.close()
    return plot_data

def analyze_text(text, remove_stopwords=True):    
    clean_text = normalize_text(text, remove_icon=True)
    sentences = tokenize_sentences(clean_text) 
    words = tokenize_words(clean_text)
    num_digits = sum(c.isdigit() for c in clean_text) 
    # xóa số và ký tự đặc biệt
    words = [w for w in words if w.isalpha()]
    chars = len(text)
    
    stopwords = set(get_stopwords())
    filtered_words = [w for w in words if w.lower() not in stopwords] 
    stopword_count =  len(words) - len(filtered_words)
    word_freq = collections.Counter([w for w in (filtered_words if remove_stopwords else words)])
    result = {
        "num_sentences": len(sentences),
        "num_words": len(filtered_words),
        "num_chars": chars,
        "avg_sentence_len": round(sum(len(tokenize_words(s)) for s in sentences) / len(sentences), 2) if sentences else 0,
        "avg_word_len": round(sum(len(w) for w in filtered_words) / len(filtered_words), 2) if filtered_words else 0,
        "vocab_size": len(set(filtered_words)),
        "num_digits": num_digits,
        "num_special_chars": sum(1 for c in text if not c.isalnum() and not c.isspace()),
        "num_emojis": sum(1 for c in text if emoji.is_emoji(c)),
        "num_stopwords": stopword_count,
        "word_freq": word_freq,
    }
    return result

def analyze_file(file_path, remove_stopwords=False):
    if not allowed_file(file_path):
        raise ValueError("Chỉ hỗ trợ file .txt")

    with open(file_path, 'r', encoding='utf-8') as f:
        text = f.read()
    return analyze_text(text, remove_stopwords=remove_stopwords)
    # phân tích file csv
    # if file_path.endswith('.csv'):
    #     import pandas as pd
    #     df = pd.read_csv(file_path)
    #     results = []
    #     for col in df.columns:
    #         if df[col].dtype == 'object':  # Chỉ phân tích c
    #             text = ' '.join(df[col].dropna().astype(str).tolist())
    #             result = analyze_text(text, remove_stopwords=remove_stopwords)
    #             results.append({
    #                 "column": col,
    #                 "analysis": result
    #             })
    #     return results
if __name__ == '__main__':
    # Example usage
    text = '''ELO 3. Ngữ cảnh, trách nhiệm và đạo đức 
ELO 3. 1. Ngữ cảnh bên ngoài, xã hội, kinh tế và môi trường 
ELO 3. 1. 1 Các vấn đề và giá trị của xã hội, kinh tế và môi trường đương đại 
ELO 3. 1. 2 Vai trò và trách nhiệm 
ELO 3. 1. 3 Ngữ cảnh văn hóa, lịch sử 
ELO 3. 1. 4 Luật lệ và quy định của xã hội 
ELO 3. 2. Ngữ cảnh công ty và doanh nghiệp 
ELO 3. 2. 1 Ngữ cảnh và văn hóa của công ty, tổ chức 
ELO 3. 2. 2 Các bên liên quan, mục tiêu và chiến lược của công ty/ doanh nghiệp 
ELO 3. 2. 3 Luật lệ và quy định của công ty/ doanh nghiệp 
ELO 3. 3. Đạo đức, trách nhiệm và các giá trị cá nhân cốt lõi 
ELO 3. 3. 1 Các chuẩn mực và nguyên tắc đạo đức 
ELO 3. 3. 2 Trách nhiệm và cách hành xử chuyên nghiệp 
ELO 3. 3. 3 Sự cam kết 
ELO 3. 3. 4 Trung thực, uy tín và trung thành 🧐😗☺️'''
    result = analyze_text(text, remove_stopwords=True)
    print(result)
    print(f'top 10 từ: {result["word_freq"].most_common(10)}')
    plot_url = create_plot(result['word_freq'])
    print(f"Plot URL: {plot_url[:50]}...")  # Print first 50 characters of the plot URL
    wordcloud_url = create_wordcloud(result['word_freq'])
    print(f"Wordcloud URL: {wordcloud_url[:50]}...")  # Print first 50 characters of the wordcloud URL