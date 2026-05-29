import { jest } from "@jest/globals";
import mongoose from "mongoose";
import path from "path";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";

const mockGenerateQueryEmbedding = jest.fn().mockResolvedValue(new Array(384).fill(0.1));

jest.unstable_mockModule("../utils/embeddings.js", () => ({
  generateEmbedding: jest.fn(),
  generateFaqEmbedding: jest.fn(),
  generateQueryEmbedding: mockGenerateQueryEmbedding,
  cosineSimilarity: jest.fn().mockReturnValue(0.8)
}));

jest.setTimeout(300000);

let app;
let mongoServer;
let User;
let Category;
let Tag;
let Question;
let Answer;
let AnalyticsEvent;
let ReviewItem;
let generateTokenPair;

const passwordHash = "SecurePassword123";

const createUserWithToken = async (role, email = `${role}-${new mongoose.Types.ObjectId()}@example.com`) => {
  const user = await User.create({ name: `${role} user`, email, role, passwordHash });
  const tokens = generateTokenPair(user);
  return { user, token: tokens.accessToken };
};

const createFixture = async () => {
  const student = await User.create({ name: "Student", email: `student-${new mongoose.Types.ObjectId()}@example.com`, role: "student", passwordHash });
  const category = await Category.create({ name: `Moderation ${new mongoose.Types.ObjectId()}` });
  const tag = await Tag.create({ name: `moderation-${new mongoose.Types.ObjectId()}` });
  const question = await Question.create({
    title: "Moderation queue question",
    description: "Moderation queue question with enough institutional context for validation.",
    categoryId: category._id,
    tags: [tag._id],
    askedBy: student._id,
    priorityScore: 0.9
  });
  const answer = await Answer.create({
    questionId: question._id,
    answeredBy: student._id,
    body: "This pending answer contains enough detail for moderation testing.",
    status: "pending"
  });

  return { student, category, tag, question, answer };
};

beforeAll(async () => {
  process.env.NODE_ENV = "test";
  process.env.PORT = "5001";
  process.env.JWT_ACCESS_SECRET = "test-access-secret-with-at-least-32-chars";
  process.env.JWT_REFRESH_SECRET = "test-refresh-secret-with-at-least-32-chars";
  process.env.JWT_ACCESS_EXPIRY = "15m";
  process.env.JWT_REFRESH_EXPIRY = "7d";
  process.env.CLIENT_URL = "http://localhost:5173";
  process.env.MONGOMS_DOWNLOAD_DIR = path.resolve(process.cwd(), ".mongodb-binaries");

  mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri();
  await mongoose.connect(process.env.MONGODB_URI);

  ({ default: User } = await import("../models/User.js"));
  ({ default: Category } = await import("../models/Category.js"));
  ({ default: Tag } = await import("../models/Tag.js"));
  ({ default: Question } = await import("../models/Question.js"));
  ({ default: Answer } = await import("../models/Answer.js"));
  ({ default: AnalyticsEvent } = await import("../models/AnalyticsEvent.js"));
  ({ default: ReviewItem } = await import("../models/ReviewItem.js"));
  ({ generateTokenPair } = await import("../services/authService.js"));
  app = (await import("../app.js")).default;
});

afterEach(async () => {
  await Promise.all([
    User.deleteMany({}),
    Category.deleteMany({}),
    Tag.deleteMany({}),
    Question.deleteMany({}),
    Answer.deleteMany({}),
    AnalyticsEvent.deleteMany({}),
    ReviewItem.deleteMany({})
  ]);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe("moderation workflows", () => {
  it("getPendingQueue sorts by priorityScore descending", async () => {
    const { token } = await createUserWithToken("moderator");
    const { student, category, tag } = await createFixture();
    const low = await Question.create({
      title: "Low priority moderation question",
      description: "Low priority moderation question with enough detail.",
      categoryId: category._id,
      tags: [tag._id],
      askedBy: student._id,
      priorityScore: 0.1
    });
    await Answer.create({ questionId: low._id, answeredBy: student._id, body: "Low priority pending answer with enough detail.", status: "pending" });

    const response = await request(app).get("/api/moderation/queue").set("Authorization", `Bearer ${token}`).expect(200);

    expect(response.body.data.items[0].priorityScore).toBeGreaterThan(response.body.data.items.at(-1).priorityScore);
  });

  it("approveAnswer requires moderator role", async () => {
    const { answer } = await createFixture();
    const { token } = await createUserWithToken("student", "student-role@example.com");

    await request(app).patch(`/api/answers/${answer._id}/approve`).set("Authorization", `Bearer ${token}`).send({}).expect(403);
  });

  it("rejectAnswer without reason returns 400", async () => {
    const { answer } = await createFixture();
    const { token } = await createUserWithToken("moderator");

    await request(app).patch(`/api/answers/${answer._id}/reject`).set("Authorization", `Bearer ${token}`).send({}).expect(400);
  });

  it("resolveQuestion logs time-to-resolution AnalyticsEvent", async () => {
    const { question } = await createFixture();
    const { token } = await createUserWithToken("moderator");

    await request(app).patch(`/api/questions/${question._id}/resolve`).set("Authorization", `Bearer ${token}`).expect(200);
    await new Promise((resolve) => setTimeout(resolve, 20));
    const event = await AnalyticsEvent.findOne({ eventType: "QUESTION_RESOLVED", entityId: question._id });

    expect(event.metadata.resolvedAt).toBeTruthy();
  });

  it("recommendFaqConversion creates ReviewItem with correct type", async () => {
    const { answer } = await createFixture();
    const { token } = await createUserWithToken("moderator");

    await request(app).patch(`/api/answers/${answer._id}/recommend-faq`).set("Authorization", `Bearer ${token}`).send({ notes: "Convert this answer." }).expect(200);
    const reviewItem = await ReviewItem.findOne({ entityId: answer._id });

    expect(reviewItem.reviewType).toBe("faq_conversion_candidate");
  });
});
