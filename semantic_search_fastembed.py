import json
import numpy as np
import faiss

from fastembed import TextEmbedding

# ==========================================
# LOAD JSON DATASET
# ==========================================

with open("faqdataset_complete.json", "r", encoding="utf-8") as f:

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

print(f"\nLoaded {len(faq_data)} FAQ pairs")

# ==========================================
# CREATE DOCUMENTS
# ==========================================

documents = []

for item in faq_data:

    text = item["question"] + " " + item["answer"]

    documents.append(text)

# ==========================================
# LOAD EMBEDDING MODEL
# ==========================================

print("\nLoading embedding model...")

embedding_model = TextEmbedding()

# ==========================================
# GENERATE EMBEDDINGS
# ==========================================

print("\nGenerating embeddings...")

print("\nGenerating embeddings in batches...")

embeddings = []

batch_size = 8

for i in range(0, len(documents), batch_size):

    batch = documents[i:i+batch_size]

    batch_embeddings = list(
        embedding_model.embed(batch)
    )

    embeddings.extend(batch_embeddings)

    print(f"Processed batch {i//batch_size + 1}")

embeddings = np.array(
    embeddings
).astype("float32")

print("\nEmbeddings created!")

print("Embedding Shape:", embeddings.shape)

# ==========================================
# SAVE EMBEDDINGS FILE
# ==========================================

np.save(
    "faq_embeddings.npy",
    embeddings
)

print("\nEmbeddings saved as faq_embeddings.npy")

# ==========================================
# CREATE FAISS INDEX
# ==========================================

dimension = embeddings.shape[1]

index = faiss.IndexFlatL2(dimension)

index.add(embeddings)

print("\nFAISS index created!")

# ==========================================
# SAVE FAISS INDEX
# ==========================================

faiss.write_index(
    index,
    "faq_index.faiss"
)

print("\nFAISS index saved as faq_index.faiss")

# ==========================================
# QUERY LOOP
# ==========================================

print("\nSemantic Search Ready!")
print("Type 'exit' to quit")

while True:

    query = input("\nEnter your query: ")

    if query.lower() == "exit":
        break

    # ======================================
    # GENERATE QUERY EMBEDDING
    # ======================================

    query_embedding = list(
        embedding_model.embed([query])
    )

    query_embedding = np.array(
        query_embedding
    ).astype("float32")

    # ======================================
    # SEARCH TOP K RESULTS
    # ======================================

    k = 5

    distances, indices = index.search(
        query_embedding,
        k
    )

    # ======================================
    # SHOW RESULTS
    # ======================================

    print("\nTop Results:\n")

    for rank, idx in enumerate(indices[0]):

        print("=" * 60)

        print(f"\nRank {rank+1}")

        print("\nQuestion:")
        print(faq_data[idx]["question"])

        print("\nAnswer:")
        print(faq_data[idx]["answer"])

        print("\nDistance Score:")
        print(distances[0][rank])

        print()

    print("=" * 60)