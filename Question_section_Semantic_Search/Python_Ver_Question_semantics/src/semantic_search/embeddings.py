from sentence_transformers import SentenceTransformer
from .config import MODEL_NAME

class Embedder:
    def __init__(self):
        self.model = SentenceTransformer(MODEL_NAME)

    def encode_texts(self, texts):
        return self.model.encode(texts, show_progress_bar=True).tolist()

    def encode_one(self, text):
        return self.model.encode(text).tolist()