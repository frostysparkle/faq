import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import User from "../models/User.js";
import Category from "../models/Category.js";
import Tag from "../models/Tag.js";
import Faq from "../models/Faq.js";
import Question from "../models/Question.js";
import Answer from "../models/Answer.js";
import SearchLog from "../models/SearchLog.js";
import FeedbackEvent from "../models/FeedbackEvent.js";
import ReviewItem from "../models/ReviewItem.js";
import AnalyticsEvent from "../models/AnalyticsEvent.js";
import AuditLog from "../models/AuditLog.js";
import { ANALYTICS_EVENTS } from "../constants/analyticsEvents.js";
import { ANSWER_STATUS, FAQ_STATUS, FEEDBACK_ENTITY_TYPE, FEEDBACK_VALUE, QUESTION_STATUS, REVIEW_ENTITY_TYPE, REVIEW_STATUS, REVIEW_TYPE } from "../constants/statuses.js";
import { USER_ROLES } from "../constants/roles.js";
import { faqContent, seedCategories, seedTags } from "./faqContent.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/samagama_navigator";
const now = Date.now();
const daysAgo = (days) => new Date(now - days * 24 * 60 * 60 * 1000);
const pick = (items, index) => items[index % items.length];

const createUsers = async () => {
  const admin = await User.create({ name: "Samagama Admin", email: "admin@samagama.dev", passwordHash: "Admin@1234", role: USER_ROLES.ADMIN });
  const moderators = await User.create(
    Array.from({ length: 3 }).map((_, index) => ({
      name: `Moderator ${index + 1}`,
      email: `mod${index + 1}@samagama.dev`,
      passwordHash: "Mod@1234",
      role: USER_ROLES.MODERATOR
    }))
  );
  const students = await User.create(
    Array.from({ length: 20 }).map((_, index) => ({
      name: `Student ${index + 1}`,
      email: `student${index + 1}@samagama.dev`,
      passwordHash: "Student@1234",
      role: USER_ROLES.STUDENT
    }))
  );

  console.info("✓ Created 1 admin user");
  console.info("✓ Created 3 moderators");
  console.info("✓ Created 20 students");
  return { admin, moderators, students };
};

const createTaxonomy = async () => {
  const categories = await Category.insertMany(seedCategories.map((name, index) => ({ name, description: `${name} policy and support area.`, displayOrder: index })));
  const tags = await Tag.insertMany(seedTags.map((name, index) => ({ name, description: `${name} operational signal.`, displayOrder: index })));

  console.info("✓ Created 6 categories");
  console.info("✓ Created 20+ tags");
  return {
    categories,
    tags,
    categoryMap: new Map(categories.map((category) => [category.name, category])),
    tagMap: new Map(tags.map((tag) => [tag.name, tag]))
  };
};

const createFaqs = async ({ admin, categoryMap, tagMap }) => {
  const faqs = [];

  for (const [index, item] of faqContent.entries()) {
    const faq = await Faq.create({
      title: item.title,
      summary: item.summary.slice(0, 300),
      answer: item.answer,
      categories: [categoryMap.get(item.category)._id],
      tags: item.tags.map((tag) => tagMap.get(tag)?._id).filter(Boolean),
      status: index % 10 === 0 ? FAQ_STATUS.NEEDS_REVIEW : FAQ_STATUS.PUBLISHED,
      sourceType: "manual",
      helpfulCount: item.helpfulCount,
      notHelpfulCount: item.notHelpfulCount,
      viewCount: item.viewCount,
      qualityScore: item.qualityScore,
      reviewState: index % 10 === 0 ? "needs_rewrite" : "none",
      createdBy: admin._id,
      updatedBy: admin._id,
      publishedAt: daysAgo(index % 30),
      lastReviewedAt: daysAgo(index % 90),
      createdAt: item.stale ? daysAgo(150) : daysAgo(index % 40),
      updatedAt: item.stale ? daysAgo(110) : daysAgo(index % 20)
    });
    faqs.push(faq);
  }

  console.info("✓ Created 40 FAQs");
  return faqs;
};

