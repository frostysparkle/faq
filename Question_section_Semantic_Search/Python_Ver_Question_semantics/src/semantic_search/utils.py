import json
from typing import List, Dict

def load_and_flatten(path: str) -> List[Dict]:
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    docs = []
    for section in data.get("sections", []):
        sec_num = section.get("section_number")
        sec_title = section.get("section_title")
        for qa in section.get("qa_pairs", []):
            docs.append({
                "id": qa.get("id"),
                "question": qa.get("question"),
                "answer": qa.get("answer"),
                "section_number": sec_num,
                "section_title": sec_title
            })
    return docs

def normalize(text: str) -> str:
    return " ".join(text.lower().strip().split())