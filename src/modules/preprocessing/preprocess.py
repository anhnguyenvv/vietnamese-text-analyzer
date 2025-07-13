from typing import List
import os
from config.settings import BASE_DIR
import unicodedata
from modules.preprocessing.normalization import normalize_text
from modules.preprocessing.tokenization import tokenize_words

def _load_stopwords() -> List[str]:
    """
    Load a list of Vietnamese stopwords from a file.
    """
    stopwords = []
    filepath = os.path.join(BASE_DIR, 'content', 'Vstopword_new.txt')
    filepath = os.path.normpath(filepath)
    with open(filepath, encoding="utf-8") as f:
        for line in f:
            word = line.strip()
            if word and not word.startswith("//"):
                stopwords.append(word)
    return stopwords

_STOPWORDS_CACHE = _load_stopwords()

def get_stopwords() -> List[str]:
    """
    Trả về danh sách stopwords đã cache.
    """
    return _STOPWORDS_CACHE
def remove_stopwords(tokens: str) -> str:
    """
    Loại bỏ stopwords khỏi văn bản.
    """
    stopwords = get_stopwords()
    filtered_tokens = [token for token in tokens if token.lower() not in stopwords]
    return filtered_tokens


def preprocess_text(text: str, remove_duplicates: bool = False, remove_icon: bool = False,
                   remove_numbers: bool = True, remove_special_chars: bool = True, remove_stopword: bool = False) -> str:
    text = unicodedata.normalize("NFC", text)

    text = normalize_text(text, remove_icon=remove_icon)
    tokens = tokenize_words(text)  
    if remove_duplicates:
        tokens = list(dict.fromkeys(tokens))
    if remove_special_chars:
        tokens = [token for token in tokens if all(c.isalnum() or c == '_' or c.isspace() for c in token)]
    if remove_numbers:
        tokens = [token for token in tokens if not token.isdigit()]
    if remove_stopword:
        tokens = remove_stopwords(tokens)
        
    return ' '.join(tokens)

if __name__ == "__main__":
    # Example usage
    stopwords = get_stopwords()
    print(f"Loaded {len(stopwords)} stopwords.")
    print(stopwords[:10])  # Print first 10 stopwords for verification
    sample_text = "Hôm nay là một ngày đẹp trời. Tôi đi học và gặp bạn bè."
    preprocessed_text = preprocess_text(sample_text)
    print("Original Text:", sample_text)
    print("Preprocessed Text:", preprocessed_text)  # Output: "Hôm nay ngày đẹp trời Tôi đi học gặp bạn bè"