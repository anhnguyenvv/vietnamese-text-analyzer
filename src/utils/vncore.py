import os
from config.settings import Config
import os
import requests
from vncorenlp import VnCoreNLP
from pathlib import Path

def download_file(url, dst):
    r = requests.get(url, stream=True)
    with open(dst, 'wb') as f:
        for chunk in r.iter_content(chunk_size=8192):
            if chunk:
                f.write(chunk)


class VnCore:
    def __init__(self, vncorenlp_path=Config.VNCORENLP_DIR):
        self.annotator = None
        self.load_model(vncorenlp_path)

    def load_model(self, vncorenlp_path=Config.VNCORENLP_DIR):
        """
        Load the VnCoreNLP model from the specified path.
        """
        if not os.path.exists(vncorenlp_path):
            raise FileNotFoundError(f"VnCoreNLP model not found at {vncorenlp_path}")
        self.annotator = VnCoreNLP(vncorenlp_path)

    @staticmethod
    def download_model(save_dir='./'):
        """
        Download the VnCoreNLP model files to the specified directory.
        """
        save_dir = str(save_dir).rstrip("/")
        jar_path = os.path.join(save_dir, "VnCoreNLP-1.2.jar")


        # Kiểm tra nếu model đã tồn tại
        if os.path.isdir(save_dir + "/models") and os.path.exists(jar_path):
            print("VnCoreNLP model folder " + save_dir + " already exists! Please load VnCoreNLP from this folder!")
            
            return

        os.makedirs(save_dir + "/models/dep", exist_ok=True)
        os.makedirs(save_dir + "/models/ner", exist_ok=True)
        os.makedirs(save_dir + "/models/postagger", exist_ok=True)
        os.makedirs(save_dir + "/models/wordsegmenter", exist_ok=True)

        # jar
        download_file("https://raw.githubusercontent.com/vncorenlp/VnCoreNLP/master/VnCoreNLP-1.2.jar", jar_path)

        # wordsegmenter
        download_file("https://raw.githubusercontent.com/vncorenlp/VnCoreNLP/master/models/wordsegmenter/vi-vocab",
                    save_dir + "/models/wordsegmenter/vi-vocab")
        download_file("https://raw.githubusercontent.com/vncorenlp/VnCoreNLP/master/models/wordsegmenter/wordsegmenter.rdr",
                    save_dir + "/models/wordsegmenter/wordsegmenter.rdr")

        # postagger
        download_file("https://raw.githubusercontent.com/vncorenlp/VnCoreNLP/master/models/postagger/vi-tagger",
                    save_dir + "/models/postagger/vi-tagger")

        # ner
        download_file("https://raw.githubusercontent.com/vncorenlp/VnCoreNLP/master/models/ner/vi-500brownclusters.xz",
                    save_dir + "/models/ner/vi-500brownclusters.xz")
        download_file("https://raw.githubusercontent.com/vncorenlp/VnCoreNLP/master/models/ner/vi-ner.xz",
                    save_dir + "/models/ner/vi-ner.xz")
        download_file("https://raw.githubusercontent.com/vncorenlp/VnCoreNLP/master/models/ner/vi-pretrainedembeddings.xz",
                    save_dir + "/models/ner/vi-pretrainedembeddings.xz")
        # parse
        download_file("https://raw.githubusercontent.com/vncorenlp/VnCoreNLP/master/models/dep/vi-dep.xz",
                    save_dir + "/models/dep/vi-dep.xz")
        print("VnCoreNLP model downloaded to " + save_dir)

    def tokenize(self, text):
        return self.annotator.tokenize(text)

    def pos_tag(self, text):
        return self.annotator.pos_tag(text)

    def ner(self, text):
        return self.annotator.ner(text)

    def parse(self, text):
        return self.annotator.parse(text)

vncorenlp_path = Path(Config.VNCORENLP_DIR)

# Nếu chưa có model thì tải
if not vncorenlp_path.exists():
    VnCore.download_model(save_dir=str(vncorenlp_path.parent))  # GỌI TRỰC TIẾP STATIC

# Sau đó khởi tạo bình thường
vncore_model = VnCore(vncorenlp_path=str(vncorenlp_path))
