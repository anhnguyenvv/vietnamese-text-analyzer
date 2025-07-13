from transformers import pipeline
from config.settings import Config

summarizer = pipeline(
    "summarization",
    model=Config.MODELS_DIR['summarization'],
    tokenizer=Config.MODELS_DIR['summarization']
)
def summarize_text(text: str, max_length=1024) -> str:
    """
    Tóm tắt văn bản tiếng Việt.
    """
    text = "vietnews: " + text + " </s>"
    res = summarizer(
        text,
        max_length=max_length,
        early_stopping=True,
    )[0]['summary_text']
    return res

# Ví dụ sử dụng
if __name__ == "__main__":
    text = "Summary có nghĩa là bản tóm tắt. Hiểu một cách đơn giản summary paragraph là ghi lại những ý chính của một đoạn văn, bài báo, hay thậm chí là những gì bạn nghe được bằng ngôn ngữ của chính bạn"
    print(summarize_text(text))
    while True:
        text = input("Nhập văn bản cần tóm tắt (hoặc 'exit' để thoát): ")
        if text.lower() == 'exit' or text.lower() == 'quit' or not text:
            print("Thoát chương trình.")
            break
        print(summarize_text(text))