const createQuestions = async ({ students, categories, tags }) => {
  const statuses = [QUESTION_STATUS.OPEN, QUESTION_STATUS.ANSWERED, QUESTION_STATUS.RESOLVED, QUESTION_STATUS.DUPLICATE, QUESTION_STATUS.ARCHIVED];
  const questions = [];

  for (let index = 0; index < 60; index += 1) {
    const status = statuses[index % statuses.length];
    const question = await Question.create({
      title: `${pick(categories, index).name}: help needed for case ${index + 1}`,
      description: `Student ${index + 1} needs guidance on ${pick(categories, index).name.toLowerCase()} and has checked the portal but still needs an official workflow explanation with escalation steps.`,
      categoryId: pick(categories, index)._id,
      tags: [pick(tags, index)._id, pick(tags, index + 3)._id],
      status,
      askedBy: pick(students, index)._id,
      existingAnswerCheck: { checkedAt: daysAgo(index % 10), matchedFaqs: [], matchedQuestions: [] },
      priorityScore: Number(((index % 10) / 10).toFixed(2)),
      viewCount: 5 + index * 2,
      answerCount: status === QUESTION_STATUS.OPEN ? 0 : 1 + (index % 3),
      resolvedAt: status === QUESTION_STATUS.RESOLVED ? daysAgo(index % 7) : undefined,
      createdAt: daysAgo(index % 45),
      updatedAt: daysAgo(index % 15)
    });
    questions.push(question);
  }

  for (let index = 0; index < questions.length; index += 1) {
    if (questions[index].status === QUESTION_STATUS.DUPLICATE) {
      questions[index].duplicateOf = questions[Math.max(0, index - 1)]._id;
      await questions[index].save();
    }
  }

  console.info("✓ Created 60 community questions");
  return questions;
};

const createAnswers = async ({ students, moderators, questions }) => {
  const statuses = [ANSWER_STATUS.PENDING, ANSWER_STATUS.APPROVED, ANSWER_STATUS.REJECTED, ANSWER_STATUS.NEEDS_CHANGES];
  const answers = [];

  for (let index = 0; index < 80; index += 1) {
    const status = statuses[index % statuses.length];
    answers.push(await Answer.create({
      questionId: pick(questions, index)._id,
      body: `This answer explains the official process for the student case, including the correct department, documents to prepare, expected review window, and when escalation is appropriate. It is detailed enough for moderator review and demo workflows.`,
      answeredBy: pick(students, index + 4)._id,
      status,
      moderatorId: status !== ANSWER_STATUS.PENDING ? pick(moderators, index)._id : undefined,
      moderationNote: status === ANSWER_STATUS.REJECTED ? "Needs a clearer official source." : "",
      helpfulCount: index % 5,
      notHelpfulCount: index % 4,
      approvedAt: status === ANSWER_STATUS.APPROVED ? daysAgo(index % 6) : undefined,
      eligibleForFaqConversion: index % 9 === 0,
      createdAt: daysAgo(index % 30),
      updatedAt: daysAgo(index % 12)
    }));
  }

  console.info("✓ Created 80 answers");
  return answers;
};

const createSearchLogs = async ({ students, faqs, questions, categories }) => {
  const recurringGaps = ["upload failed", "noc approval delay", "stipend not credited", "deadline extension", "portal login issue"];
  const logs = [];

  for (let index = 0; index < 200; index += 1) {
    const noResult = index % 4 === 0;
    const query = noResult ? pick(recurringGaps, index) : pick(faqs, index).title.toLowerCase();
    logs.push(await SearchLog.create({
      userId: pick(students, index)._id,
      query,
      normalizedQuery: query,
      filters: { categoryId: pick(categories, index)._id.toString() },
      resultCount: noResult ? 0 : 3 + (index % 8),
      clickedFaqId: noResult ? undefined : pick(faqs, index)._id,
      ledToQuestionId: index % 12 === 0 ? pick(questions, index)._id : undefined,
      createdAt: daysAgo(index % 30),
      updatedAt: daysAgo(index % 30)
    }));
  }

  console.info("✓ Created 200 search logs");
  return logs;
};

