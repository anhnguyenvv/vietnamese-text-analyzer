from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
from config.settings import Config
import re
from modules.statistics.stats import get_word_freq
tokenizer = AutoTokenizer.from_pretrained(Config.MODELS_DIR['summarization'])
model = AutoModelForSeq2SeqLM.from_pretrained(Config.MODELS_DIR['summarization'])
length_settings = {
"short": {
    "max_tokens": 100,
    "min_tokens": 50,
    "target_length": "3-4 câu"
},
"medium": {
    "max_tokens": 200,
    "min_tokens": 100,
    "target_length": "5-6 câu"
},
"long": {
    "max_tokens": 300,
    "min_tokens": 150,
    "target_length": "8-9 câu"
}
}

def summarize_text(text: str, length="medium") -> str:
    """
    Tóm tắt văn bản tiếng Việt.
    """
    word_freq, _, _= get_word_freq(text, remove_stopwords=True, keep_case=False)
    key_words = [w for w, _ in sorted(word_freq.items(), key=lambda x: x[1], reverse=True)[:5]]
    length_setting = length_settings.get(length, length_settings["medium"])
    text = text + " </s>" + f"Tóm tắt văn bản trên với độ dài {length_setting['target_length']}. Ưu tiên giữ các thông tin liên quan đến: {key_words}, không thêm bất kỳ thông tin nào không có trong văn bản."
    enc = tokenizer(text, return_tensors="pt", max_length=1024, truncation=True)
    outputs = model.generate(
        **enc,
        max_length=length_setting["max_tokens"],
        min_length=length_setting["min_tokens"],
        length_penalty=1.5,
        num_beams=5
    )
    res = ""
    for output in outputs:
        line = tokenizer.decode(output, skip_special_tokens=True, clean_up_tokenization_spaces=True)
        if line:
            res += line + " "
    return res
# Ví dụ sử dụng
if __name__ == "__main__":
    text = """Trong những năm gần đây, thương mại điện tử tại Việt Nam đã có sự phát triển vượt bậc, đặc biệt là sau đại dịch COVID-19. Nhiều doanh nghiệp truyền thống đã chuyển hướng sang bán hàng trực tuyến để thích ứng với xu hướng mới.
Các nền tảng như Shopee, Lazada và Tiki ghi nhận lượng truy cập tăng mạnh, đặc biệt trong các dịp khuyến mãi lớn như 11/11 hay Black Friday. Người tiêu dùng cũng dần quen với việc mua sắm qua mạng, từ thực phẩm, quần áo cho đến thiết bị điện tử.
Tuy nhiên, sự phát triển nhanh chóng này cũng đặt ra nhiều thách thức về quản lý, vận chuyển và bảo mật thông tin người dùng. Các chuyên gia cho rằng, để phát triển bền vững, ngành thương mại điện tử cần chú trọng hơn đến trải nghiệm khách hàng, hạ tầng công nghệ và niềm tin người tiêu dùng.
"""
    print(summarize_text(text, length="medium"))
    print("Độ dài:", len(summarize_text(text, length="medium")))
    print(summarize_text(text, length="short"))
    print("Độ dài:", len(summarize_text(text, length="short")))
    print(summarize_text(text, length="long"))
    print("Độ dài:", len(summarize_text(text, length="long")))
    