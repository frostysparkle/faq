import fs from "fs";

export function loadAndFlatten(path) {
  const raw = fs.readFileSync(path, "utf-8");
  const data = JSON.parse(raw);

  const docs = [];
  for (const section of data.sections || []) {
    for (const qa of section.qa_pairs || []) {
      docs.push({
        id: qa.id,
        question: qa.question,
        answer: qa.answer,
        section_number: section.section_number,
        section_title: section.section_title
      });
    }
  }
  return docs;
}

export function normalize(text) {
  return text.toLowerCase().trim().replace(/\s+/g, " ");
}