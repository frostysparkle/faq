// Run after seeding with:
// node -e "require('./src/jobs/embeddingBackfillJob').backfillFaqEmbeddings()"

import Faq from "../models/Faq.js";
import Question from "../models/Question.js";
import { generateEmbedding, generateFaqEmbedding } from "../utils/embeddings.js";

const BATCH_SIZE = 5;
const BATCH_DELAY_MS = 100;

const delay = (durationMs) => new Promise((resolve) => setTimeout(resolve, durationMs));

const missingEmbeddingQuery = (processedIds = []) => ({
  _id: { $nin: processedIds },
  $or: [{ embedding: { $exists: false } }, { "embedding.383": { $exists: false } }, { "embedding.384": { $exists: true } }]
});

export const backfillFaqEmbeddings = async () => {
  const baseQuery = missingEmbeddingQuery();
  const total = await Faq.countDocuments(baseQuery);
  const processedIds = [];
  let done = 0;
  let failed = 0;

  while (processedIds.length < total) {
    const batch = await Faq.find(missingEmbeddingQuery(processedIds)).select("+embedding title summary answer").limit(BATCH_SIZE);

    if (batch.length === 0) {
      break;
    }

    for (const faq of batch) {
      processedIds.push(faq._id);

      try {
        const vector = await generateFaqEmbedding(faq);

        if (vector) {
          await Faq.findByIdAndUpdate(faq._id, { embedding: vector });
          done += 1;
        } else {
          failed += 1;
        }
      } catch (error) {
        failed += 1;
        console.warn("[Backfill] FAQ embedding failed:", error.message);
      }

      console.info(`[Backfill] FAQ ${done}/${total} embedded`);
    }

    await delay(BATCH_DELAY_MS);
  }

  return { done, failed, total };
};

export const backfillQuestionEmbeddings = async () => {
  const allowedStatuses = ["open", "answered", "resolved"];
  const baseQuery = {
    ...missingEmbeddingQuery(),
    status: { $in: allowedStatuses }
  };
  const total = await Question.countDocuments(baseQuery);
  const processedIds = [];
  let done = 0;
  let failed = 0;

  while (processedIds.length < total) {
    const batch = await Question.find({
      ...missingEmbeddingQuery(processedIds),
      status: { $in: allowedStatuses }
    })
      .select("+embedding title description")
      .limit(BATCH_SIZE);

    if (batch.length === 0) {
      break;
    }

    for (const question of batch) {
      processedIds.push(question._id);

      try {
        const vector = await generateEmbedding(`${question.title}. ${question.description.slice(0, 500)}`);

        if (vector) {
          await Question.findByIdAndUpdate(question._id, { embedding: vector });
          done += 1;
        } else {
          failed += 1;
        }
      } catch (error) {
        failed += 1;
        console.warn("[Backfill] Question embedding failed:", error.message);
      }

      console.info(`[Backfill] Question ${done}/${total} embedded`);
    }

    await delay(BATCH_DELAY_MS);
  }

  return { done, failed, total };
};
