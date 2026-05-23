import { jest } from "@jest/globals";
import mongoose from "mongoose";
import path from "path";
import { MongoMemoryServer } from "mongodb-memory-server";
import User from "../models/User.js";
import Category from "../models/Category.js";
import Tag from "../models/Tag.js";
import Faq from "../models/Faq.js";
import Question from "../models/Question.js";
import Answer from "../models/Answer.js";
import SearchLog from "../models/SearchLog.js";
import { getFaqQuality, getModerationLoad, getOverview, getUnansweredSearches } from "../services/analyticsService.js";
import { generateCategoryNarrative, generateFaqNarrative, generateQueueNarrative } from "../utils/narrativeGenerator.js";

jest.setTimeout(300000);

let mongoServer;

const passwordHash = "SecurePassword123";

const createBase = async () => {
  const admin = await User.create({ name: "Admin", email: "analytics-admin@example.com", passwordHash, role: "admin" });
  const student = await User.create({ name: "Student", email: "analytics-student@example.com", passwordHash, role: "student" });
  const moderator = await User.create({ name: "Moderator", email: "analytics-mod@example.com", passwordHash, role: "moderator" });
  const category = await Category.create({ name: "NOC Analytics" });
  const tag = await Tag.create({ name: "noc-analytics" });

  return { admin, student, moderator, category, tag };
};

beforeAll(async () => {
  process.env.MONGOMS_DOWNLOAD_DIR = path.resolve(process.cwd(), ".mongodb-binaries");
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  await Promise.all([User.init(), Category.init(), Tag.init(), Faq.init(), Question.init(), Answer.init(), SearchLog.init()]);
});

afterEach(async () => {
  await Promise.all([
    User.deleteMany({}),
    Category.deleteMany({}),
    Tag.deleteMany({}),
    Faq.deleteMany({}),
    Question.deleteMany({}),
    Answer.deleteMany({}),
    SearchLog.deleteMany({})
  ]);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe("analytics intelligence service", () => {
  it("returns actionRequired when FAQs have low helpfulness", async () => {
    const { admin, category, tag } = await createBase();
    await Faq.create({
      title: "Low quality FAQ",
      summary: "Low quality FAQ summary",
      answer: "This institutional answer needs revision because students are not finding it useful.",
      categories: [category._id],
      tags: [tag._id],
      status: "published",
      createdBy: admin._id,
      helpfulCount: 2,
      notHelpfulCount: 20,
      viewCount: 220,
      qualityScore: 0.1,
      updatedAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000)
    });

    const overview = await getOverview();

    expect(overview.actionRequired.length).toBeGreaterThanOrEqual(1);
    expect(overview.actionRequired.some((item) => ["STALE_FAQ", "FAQ_REVIEW"].includes(item.type))).toBe(true);
  });

  it("clusters unanswered searches with at least 3 occurrences", async () => {
    const { student, category } = await createBase();
    await Promise.all(
      Array.from({ length: 3 }).map(() =>
        SearchLog.create({
          userId: student._id,
          query: "upload failed",
          normalizedQuery: "upload failed",
          filters: { categoryId: category._id.toString() },
          resultCount: 0
        })
      )
    );

    const result = await getUnansweredSearches({ limit: 20 });

    expect(result.clusters[0].query).toBe("upload failed");
    expect(result.clusters[0].count).toBe(3);
  });

  it("returns FAQ quality sorted by worst qualityScore first", async () => {
    const { admin, category, tag } = await createBase();
    await Faq.create([
      { title: "Better FAQ", summary: "Better", answer: "Better answer", categories: [category._id], tags: [tag._id], status: "published", createdBy: admin._id, qualityScore: 0.8 },
      { title: "Worst FAQ", summary: "Worst", answer: "Worst answer", categories: [category._id], tags: [tag._id], status: "published", createdBy: admin._id, qualityScore: 0.1 }
    ]);

    const result = await getFaqQuality({ limit: 10, sort: "worst" });

    expect(result.faqs[0].title).toBe("Worst FAQ");
  });

  it("returns correct pending moderation count", async () => {
    const { student, category, tag } = await createBase();
    const question = await Question.create({
      title: "Pending answer analytics question",
      description: "A pending answer analytics question with enough detail for tests.",
      categoryId: category._id,
      tags: [tag._id],
      askedBy: student._id
    });
    await Answer.create([
      { questionId: question._id, answeredBy: student._id, body: "Pending answer with enough body for validation.", status: "pending" },
      { questionId: question._id, answeredBy: student._id, body: "Approved answer with enough body for validation.", status: "approved" }
    ]);

    const result = await getModerationLoad({ days: 14 });

    expect(result.pendingAnswers.count).toBe(1);
  });

  it("generates non-empty narrative strings", () => {
    expect(generateCategoryNarrative("NOC", 31, "noc approval delay")).toContain("NOC");
    expect(generateFaqNarrative({ title: "Payment FAQ", helpfulnessRatio: 0.2 }, "rewrite")).toContain("Payment FAQ");
    expect(generateQueueNarrative({ count: 3, avgAgeHours: 12 }, "stable")).toContain("3");
  });
});