const createFeedback = async ({ students, faqs, answers }) => {
  const events = [];

  for (let index = 0; index < 100; index += 1) {
    const faqFeedback = index < 70;
    const targetFaq = faqs[(index + Math.floor(index / 20) * 7) % faqs.length];
    events.push(await FeedbackEvent.create({
      userId: pick(students, index)._id,
      entityType: faqFeedback ? FEEDBACK_ENTITY_TYPE.FAQ : FEEDBACK_ENTITY_TYPE.ANSWER,
      entityId: faqFeedback ? targetFaq._id : pick(answers, index)._id,
      value: index % 6 === 0 ? FEEDBACK_VALUE.NOT_HELPFUL : FEEDBACK_VALUE.HELPFUL,
      createdAt: daysAgo(index % 28),
      updatedAt: daysAgo(index % 28)
    }));
  }

  console.info("✓ Created 100 feedback events");
  return events;
};

const createReviewItems = async ({ admin, moderators, faqs, questions, answers }) => {
  const types = Object.values(REVIEW_TYPE);
  const statuses = Object.values(REVIEW_STATUS);

  for (let index = 0; index < 30; index += 1) {
    const entityType = index % 3 === 0 ? REVIEW_ENTITY_TYPE.FAQ : index % 3 === 1 ? REVIEW_ENTITY_TYPE.QUESTION : REVIEW_ENTITY_TYPE.ANSWER;
    const entity = entityType === REVIEW_ENTITY_TYPE.FAQ ? pick(faqs, index) : entityType === REVIEW_ENTITY_TYPE.QUESTION ? pick(questions, index) : pick(answers, index);
    await ReviewItem.create({
      entityType,
      entityId: entity._id,
      reviewType: pick(types, index),
      status: pick(statuses, index),
      createdBy: index % 2 === 0 ? admin._id : pick(moderators, index)._id,
      assignedTo: pick(moderators, index + 1)._id,
      notes: `Demo review item ${index + 1} with operational context.`,
      createdAt: daysAgo(index % 25),
      updatedAt: daysAgo(index % 10)
    });
  }

  console.info("✓ Created 30 review items");
};

const createAnalyticsAndAudit = async ({ admin, moderators, students, faqs, questions, answers }) => {
  const eventTypes = Object.values(ANALYTICS_EVENTS);

  for (let index = 0; index < 50; index += 1) {
    await AnalyticsEvent.create({
      actorId: pick([...students, ...moderators], index)._id,
      eventType: pick(eventTypes, index),
      entityType: index % 2 === 0 ? "faq" : "question",
      entityId: index % 2 === 0 ? pick(faqs, index)._id : pick(questions, index)._id,
      metadata: { demo: true, answerId: pick(answers, index)._id },
      createdAt: daysAgo(index % 21),
      updatedAt: daysAgo(index % 21)
    });
  }

  for (let index = 0; index < 20; index += 1) {
    await AuditLog.create({
      actorId: index % 2 === 0 ? admin._id : pick(moderators, index)._id,
      action: index % 2 === 0 ? "FAQ_UPDATED" : "ANSWER_APPROVED",
      entityType: index % 2 === 0 ? "faq" : "answer",
      entityId: index % 2 === 0 ? pick(faqs, index)._id : pick(answers, index)._id,
      before: { status: "before" },
      after: { status: "after" },
      createdAt: daysAgo(index % 18),
      updatedAt: daysAgo(index % 18)
    });
  }

  console.info("✓ Created 50 analytics events");
  console.info("✓ Created 20 audit logs");
};

export const seedDatabase = async () => {
  if (await User.exists({ email: "admin@samagama.dev" })) {
    console.info("Already seeded.");
    return;
  }

  const users = await createUsers();
  const taxonomy = await createTaxonomy();
  const faqs = await createFaqs({ admin: users.admin, ...taxonomy });
  const questions = await createQuestions({ students: users.students, categories: taxonomy.categories, tags: taxonomy.tags });
  const answers = await createAnswers({ students: users.students, moderators: users.moderators, questions });
  await createSearchLogs({ students: users.students, faqs, questions, categories: taxonomy.categories });
  await createFeedback({ students: users.students, faqs, answers });
  await createReviewItems({ ...users, faqs, questions, answers });
  await createAnalyticsAndAudit({ ...users, faqs, questions, answers });
};

export const resetDatabase = async () => {
  await mongoose.connection.dropDatabase();
  console.info("✓ Dropped database");
  await seedDatabase();
};

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  await mongoose.connect(MONGODB_URI);
  try {
    await seedDatabase();
  } finally {
    await mongoose.disconnect();
  }
}
