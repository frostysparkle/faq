import Answer from "../models/Answer.js";
import Faq from "../models/Faq.js";
import { ANSWER_STATUS, FAQ_STATUS, QUESTION_STATUS } from "../constants/statuses.js";
import { cosineSimilarity, generateQueryEmbedding } from "../utils/embeddings.js";

const stripEmbedding = ({ embedding: _embedding, ...rest }) => rest;

export const searchAssistant = async (userId, { query }) => {
  const queryEmbedding = await generateQueryEmbedding(query);

  const [keywordFaqs, semanticFaqs, answers] = await Promise.all([
    Faq.find({ status: FAQ_STATUS.PUBLISHED, $text: { $search: query } }, { score: { $meta: "textScore" } })
      .sort({ score: { $meta: "textScore" } })
      .limit(8)
      .populate("categories", "name")
      .lean(),
    queryEmbedding
      ? Faq.find({ status: FAQ_STATUS.PUBLISHED })
          .select("+embedding _id title summary slug categories updatedAt helpfulCount notHelpfulCount")
          .populate("categories", "name")
          .lean()
      : [],
    Answer.find({ status: ANSWER_STATUS.APPROVED })
      .limit(20)
      .populate({
        path: "questionId",
        match: { status: { $in: [QUESTION_STATUS.ANSWERED, QUESTION_STATUS.RESOLVED] } },
        select: "title description categoryId",
        populate: { path: "categoryId", select: "name" }
      })
      .populate("answeredBy", "name")
      .lean()
  ]);

  const resultMap = new Map();
  const maxKeyword = keywordFaqs[0]?.score || 1;

  for (const faq of keywordFaqs) {
    resultMap.set(`faq:${faq._id}`, {
      type: "faq",
      _id: faq._id,
      title: faq.title,
      preview: faq.summary,
      category: faq.categories?.[0]?.name,
      href: `/faqs/${faq._id}`,
      keywordScore: Math.min((faq.score || 0) / maxKeyword, 1),
      semanticScore: 0
    });
  }

  if (queryEmbedding) {
    for (const faq of semanticFaqs) {
      if (!faq.embedding || faq.embedding.length !== 384) continue;
      const semanticScore = cosineSimilarity(queryEmbedding, faq.embedding);
      if (semanticScore < 0.25) continue;
      const key = `faq:${faq._id}`;
      const existing = resultMap.get(key);
      resultMap.set(key, {
        ...(existing ?? {
          type: "faq",
          _id: faq._id,
          title: faq.title,
          preview: faq.summary,
          category: faq.categories?.[0]?.name,
          href: `/faqs/${faq._id}`,
          keywordScore: 0
        }),
        semanticScore
      });
    }
  }

  const queryTokens = new Set(query.toLowerCase().split(/\s+/).filter(Boolean));
  for (const answer of answers.filter((item) => item.questionId)) {
    const text = `${answer.questionId.title} ${answer.questionId.description} ${answer.body}`.toLowerCase();
    const overlap = [...queryTokens].filter((token) => text.includes(token)).length / Math.max(queryTokens.size, 1);
    if (overlap < 0.2) continue;
    resultMap.set(`answer:${answer._id}`, {
      type: "answer",
      _id: answer._id,
      title: answer.questionId.title,
      preview: answer.body.slice(0, 220),
      category: answer.questionId.categoryId?.name,
      href: `/community/questions/${answer.questionId._id}`,
      keywordScore: overlap,
      semanticScore: 0
    });
  }

  const results = [...resultMap.values()]
    .map((item) => {
      const confidence = queryEmbedding ? 0.65 * item.semanticScore + 0.35 * item.keywordScore : item.keywordScore;
      return {
        ...stripEmbedding(item),
        confidence: Number(Math.min(confidence, 1).toFixed(3)),
        relevanceLabel: confidence > 0.7 ? "Strong verified match" : confidence < 0.4 ? "Closest available answer" : "Likely match"
      };
    })
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3);

  return {
    query,
    results,
    topConfidence: results[0]?.confidence ?? 0,
    confidenceBand: (results[0]?.confidence ?? 0) > 0.7 ? "strong" : results.every((item) => item.confidence < 0.4) ? "weak" : "medium",
    searchedAt: new Date()
  };
};
