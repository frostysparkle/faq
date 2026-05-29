import { jest } from "@jest/globals";
import mongoose from "mongoose";
import path from "path";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";

const mockGenerateEmbedding = jest.fn().mockResolvedValue(new Array(384).fill(0.1));
const mockGenerateFaqEmbedding = jest.fn().mockResolvedValue(new Array(384).fill(0.1));
const mockGenerateQueryEmbedding = jest.fn().mockResolvedValue(new Array(384).fill(0.1));
const mockCosineSimilarity = jest.fn().mockReturnValue(0.85);

jest.unstable_mockModule("../utils/embeddings.js", () => ({
  generateEmbedding: mockGenerateEmbedding,
  generateFaqEmbedding: mockGenerateFaqEmbedding,
  generateQueryEmbedding: mockGenerateQueryEmbedding,
  cosineSimilarity: mockCosineSimilarity
}));

jest.setTimeout(300000);

let app;
let mongoServer;
let User;
let Category;
let Tag;
let Faq;
let SearchLog;
let FeedbackEvent;
let AnalyticsEvent;
let AuditLog;
let generateTokenPair;

const password = "SecurePassword123";

const vector = (value) => new Array(384).fill(value);

const createUserWithToken = async (role, email = `${role}@example.com`) => {
  const user = await User.create({
    name: `${role} user`,
    email,
    role,
    passwordHash: password
  });
  const tokens = generateTokenPair(user);

  return { user, token: tokens.accessToken };
};

const createTaxonomy = async () => {
  const category = await Category.create({ name: `Category ${new mongoose.Types.ObjectId()}` });
  const tag = await Tag.create({ name: `Tag ${new mongoose.Types.ObjectId()}` });

  return { category, tag };
};

const createFaqFixture = async ({ adminId, category, tag, title, answer, status = "published", embedding = vector(0.85), ...overrides }) =>
  Faq.create({
    title,
    answer,
    summary: overrides.summary ?? `${title} summary`,
    categories: [category._id],
    tags: [tag._id],
    status,
    createdBy: adminId,
    embedding,
    helpfulCount: overrides.helpfulCount ?? 0,
    notHelpfulCount: overrides.notHelpfulCount ?? 0,
    viewCount: overrides.viewCount ?? 0,
    qualityScore: overrides.qualityScore ?? 0
  });

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
  ({ default: Faq } = await import("../models/Faq.js"));
  ({ default: SearchLog } = await import("../models/SearchLog.js"));
  ({ default: FeedbackEvent } = await import("../models/FeedbackEvent.js"));
  ({ default: AnalyticsEvent } = await import("../models/AnalyticsEvent.js"));
  ({ default: AuditLog } = await import("../models/AuditLog.js"));
  ({ generateTokenPair } = await import("../services/authService.js"));

  await Promise.all([User.init(), Category.init(), Tag.init(), Faq.init(), SearchLog.init(), FeedbackEvent.init()]);

  const appModule = await import("../app.js");
  app = appModule.default;
});

beforeEach(() => {
  mockGenerateEmbedding.mockResolvedValue(new Array(384).fill(0.1));
  mockGenerateFaqEmbedding.mockResolvedValue(new Array(384).fill(0.1));
  mockGenerateQueryEmbedding.mockResolvedValue(new Array(384).fill(0.1));
  mockCosineSimilarity.mockReturnValue(0.85);
});

