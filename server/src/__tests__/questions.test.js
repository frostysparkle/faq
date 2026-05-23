import { jest } from "@jest/globals";
import mongoose from "mongoose";
import path from "path";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";

const mockGenerateQueryEmbedding = jest.fn().mockResolvedValue(new Array(384).fill(0.1));
const mockGenerateEmbedding = jest.fn().mockResolvedValue(new Array(384).fill(0.1));
const mockGenerateFaqEmbedding = jest.fn().mockResolvedValue(new Array(384).fill(0.1));
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
let Question;
let Answer;
let AnalyticsEvent;
let AuditLog;
let SearchLog;
let ReviewItem;
let generateTokenPair;
let updatePriorityScores;

const password = "SecurePassword123";
const vector = (value) => new Array(384).fill(value);

const createUserWithToken = async (role, email = `${role}-${new mongoose.Types.ObjectId()}@example.com`) => {
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

const validCheck = (overrides = {}) => ({
  checkedAt: new Date().toISOString(),
  matchedFaqs: [],
  matchedQuestions: [],
  ...overrides
});

const createPublishedFaq = async ({ adminId, category, tag, title, summary, answer, embedding = vector(0.85) }) =>
  Faq.create({
    title,
    summary: summary ?? `${title} summary`,
    answer,
    categories: [category._id],
    tags: [tag._id],
    status: "published",
    createdBy: adminId,
    embedding
  });

const createQuestionFixture = async ({
  askerId,
  category,
  tag,
  title,
  description,
  status = "open",
  embedding = vector(0.85),
  priorityScore = 0,
  createdAt
}) =>
  Question.create({
    title,
    description,
    categoryId: category._id,
    tags: tag ? [tag._id] : [],
    askedBy: askerId,
    status,
    embedding,
    priorityScore,
    existingAnswerCheck: validCheck(),
    ...(createdAt ? { createdAt, updatedAt: createdAt } : {})
  });

const createAnswerFixture = async ({ questionId, answeredBy, body = "This is a complete answer that satisfies validation.", status = "pending" }) =>
  Answer.create({
    questionId,
    answeredBy,
    body,
    status
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
  ({ default: Question } = await import("../models/Question.js"));
  ({ default: Answer } = await import("../models/Answer.js"));
  ({ default: AnalyticsEvent } = await import("../models/AnalyticsEvent.js"));
  ({ default: AuditLog } = await import("../models/AuditLog.js"));
  ({ default: SearchLog } = await import("../models/SearchLog.js"));
  ({ default: ReviewItem } = await import("../models/ReviewItem.js"));
  ({ generateTokenPair } = await import("../services/authService.js"));
  ({ updatePriorityScores } = await import("../services/questionService.js"));

  await Promise.all([
    User.init(),
    Category.init(),
    Tag.init(),
    Faq.init(),
    Question.init(),
    Answer.init(),
    AnalyticsEvent.init(),
    AuditLog.init(),
    SearchLog.init(),
    ReviewItem.init()
  ]);

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
    Question.deleteMany({}),
    Answer.deleteMany({}),
    AnalyticsEvent.deleteMany({}),
    AuditLog.deleteMany({}),
    SearchLog.deleteMany({}),
    ReviewItem.deleteMany({})
  ]);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

describe("Community Q&A backend", () => {
  it("calls generateQueryEmbedding with the query string during existing answer checks", async () => {
    const { token } = await createUserWithToken("student");

    await request(app)
      .post("/api/questions/check-existing")
      .set("Authorization", `Bearer ${token}`)
      .send({ query: "salary not received" })
      .expect(200);

    expect(mockGenerateQueryEmbedding).toHaveBeenCalledWith("salary not received");
  });

  it("searches both FAQs and resolved Questions during existing answer checks", async () => {
    const { user: admin } = await createUserWithToken("admin");
    const { user: student, token } = await createUserWithToken("student");
    const { category, tag } = await createTaxonomy();
    await createPublishedFaq({
      adminId: admin._id,
      category,
      tag,
      title: "Stipend disbursement delay",
      summary: "Stipend disbursement delays and finance office escalation.",
      answer: "Students should contact finance when stipend disbursement is delayed."
    });
    await createQuestionFixture({
      askerId: student._id,
      category,
      tag,
      title: "Resolved scholarship payment issue",
      description: "A resolved question about scholarship payment and stipend delay handling.",
      status: "resolved"
    });

    const response = await request(app)
      .post("/api/questions/check-existing")
      .set("Authorization", `Bearer ${token}`)
      .send({ query: "salary not received", categoryId: category._id.toString(), tags: [tag._id.toString()] })
      .expect(200);
    const types = response.body.data.matches.map((match) => match.type);

    expect(types).toEqual(expect.arrayContaining(["faq", "question"]));
  });

  it("falls back to keyword-only checks when generateQueryEmbedding returns null", async () => {
    const { user: admin } = await createUserWithToken("admin");
    const { token } = await createUserWithToken("student");
    const { category, tag } = await createTaxonomy();
    mockGenerateQueryEmbedding.mockResolvedValueOnce(null);
    await createPublishedFaq({
      adminId: admin._id,
      category,
      tag,
      title: "Transport reimbursement deadline",
      answer: "Transport reimbursement deadline requests are handled by finance.",
      summary: "Transport reimbursement deadline"
    });

    const response = await request(app)
      .post("/api/questions/check-existing")
      .set("Authorization", `Bearer ${token}`)
      .send({ query: "transport reimbursement deadline" })
      .expect(200);

    expect(response.body.data.searchMode).toBe("keyword_only");
    expect(response.body.data.matches).toHaveLength(1);
  });

  it("deduplicates results across keyword and semantic FAQ/question sources", async () => {
    const { user: admin } = await createUserWithToken("admin");
    const { user: student, token } = await createUserWithToken("student");
    const { category, tag } = await createTaxonomy();
    await createPublishedFaq({
      adminId: admin._id,
      category,
      tag,
      title: "Library renewal process",
      answer: "Library renewal process requests are completed through the library portal.",
      summary: "Library renewal process"
    });
    await createQuestionFixture({
      askerId: student._id,
      category,
      tag,
      title: "Resolved library renewal question",
      description: "Resolved library renewal question with process details for students.",
      status: "resolved"
    });

    const response = await request(app)
      .post("/api/questions/check-existing")
      .set("Authorization", `Bearer ${token}`)
      .send({ query: "library renewal process" })
      .expect(200);
    const keys = response.body.data.matches.map((match) => `${match.type}:${match._id}`);

    expect(keys).toHaveLength(new Set(keys).size);
    expect(keys).toHaveLength(2);
  });

  it("filters out results below the 0.40 finalScore threshold", async () => {
    const { user: admin } = await createUserWithToken("admin");
    const { token } = await createUserWithToken("student");
    const { category, tag } = await createTaxonomy();
    mockCosineSimilarity.mockReturnValue(0.31);
    await createPublishedFaq({
      adminId: admin._id,
      category,
      tag,
      title: "Unrelated dining hours",
      answer: "Dining hours are published by campus operations every semester.",
      summary: "Dining hours"
    });

    const response = await request(app)
      .post("/api/questions/check-existing")
      .set("Authorization", `Bearer ${token}`)
      .send({ query: "visa document attestation" })
      .expect(200);

    expect(response.body.data.matches).toHaveLength(0);
  });

  it("applies 0.65 semantic and 0.35 keyword weighting when embeddings succeed", async () => {
    const { user: admin } = await createUserWithToken("admin");
    const { token } = await createUserWithToken("student");
    const { category, tag } = await createTaxonomy();
    mockCosineSimilarity.mockReturnValue(0.8);
    await createPublishedFaq({
      adminId: admin._id,
      category,
      tag,
      title: "Scholarship renewal deadline",
      answer: "Scholarship renewal deadline requests are reviewed by the finance office.",
      summary: "Scholarship renewal deadline"
    });

    const response = await request(app)
      .post("/api/questions/check-existing")
      .set("Authorization", `Bearer ${token}`)
      .send({ query: "scholarship renewal deadline" })
      .expect(200);

    expect(response.body.data.matches[0].finalScore).toBeCloseTo(0.65 * 0.8 + 0.35 * 1, 4);
  });

  it("returns at most 8 existing-answer matches", async () => {
    const { user: admin } = await createUserWithToken("admin");
    const { token } = await createUserWithToken("student");
    const { category, tag } = await createTaxonomy();

    await Promise.all(
      Array.from({ length: 10 }).map((_, index) =>
        createPublishedFaq({
          adminId: admin._id,
          category,
          tag,
          title: `Policy renewal item ${index}`,
          answer: `Policy renewal item ${index} has a complete institutional answer for students.`,
          summary: `Policy renewal item ${index}`
        })
      )
    );

    const response = await request(app)
      .post("/api/questions/check-existing")
      .set("Authorization", `Bearer ${token}`)
      .send({ query: "policy renewal" })
      .expect(200);

    expect(response.body.data.matches).toHaveLength(8);
  });

  it("never returns embedding fields in existing-answer matches", async () => {
    const { user: admin } = await createUserWithToken("admin");
    const { token } = await createUserWithToken("student");
    const { category, tag } = await createTaxonomy();
    await createPublishedFaq({
      adminId: admin._id,
      category,
      tag,
      title: "Exam timetable change",
      answer: "Exam timetable change requests are reviewed by academic operations.",
      summary: "Exam timetable change"
    });

    const response = await request(app)
      .post("/api/questions/check-existing")
      .set("Authorization", `Bearer ${token}`)
      .send({ query: "exam timetable change" })
      .expect(200);

    expect(response.body.data.matches.every((match) => match.embedding === undefined)).toBe(true);
  });

  it("rejects question creation without an existingAnswerCheck", async () => {
    const { token } = await createUserWithToken("student");
    const { category, tag } = await createTaxonomy();

    const response = await request(app)
      .post("/api/questions")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "How do I submit scholarship documents?",
        description: "I need to understand where scholarship documents should be submitted.",
        categoryId: category._id.toString(),
        tags: [tag._id.toString()]
      })
      .expect(400);

    expect(response.body.error.code).toBe("EXISTING_CHECK_REQUIRED");
  });

  it("rejects question creation with an expired existingAnswerCheck", async () => {
    const { token } = await createUserWithToken("student");
    const { category, tag } = await createTaxonomy();
    const expiredAt = new Date(Date.now() - 11 * 60 * 1000).toISOString();

    const response = await request(app)
      .post("/api/questions")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "How do I submit scholarship documents?",
        description: "I need to understand where scholarship documents should be submitted.",
        categoryId: category._id.toString(),
        tags: [tag._id.toString()],
        existingAnswerCheck: validCheck({ checkedAt: expiredAt })
      })
      .expect(400);

    expect(response.body.error.code).toBe("CHECK_EXPIRED");
  });

  it("creates a question with status=open when the existingAnswerCheck is fresh", async () => {
    const { token } = await createUserWithToken("student");
    const { category, tag } = await createTaxonomy();

    const response = await request(app)
      .post("/api/questions")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "How do I submit scholarship documents?",
        description: "I need to understand where scholarship documents should be submitted.",
        categoryId: category._id.toString(),
        tags: [tag._id.toString()],
        existingAnswerCheck: validCheck()
      })
      .expect(201);

    expect(response.body.data.status).toBe("open");
  });

  it("triggers async question embedding generation after creation", async () => {
    const { token } = await createUserWithToken("student");
    const { category, tag } = await createTaxonomy();
    jest.clearAllMocks();

    await request(app)
      .post("/api/questions")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "How do I submit scholarship documents?",
        description: "I need to understand where scholarship documents should be submitted.",
        categoryId: category._id.toString(),
        tags: [tag._id.toString()],
        existingAnswerCheck: validCheck()
      })
      .expect(201);

    expect(mockGenerateQueryEmbedding).toHaveBeenCalledWith(
      "How do I submit scholarship documents?. I need to understand where scholarship documents should be submitted."
    );
  });

  it("never returns embedding fields from listQuestions", async () => {
    const { user: student, token } = await createUserWithToken("student");
    const { category, tag } = await createTaxonomy();
    await createQuestionFixture({
      askerId: student._id,
      category,
      tag,
      title: "Question about graduation audit",
      description: "A graduation audit question with enough context for validation.",
      embedding: vector(0.9)
    });

    const response = await request(app)
      .get("/api/questions")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body.data.questions[0].embedding).toBeUndefined();
  });

  it("does not show other students' pending answers to a student", async () => {
    const { user: asker, token } = await createUserWithToken("student", "asker@example.com");
    const { user: otherStudent } = await createUserWithToken("student", "other-answerer@example.com");
    const { category, tag } = await createTaxonomy();
    const question = await createQuestionFixture({
      askerId: asker._id,
      category,
      tag,
      title: "Question about hostel repairs",
      description: "A hostel repair question with enough context for students.",
      status: "open"
    });
    await createAnswerFixture({ questionId: question._id, answeredBy: otherStudent._id, status: "pending" });

    const response = await request(app)
      .get(`/api/questions/${question._id}/answers`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body.data).toHaveLength(0);
  });

  it("shows a student's own pending answer", async () => {
    const { user: student, token } = await createUserWithToken("student");
    const { category, tag } = await createTaxonomy();
    const question = await createQuestionFixture({
      askerId: student._id,
      category,
      tag,
      title: "Question about hostel repairs",
      description: "A hostel repair question with enough context for students.",
      status: "open"
    });
    await createAnswerFixture({ questionId: question._id, answeredBy: student._id, status: "pending" });

    const response = await request(app)
      .get(`/api/questions/${question._id}/answers`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].status).toBe("pending");
  });

  it("rejects answer submission when the question is not open", async () => {
    const { user: student, token } = await createUserWithToken("student");
    const { category, tag } = await createTaxonomy();
    const question = await createQuestionFixture({
      askerId: student._id,
      category,
      tag,
      title: "Resolved transcript question",
      description: "A resolved transcript question that is no longer open.",
      status: "resolved"
    });

    const response = await request(app)
      .post(`/api/questions/${question._id}/answers`)
      .set("Authorization", `Bearer ${token}`)
      .send({ body: "This answer should not be accepted because the question is closed." })
      .expect(400);

    expect(response.body.error.code).toBe("QUESTION_CLOSED");
  });

  it("approves an answer and sets the question status to answered", async () => {
    const { user: student } = await createUserWithToken("student");
    const { token: moderatorToken } = await createUserWithToken("moderator");
    const { category, tag } = await createTaxonomy();
    const question = await createQuestionFixture({
      askerId: student._id,
      category,
      tag,
      title: "Question about ID card renewal",
      description: "An ID card renewal question with enough context for moderation.",
      status: "open"
    });
    const answer = await createAnswerFixture({ questionId: question._id, answeredBy: student._id, status: "pending" });

    const response = await request(app)
      .patch(`/api/answers/${answer._id}/approve`)
      .set("Authorization", `Bearer ${moderatorToken}`)
      .send({})
      .expect(200);
    const updatedQuestion = await Question.findById(question._id);

    expect(response.body.data.status).toBe("approved");
    expect(updatedQuestion.status).toBe("answered");
  });

  it("rejects an answer rejection request without a reason", async () => {
    const { user: student } = await createUserWithToken("student");
    const { token: moderatorToken } = await createUserWithToken("moderator");
    const { category, tag } = await createTaxonomy();
    const question = await createQuestionFixture({
      askerId: student._id,
      category,
      tag,
      title: "Question about ID card renewal",
      description: "An ID card renewal question with enough context for moderation."
    });
    const answer = await createAnswerFixture({ questionId: question._id, answeredBy: student._id, status: "pending" });

    await request(app)
      .patch(`/api/answers/${answer._id}/reject`)
      .set("Authorization", `Bearer ${moderatorToken}`)
      .send({})
      .expect(400);
  });

  it("resolves a question and logs AnalyticsEvent with resolvedAt", async () => {
    const { user: student } = await createUserWithToken("student");
    const { token: moderatorToken } = await createUserWithToken("moderator");
    const { category, tag } = await createTaxonomy();
    const question = await createQuestionFixture({
      askerId: student._id,
      category,
      tag,
      title: "Question about library fines",
      description: "A library fine question with enough detail to resolve.",
      status: "answered"
    });

    const response = await request(app)
      .patch(`/api/questions/${question._id}/resolve`)
      .set("Authorization", `Bearer ${moderatorToken}`)
      .expect(200);
    await new Promise((resolve) => setTimeout(resolve, 20));
    const event = await AnalyticsEvent.findOne({ eventType: "QUESTION_RESOLVED", entityId: question._id });

    expect(response.body.data.status).toBe("resolved");
    expect(response.body.data.resolvedAt).toBeTruthy();
    expect(event.metadata.resolvedAt).toBeTruthy();
  });

  it("marks a question as duplicate and stores duplicateOf", async () => {
    const { user: student } = await createUserWithToken("student");
    const { token: moderatorToken } = await createUserWithToken("moderator");
    const { category, tag } = await createTaxonomy();
    const canonical = await createQuestionFixture({
      askerId: student._id,
      category,
      tag,
      title: "Canonical scholarship deadline question",
      description: "Canonical scholarship deadline question with enough detail.",
      status: "resolved"
    });
    const duplicate = await createQuestionFixture({
      askerId: student._id,
      category,
      tag,
      title: "Duplicate scholarship deadline question",
      description: "Duplicate scholarship deadline question with enough detail.",
      status: "open"
    });

    const response = await request(app)
      .patch(`/api/questions/${duplicate._id}/duplicate`)
      .set("Authorization", `Bearer ${moderatorToken}`)
      .send({ duplicateOf: canonical._id.toString() })
      .expect(200);

    expect(response.body.data.status).toBe("duplicate");
    expect(response.body.data.duplicateOf).toBe(canonical._id.toString());
  });

  it("sorts the priority queue by priorityScore descending", async () => {
    const { user: student, token } = await createUserWithToken("student");
    const { category, tag } = await createTaxonomy();
    await createQuestionFixture({
      askerId: student._id,
      category,
      tag,
      title: "Lower priority transport question",
      description: "A lower priority transport question with enough detail.",
      priorityScore: 0.2
    });
    await createQuestionFixture({
      askerId: student._id,
      category,
      tag,
      title: "Higher priority transport question",
      description: "A higher priority transport question with enough detail.",
      priorityScore: 0.95
    });

    const response = await request(app)
      .get("/api/questions")
      .query({ sortBy: "priority" })
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body.data.questions[0].title).toBe("Higher priority transport question");
  });

  it("updates priority scores with bulk write without throwing", async () => {
    const { user: student } = await createUserWithToken("student");
    const { category, tag } = await createTaxonomy();
    await createQuestionFixture({
      askerId: student._id,
      category,
      tag,
      title: "Aging priority question",
      description: "An aging priority question with enough detail for recalculation.",
      createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000)
    });

    await expect(updatePriorityScores()).resolves.toEqual({ updated: 1 });
  });
});
