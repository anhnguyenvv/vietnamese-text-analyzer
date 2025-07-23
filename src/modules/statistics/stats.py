import collections
import matplotlib.pyplot as plt
plt.switch_backend('Agg')  # Use non-GUI backend for matplotlib
from modules.preprocessing.preprocess import get_stopwords
from modules.preprocessing.normalization import normalize_text
from modules.preprocessing.tokenization import tokenize_sentences, tokenize_words
from wordcloud import WordCloud
import emoji
import time

def create_wordcloud(word_freq):
    """
    Tạo biểu đồ WordCloud từ tần suất từ.
    Trả về chuỗi base64 của ảnh wordcloud.
    """
    if not word_freq:
        return None
    if len(word_freq) > 100:
        word_freq = dict(collections.Counter(word_freq).most_common(100))
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

def create_plot(word_freq, n=10):
    if not word_freq:
        return None
    if len(word_freq) < n:
        n = len(word_freq)
    # Lấy n từ phổ biến nhất
    top = word_freq.most_common(n)
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
def get_word_freq(text, remove_stopwords=True, keep_case=False):
    """
    Trả về tần suất từ trong văn bản.
    - remove_stopwords: loại bỏ stopwords khỏi tần suất từ
    - keep_case: nếu True giữ nguyên chữ hoa/thường, nếu False chuyển về chữ thường khi đếm từ
    """
    clean_text = normalize_text(text, lowercase= not keep_case, remove_icon= True)
    words = tokenize_words(clean_text)
    stopwords = set(get_stopwords())
    words = [w for w in words if w.replace(" ", "").isalpha() ]
    if keep_case:
        filtered_words = [w for w in words if w.lower() not in stopwords]
    else:
        filtered_words = [w for w in words if w not in stopwords]
    if remove_stopwords:
        words = filtered_words
    return collections.Counter(words), words, len(words) - len(filtered_words)