afterEach(async () => {
  jest.clearAllMocks();
  if (!User) {
    return;
  }

  await Promise.all([
    User.deleteMany({}),
    Category.deleteMany({}),
    Tag.deleteMany({}),
    Faq.deleteMany({}),
    SearchLog.deleteMany({}),
    FeedbackEvent.deleteMany({}),
    AnalyticsEvent.deleteMany({}),
    AuditLog.deleteMany({})
  ]);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

describe("FAQ backend", () => {
  it("creates a FAQ as admin and returns no embedding field", async () => {
    const { user: admin, token } = await createUserWithToken("admin");
    const { category, tag } = await createTaxonomy();

    const response = await request(app)
      .post("/api/faqs")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "Housing application deadline",
        answer: "Students should submit the housing application before the published institutional deadline.",
        summary: "Housing application deadline",
        categories: [category._id.toString()],
        tags: [tag._id.toString()]
      })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.createdBy).toBe(admin._id.toString());
    expect(response.body.data.embedding).toBeUndefined();
  });

  it("returns 403 when a student creates a FAQ", async () => {
    const { token } = await createUserWithToken("student");
    const { category, tag } = await createTaxonomy();

    const response = await request(app)
      .post("/api/faqs")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "Student attempt",
        answer: "This answer is long enough to pass the API validation rule.",
        summary: "Student attempt summary",
        categories: [category._id.toString()],
        tags: [tag._id.toString()]
      })
      .expect(403);

    expect(response.body.error.code).toBe("FORBIDDEN");
  });

  it("triggers embedding regeneration when the title changes", async () => {
    const { user: admin, token } = await createUserWithToken("admin");
    const { category, tag } = await createTaxonomy();
    const faq = await createFaqFixture({
      adminId: admin._id,
      category,
      tag,
      title: "Original scholarship policy",
      answer: "Scholarship answers are reviewed by institutional moderators before publication."
    });
    jest.clearAllMocks();

    await request(app)
      .patch(`/api/faqs/${faq._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Updated scholarship policy" })
      .expect(200);

    expect(mockGenerateFaqEmbedding).toHaveBeenCalledTimes(1);
  });

  it("does not regenerate embedding when content is unchanged", async () => {
    const { user: admin, token } = await createUserWithToken("admin");
    const { category, tag } = await createTaxonomy();
    const faq = await createFaqFixture({
      adminId: admin._id,
      category,
      tag,
      title: "Transport policy",
      answer: "Transport routes are published for each semester after operational review."
    });
    jest.clearAllMocks();

    await request(app)
      .patch(`/api/faqs/${faq._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ reviewState: "needs_rewrite" })
      .expect(200);

    expect(mockGenerateFaqEmbedding).not.toHaveBeenCalled();
  });

  it("calls generateQueryEmbedding and returns hybrid results for query search", async () => {
    const { user: admin } = await createUserWithToken("admin", "admin-search@example.com");
    const { token } = await createUserWithToken("student", "student-search@example.com");
    const { category, tag } = await createTaxonomy();
    await createFaqFixture({
      adminId: admin._id,
      category,
      tag,
      title: "Library renewal policy",
      answer: "Library books can be renewed online through the student services portal."
    });

    const response = await request(app)
      .get("/api/faqs")
      .query({ query: "library renewal" })
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(mockGenerateQueryEmbedding).toHaveBeenCalledWith("library renewal");
    expect(response.body.data.searchMode).toBe("hybrid");
    expect(response.body.data.faqs).toHaveLength(1);
  });

  it("skips embedding generation for filter-only search", async () => {
    const { user: admin } = await createUserWithToken("admin", "admin-filter@example.com");
    const { token } = await createUserWithToken("student", "student-filter@example.com");
    const { category, tag } = await createTaxonomy();
    await createFaqFixture({
      adminId: admin._id,
      category,
      tag,
      title: "Cafeteria hours",
      answer: "Cafeteria operating hours are updated at the beginning of every term.",
      qualityScore: 0.8
    });
    jest.clearAllMocks();

    const response = await request(app)
      .get("/api/faqs")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(mockGenerateQueryEmbedding).not.toHaveBeenCalled();
    expect(response.body.data.searchMode).toBe("filter");
    expect(response.body.data.faqs).toHaveLength(1);
  });

  it("falls back to keyword-only search when query embedding returns null", async () => {
    const { user: admin } = await createUserWithToken("admin", "admin-keyword@example.com");
    const { token } = await createUserWithToken("student", "student-keyword@example.com");
    const { category, tag } = await createTaxonomy();
    mockGenerateQueryEmbedding.mockResolvedValueOnce(null);
    await createFaqFixture({
      adminId: admin._id,
      category,
      tag,
      title: "Housing contract renewal",
      answer: "Housing contract renewal is completed through the residential portal."
    });

    const response = await request(app)
      .get("/api/faqs")
      .query({ query: "housing renewal" })
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body.data.searchMode).toBe("keyword_only");
    expect(response.body.data.faqs).toHaveLength(1);
  });

  it("never returns embedding fields in search results", async () => {
    const { user: admin } = await createUserWithToken("admin", "admin-clean@example.com");
    const { token } = await createUserWithToken("student", "student-clean@example.com");
    const { category, tag } = await createTaxonomy();
    await createFaqFixture({
      adminId: admin._id,
      category,
      tag,
      title: "Exam schedule",
      answer: "Exam schedules are published through the academic office portal."
    });

    const response = await request(app)
      .get("/api/faqs")
      .query({ query: "exam schedule" })
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body.data.faqs.every((faq) => faq.embedding === undefined)).toBe(true);
  });

  it("deduplicates merged keyword and semantic results by _id", async () => {
    const { user: admin } = await createUserWithToken("admin", "admin-dedupe@example.com");
    const { token } = await createUserWithToken("student", "student-dedupe@example.com");
    const { category, tag } = await createTaxonomy();
    await createFaqFixture({
      adminId: admin._id,
      category,
      tag,
      title: "Library card replacement",
      answer: "Library card replacement requests are submitted to library services."
    });

    const response = await request(app)
      .get("/api/faqs")
      .query({ query: "library replacement" })
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    const ids = response.body.data.faqs.map((faq) => faq._id);

    expect(ids).toHaveLength(new Set(ids).size);
  });

  it("ranks higher semantic and keyword scores first", async () => {
    const { user: admin } = await createUserWithToken("admin", "admin-rank@example.com");
    const { token } = await createUserWithToken("student", "student-rank@example.com");
    const { category, tag } = await createTaxonomy();
    mockCosineSimilarity.mockImplementation((_queryEmbedding, embedding) => embedding[0]);
    await createFaqFixture({
      adminId: admin._id,
      category,
      tag,
      title: "Scholarship renewal deadline",
      answer: "Scholarship renewal deadline information is available in the finance office portal.",
      embedding: vector(0.95)
    });
    await createFaqFixture({
      adminId: admin._id,
      category,
      tag,
      title: "Scholarship renewal document",
      answer: "Scholarship renewal document requirements are available in the finance office portal.",
      embedding: vector(0.31)
    });

    const response = await request(app)
      .get("/api/faqs")
      .query({ query: "scholarship renewal" })
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body.data.faqs[0].title).toBe("Scholarship renewal deadline");
    expect(response.body.data.faqs[0].finalScore).toBeGreaterThan(response.body.data.faqs[1].finalScore);
  });

  it("logs SearchLog with resultCount 0 when search has no results", async () => {
    const { token } = await createUserWithToken("student", "student-gap@example.com");

    await request(app)
      .get("/api/faqs")
      .query({ query: "no matching institutional content" })
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    await new Promise((resolve) => setTimeout(resolve, 20));

    const log = await SearchLog.findOne({ normalizedQuery: "no matching institutional content" });
    expect(log.resultCount).toBe(0);
  });

  it("never returns draft FAQs to student search results", async () => {
    const { user: admin } = await createUserWithToken("admin", "admin-draft@example.com");
    const { token } = await createUserWithToken("student", "student-draft@example.com");
    const { category, tag } = await createTaxonomy();
    await createFaqFixture({
      adminId: admin._id,
      category,
      tag,
      title: "Draft visa guidance",
      answer: "Draft guidance should not be visible to students before publication.",
      status: "draft"
    });

    const response = await request(app)
      .get("/api/faqs")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body.data.faqs).toHaveLength(0);
  });

  it("returns getFaqById without embedding", async () => {
    const { user: admin } = await createUserWithToken("admin", "admin-get@example.com");
    const { token } = await createUserWithToken("student", "student-get@example.com");
    const { category, tag } = await createTaxonomy();
    const faq = await createFaqFixture({
      adminId: admin._id,
      category,
      tag,
      title: "Transcript request",
      answer: "Transcript requests are processed through the registrar office."
    });

    const response = await request(app)
      .get(`/api/faqs/${faq._id}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body.data.faq.embedding).toBeUndefined();
  });

  it("increments viewCount atomically when getFaqById is called", async () => {
    const { user: admin } = await createUserWithToken("admin", "admin-view@example.com");
    const { token } = await createUserWithToken("student", "student-view@example.com");
    const { category, tag } = await createTaxonomy();
    const faq = await createFaqFixture({
      adminId: admin._id,
      category,
      tag,
      title: "Mentor allocation",
      answer: "Mentor allocation happens after department enrollment is confirmed.",
      viewCount: 2
    });

    await request(app).get(`/api/faqs/${faq._id}`).set("Authorization", `Bearer ${token}`).expect(200);

    const updated = await Faq.findById(faq._id);
    expect(updated.viewCount).toBe(3);
  });

  it("increments count on first feedback vote", async () => {
    const { user: admin } = await createUserWithToken("admin", "admin-feedback@example.com");
    const { token } = await createUserWithToken("student", "student-feedback@example.com");
    const { category, tag } = await createTaxonomy();
    const faq = await createFaqFixture({
      adminId: admin._id,
      category,
      tag,
      title: "Hostel maintenance",
      answer: "Hostel maintenance issues are reported through the facilities desk."
    });

    const response = await request(app)
      .post(`/api/faqs/${faq._id}/feedback`)
      .set("Authorization", `Bearer ${token}`)
      .send({ value: "helpful" })
      .expect(200);

    expect(response.body.data.helpfulCount).toBe(1);
    expect(response.body.data.notHelpfulCount).toBe(0);
  });

  it("moves count when feedback vote changes", async () => {
    const { user: admin } = await createUserWithToken("admin", "admin-change@example.com");
    const { token } = await createUserWithToken("student", "student-change@example.com");
    const { category, tag } = await createTaxonomy();
    const faq = await createFaqFixture({
      adminId: admin._id,
      category,
      tag,
      title: "Fee refund",
      answer: "Fee refund requests are reviewed by finance before approval."
    });

    await request(app).post(`/api/faqs/${faq._id}/feedback`).set("Authorization", `Bearer ${token}`).send({ value: "helpful" });
    const response = await request(app)
      .post(`/api/faqs/${faq._id}/feedback`)
      .set("Authorization", `Bearer ${token}`)
      .send({ value: "not_helpful" })
      .expect(200);

    expect(response.body.data.helpfulCount).toBe(0);
    expect(response.body.data.notHelpfulCount).toBe(1);
  });

  it("does not double count the same feedback value", async () => {
    const { user: admin } = await createUserWithToken("admin", "admin-same@example.com");
    const { token } = await createUserWithToken("student", "student-same@example.com");
    const { category, tag } = await createTaxonomy();
    const faq = await createFaqFixture({
      adminId: admin._id,
      category,
      tag,
      title: "Course withdrawal",
      answer: "Course withdrawal requests must be submitted before the academic deadline."
    });

    await request(app).post(`/api/faqs/${faq._id}/feedback`).set("Authorization", `Bearer ${token}`).send({ value: "helpful" });
    const response = await request(app)
      .post(`/api/faqs/${faq._id}/feedback`)
      .set("Authorization", `Bearer ${token}`)
      .send({ value: "helpful" })
      .expect(200);

    expect(response.body.data.helpfulCount).toBe(1);
    expect(response.body.data.notHelpfulCount).toBe(0);
  });

  it("returns similarity results above threshold sorted by finalSimilarity", async () => {
    const { user: admin, token } = await createUserWithToken("admin", "admin-sim@example.com");
    const { category, tag } = await createTaxonomy();
    mockCosineSimilarity.mockReturnValueOnce(0.8).mockReturnValueOnce(0.6);
    await createFaqFixture({
      adminId: admin._id,
      category,
      tag,
      title: "Parking permit renewal",
      answer: "Parking permit renewal is completed through campus security.",
      embedding: vector(0.8)
    });
    await createFaqFixture({
      adminId: admin._id,
      category,
      tag,
      title: "Parking permit payment",
      answer: "Parking permit payment is completed through campus security.",
      embedding: vector(0.6)
    });

    const response = await request(app)
      .post("/api/faqs/check-similar")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "Parking permit renewal",
        answer: "How do students renew a parking permit?",
        categories: [category._id.toString()],
        tags: [tag._id.toString()]
      })
      .expect(200);

    expect(response.body.data.length).toBeGreaterThan(0);
    expect(response.body.data[0].finalSimilarity).toBeGreaterThanOrEqual(response.body.data.at(-1).finalSimilarity);
    expect(response.body.data.every((item) => item.finalSimilarity >= 0.3)).toBe(true);
  });

  it("uses keyword-only similarity when embedding generation returns null", async () => {
    const { user: admin, token } = await createUserWithToken("admin", "admin-keysim@example.com");
    const { category, tag } = await createTaxonomy();
    mockGenerateQueryEmbedding.mockResolvedValueOnce(null);
    await createFaqFixture({
      adminId: admin._id,
      category,
      tag,
      title: "Health insurance renewal",
      answer: "Health insurance renewal documents are collected by student services."
    });

    const response = await request(app)
      .post("/api/faqs/check-similar")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "Health insurance renewal",
        answer: "Health insurance renewal documents are needed.",
        categories: [category._id.toString()],
        tags: [tag._id.toString()]
      })
      .expect(200);

    expect(response.body.data[0].semanticScore).toBe(0);
    expect(response.body.data[0].keywordScore).toBeGreaterThan(0);
  });

  it("allows draft to published status transition and sets publishedAt", async () => {
    const { user: admin, token } = await createUserWithToken("admin", "admin-publish@example.com");
    const { category, tag } = await createTaxonomy();
    const faq = await createFaqFixture({
      adminId: admin._id,
      category,
      tag,
      status: "draft",
      title: "Draft graduation audit",
      answer: "Graduation audit drafts are checked before official publication."
    });

    const response = await request(app)
      .patch(`/api/faqs/${faq._id}/status`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "published" })
      .expect(200);

    expect(response.body.data.status).toBe("published");
    expect(response.body.data.publishedAt).toBeTruthy();
  });

  it("rejects invalid published to draft transition", async () => {
    const { user: admin, token } = await createUserWithToken("admin", "admin-invalid@example.com");
    const { category, tag } = await createTaxonomy();
    const faq = await createFaqFixture({
      adminId: admin._id,
      category,
      tag,
      title: "Published placement policy",
      answer: "Placement policy is published after approval by institutional leadership."
    });

    const response = await request(app)
      .patch(`/api/faqs/${faq._id}/status`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "draft" })
      .expect(400);

    expect(response.body.error.code).toBe("INVALID_TRANSITION");
  });
});
