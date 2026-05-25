import json
import numpy as np

# ==========================================
# LOAD SAVED EMBEDDINGS
# ==========================================

embeddings = np.load(
    "faq_embeddings.npy"
)

# ==========================================
# LOAD FAQ DATA
# ==========================================

with open(
    "faqdataset_complete.json",
    "r",
    encoding="utf-8"
) as f:

    data = json.load(f)

# ==========================================
# EXTRACT FAQ PAIRS
# ==========================================

faq_data = []

for section in data["sections"]:

    for qa in section["qa_pairs"]:

        faq_data.append({

            "question": qa["question"],

            "answer": qa["answer"]

        })

# ==========================================
# CREATE READABLE FILE
# ==========================================

with open(
    "embeddings_readable.txt",
    "w",
    encoding="utf-8"
) as f:

    for i, emb in enumerate(embeddings):

        f.write(f"FAQ {i+1}\n\n")

        f.write(
            f"Question: {faq_data[i]['question']}\n\n"
        )

        f.write(
            f"Answer: {faq_data[i]['answer']}\n\n"
        )

        f.write("Embedding Vector:\n\n")

        # first 20 dimensions only
        f.write(str(emb[:20].tolist()))

        f.write("\n\n")

        f.write("=" * 100)

        f.write("\n\n")

print("\nReadable embedding file created!")