def analyze_text(text, remove_stopwords=True, keep_case=False):
    """
    Phân tích văn bản: trả về thống kê số câu, từ, ký tự, số, ký tự đặc biệt, emoji, stopwords, tần suất từ, v.v.
    - remove_stopwords: loại bỏ stopwords khỏi thống kê từ
    - keep_case: nếu True giữ nguyên chữ hoa/thường, nếu False chuyển về chữ thường khi đếm từ
    """
    num_chars = len(text)
    num_special_chars = 0
    num_digits = 0
    num_emojis = 0
    for c in text:
        num_special_chars += 1 if not c.isalnum() and not c.isspace() else 0
        num_digits += c.isdigit()
        num_emojis += emoji.is_emoji(c)
    sentences = tokenize_sentences(text)
    len_sentences = len(sentences)
    word_freq, words, stopword_count = get_word_freq(text, remove_stopwords=remove_stopwords, keep_case=keep_case)
    words = list(word_freq.keys())
    num_words = len(words)
    result = {
        "num_sentences": len_sentences,
        "num_words": num_words,
        "num_chars": num_chars,
        "avg_sentence_len": round(sum(len(tokenize_words(s)) for s in sentences) / len_sentences, 2) if len_sentences else 0,
        "vocab_size": len(set(words)),
        "num_digits": num_digits,
        "num_special_chars": num_special_chars,
        "num_emojis": num_emojis,
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
    text = '''Chắc chắn một điều rằng, những kẻ ấy vĩnh viễn không thể tự khẳng định vị trí của mình trong xã hội, mãi mãi chỉ có thể sống dưới cái bóng của kẻ khác. Tuy nhiên bên cạnh những con người biết khát vọng và hướng đến những điều tốt đẹp thì trong xã hội vẫn còn đâu đó những con người không biết vươn lên, tự mãn với bản thân. Những người như vậy sẽ làm xã hội đi xuống, họ đáng bị phê phán và lên án

Nước xanh biếc vào buổi sáng, vàng nhạt vào buổi trưa và đỏ thẫm vào buổi chiều tà. Chỉ có những người yêu dòng sông tha thiết mới cảm nhận được cái đẹp của dòng sông. Nhớ những buổi trưa hè trốn ngủ, ra dòng sông chơi. Nhớ những buổi chiều đi mót khoai, sắn, cả một lũ đem ra bờ sông, lấy lá đa đốt lên rồi nướng ăn. Đứa nào đứa lấy chân tay lấm lem,1,Biểu cảm. Tôi yêu dòng sông quê, yêu cả những người bạn, yêu cả những cánh đồng vàng ươm

Những thác nước sôi réo ào ạt đổ về từ thượng nguồn, cuồn cuộn chảy bọt tung trắng xoá, có sức tàn phá thật đáng sợ! Những tai hoạ do sông Đà gây ra trở thành mối lo thường xuyên của người dân sinh sống hai bên bờ từ bao đời nay. Em rất thích vẻ đẹp của sông Đà vào mùa nước cạn, nước trong vắt có thể nhìn thấy rõ từng đàn cá lội tung tăng, từng hòn đá, hòn cuội dưới đáy sông. Chiều chiều, chúng em thoả thích bơi lội và nô giỡn. Giữa lòng sông, những doi cát dài nối tiếp nhau. Từng đoàn thuyền của dân kéo ra đây lấy cát. Chúng em sục chân thật sâu vào cát rồi lội ngược dòng với một niềm thích thú khó tả

Năm 1640, ông Henry Dunster (Henry Đanxtơ) tốt nghiệp trường Đại học Cambrige ở Anh, được cử làm hiệu trưởng trường Harvard.Ông điều hành theo mô hình của Anh và dạy các môn: Khoa học xã hội, ngôn ngữ và ba môn triết học. Khoa thần học ra đời năm 1721 nhờ sự giúp đỡ của một nhà kinh doanh ở London để trả lương cho giáo viên. Sáu năm sau, trường có thêm khoa Toán học và khoa Triết học. Trong 100 năm đầu, trường phải dựa vào sự giúp đỡ của nhà nước thuộc địa, nhờ các khoản tiền ủng hộ của các cựu sinh viên và tổ chức nhân đạo, cho đến năm 1833 thì chấm dứt.

Ơ, bác vẽ cháu đấy ư? Không, không, đừng vẽ cháu! Để cháu giới thiệu với bác những người khác đáng cho bác vẽ hơn. Phải, người họa sĩ già vừa nói chuyện, tay vừa bất giác hí hoáy vào cuốn sổ tì lên đầu gối. Hơn bao nhiêu người khác, ông biết rất rõ sự bất lực của nghệ thuật, của hội họa trong cuộc hành trình vĩ đại là cuộc đời

Người ta thường nói thể thao là trò chơi của sức mạnh, của tốc độ và sự dẻo dai. Nhưng sâu xa hơn, thể thao là một ngôn ngữ không lời, nơi con người đối thoại với chính bản thể của mình – bằng mồ hôi, sự đau đớn và cả những giấc mơ tưởng như không thể với tới.
Trên đường chạy, không chỉ là cuộc đua giữa người với người. Đó còn là cuộc chạy đua giữa cái "tôi yếu đuối" và cái "tôi kiên cường" trong chính mỗi vận động viên. Mỗi bước chân vấp ngã là một câu hỏi hiện sinh: "Liệu mình còn muốn tiến về phía trước không?" Và mỗi lần bật dậy là một câu trả lời dứt khoát: "Còn. Bởi vì tôi vẫn chưa chạm tới giới hạn cuối cùng."
Có ai từng nhìn một vận động viên bật khóc sau vạch đích mà không thấy tim mình nhói lên? Nước mắt ấy không đơn thuần là niềm vui chiến thắng. Đó là tổng hòa của tháng ngày khổ luyện, của những buổi sáng gió lạnh tê tay và những tối muộn chỉ còn tiếng bước chân vang vọng trên sân tập.
Thể thao không chỉ rèn luyện thể lực – nó gọt giũa nhân cách. Nó dạy ta biết thua, biết thắng, và trên hết, biết đứng dậy sau mỗi lần thất bại. Trong một thế giới ồn ào và đầy toan tính, nơi mà con người ngày càng xa rời bản năng tự nhiên, thể thao giữ lại cho ta một điều thuần khiết: khát vọng vượt lên chính mình.
Và đó cũng là lý do, dù không phải ai cũng trở thành vận động viên, nhưng ai cũng có thể sống một đời thể thao – kiên trì, mạnh mẽ và không ngừng bước tới.
    '''
    time_start = time.time()
    result = analyze_text(text, remove_stopwords=True)
    wordcloud_url = create_wordcloud(result['word_freq'])
    time_end = time.time()
    print(f"Analysis took {time_end - time_start:.2f} seconds")
    print(result)
    print(f"Wordcloud URL: {wordcloud_url[:50]}...")  # Print first 50 characters of the wordcloud URL