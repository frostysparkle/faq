import bcrypt from "bcrypt";
import { DEFAULT_CATEGORIES, toSlug, type UserRole } from "@samagama/shared";
import { connectDatabase, disconnectDatabase } from "../config/database.js";
import { env } from "../config/env.js";
import { AnswerModel } from "../models/Answer.js";
import { FaqModel } from "../models/Faq.js";
import { FlagModel } from "../models/Flag.js";
import { QuestionModel } from "../models/Question.js";
import { CategoryModel, TagModel } from "../models/Taxonomy.js";
import { UserModel } from "../models/User.js";
import { embeddingService } from "../services/embedding.service.js";
import { logger } from "../utils/logger.js";
import { summarize } from "../utils/text.js";

const demoUsers: Array<{ name: string; email: string; role: UserRole }> = [
  { name: "Riya Student", email: "riya@example.com", role: "student" },
  { name: "Leena Moderator", email: "leena@samagama.in", role: "moderator" },
  { name: "Admin User", email: "admin@samagama.in", role: "admin" }
];

const tagSeeds = [
  "noc",
  "deadline",
  "submission",
  "certificate",
  "download",
  "login",
  "sso",
  "technical",
  "attendance",
  "app",
  "stipend",
  "payment",
  "mentor",
  "project",
  "guidelines",
  "access",
  "reset",
  "portal",
  "remote",
  "correction",
  "late"
];

const faqSeeds = [
  {
    title: "How do I submit my NOC?",
    category: "NOC",
    tags: ["noc", "submission", "deadline"],
    status: "published",
    answer:
      "Submit your NOC from Documents > NOC Submission in the Samagama portal. Upload the signed NOC and proof of internship confirmation before the published deadline."
  },
  {
    title: "What if my login credentials are not working?",
    category: "Login and Access",
    tags: ["login", "sso", "technical", "reset"],
    status: "published",
    answer:
      "Clear your browser cache, try an incognito window, and use the reset-password link on the Samagama login page. If SSO still fails, contact support with a screenshot."
  },
  {
    title: "How do I download my internship certificate?",
    category: "Certificates",
    tags: ["certificate", "download"],
    status: "published",
    answer:
      "Certificates are available after attendance completion and mentor approval. Open Profile > Documents and use the certificate download action."
  },
  {
    title: "When is the stipend credited?",
    category: "Stipend",
    tags: ["stipend", "payment"],
    status: "published",
    answer:
      "The stipend is credited on the last working day of each month to the registered bank account, subject to attendance and mentor approval."
  },
  {
    title: "How is attendance tracked?",
    category: "Attendance",
    tags: ["attendance", "app"],
    status: "outdated",
    answer:
      "Attendance is tracked through the Samagama app. This FAQ is marked outdated while the new app flow is being reviewed by moderators."
  },
  {
    title: "Can project submission deadline be extended?",
    category: "Deadlines",
    tags: ["project", "deadline", "late"],
    status: "published",
    answer:
      "Deadline extensions are granted only when the organizer announces an extension or when an admin approves a documented exception."
  },
  {
    title: "What should I do if my mentor is unresponsive?",
    category: "Internship Guidelines",
    tags: ["mentor", "guidelines"],
    status: "published",
    answer:
      "Wait one working day after your last message, then raise the issue through the portal support form with your project ID and mentor contact history."
  },
  {
    title: "How do I update bank details for stipend?",
    category: "Stipend",
    tags: ["stipend", "payment", "portal"],
    status: "published",
    answer:
      "Open Profile > Bank Details, submit the corrected account information, and wait for admin verification before the next stipend cycle."
  },
  {
    title: "What format is accepted for project submission?",
    category: "Project Submission",
    tags: ["project", "submission"],
    status: "published",
    answer:
      "Submit project files as a ZIP archive with source code, README, and final report. Do not upload loose folders."
  },
  {
    title: "Can I continue remotely if my location changes?",
    category: "Internship Guidelines",
    tags: ["remote", "guidelines"],
    status: "published",
    answer:
      "Remote continuation requires mentor approval and admin confirmation. Update your location in the portal before switching work mode."
  }
] as const;

async function upsertDemoUsers() {
  const passwordHash = await bcrypt.hash("Password123!", env.PASSWORD_SALT_ROUNDS);
  const users = [];
  for (const user of demoUsers) {
    users.push(
      await UserModel.findOneAndUpdate(
        { email: user.email },
        { ...user, passwordHash, status: "active" },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      )
    );
  }
  return users;
}

async function upsertTaxonomy() {
  const categories = new Map<string, string>();
  const tags = new Map<string, string>();

  for (const category of DEFAULT_CATEGORIES) {
    const doc = await CategoryModel.findOneAndUpdate(
      { slug: toSlug(category) },
      {
        name: category,
        slug: toSlug(category),
        description: `${category} related internship support content.`,
        keywords: category.toLowerCase().split(/\s+/),
        isActive: true
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    categories.set(category, doc.id);
  }

  for (const tag of tagSeeds) {
    const doc = await TagModel.findOneAndUpdate(
      { slug: toSlug(tag) },
      {
        name: tag,
        slug: toSlug(tag),
        description: `${tag} support topic`,
        keywords: [tag],
        isActive: true
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    tags.set(tag, doc.id);
  }

  return { categories, tags };
}

async function upsertFaqs(
  adminId: string,
  categories: Map<string, string>,
  tags: Map<string, string>
) {
  const faqs = [];
  for (const seed of faqSeeds) {
    const categoryId = categories.get(seed.category);
    if (!categoryId) throw new Error(`Missing category ${seed.category}`);
    const tagIds = seed.tags.map((tag) => tags.get(tag)).filter((id): id is string => Boolean(id));
    const embedding = await embeddingService.embed(`${seed.title}\n${seed.answer}`);
    const faq = await FaqModel.findOneAndUpdate(
      { slug: toSlug(seed.title) },
      {
        title: seed.title,
        slug: toSlug(seed.title),
        answer: seed.answer,
        summary: summarize(seed.answer),
        categories: [categoryId],
        tags: tagIds,
        status: seed.status,
        sourceType: "manual",
        embedding,
        indexingStatus: "indexed",
        helpfulCount: 8,
        notHelpfulCount: 1,
        viewCount: 20,
        flagCount: seed.status === "outdated" ? 4 : 0,
        createdBy: adminId,
        updatedBy: adminId,
        publishedAt: new Date(),
        lastReviewedAt: new Date()
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    faqs.push(faq);
  }
  return faqs;
}

async function upsertCommunity(
  studentId: string,
  moderatorId: string,
  categories: Map<string, string>
) {
  const nocCategory = categories.get("NOC");
  const attendanceCategory = categories.get("Attendance");
  if (!nocCategory || !attendanceCategory) throw new Error("Missing required community categories");

  const question = await QuestionModel.findOneAndUpdate(
    { title: "Can we submit our NOC after the deadline if our mentor approves late?" },
    {
      title: "Can we submit our NOC after the deadline if our mentor approves late?",
      description:
        "My mentor may approve the NOC after the deadline. I need to know whether late submission is accepted.",
      categoryId: nocCategory,
      tags: [],
      status: "answered",
      askedBy: studentId,
      existingAnswerCheck: {
        checkedAt: new Date(),
        token: "seed-existing-answer-check",
        matchedFaqs: [],
        matchedQuestions: []
      },
      answerCount: 1
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await AnswerModel.findOneAndUpdate(
    { questionId: question._id, body: /written mentor approval/ },
    {
      questionId: question._id,
      body: "Late NOC submission needs written mentor approval and admin confirmation before the original deadline.",
      answeredBy: studentId,
      status: "pending",
      moderatorId,
      moderationNote: "",
      embedding: await embeddingService.embed(
        "Late NOC submission written mentor approval admin confirmation"
      ),
      indexingStatus: "pending",
      eligibleForFaqConversion: false
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await QuestionModel.findOneAndUpdate(
    { title: "Is final week attendance mandatory if project is submitted?" },
    {
      title: "Is final week attendance mandatory if project is submitted?",
      description:
        "I have already submitted the project and want to confirm final week attendance expectations.",
      categoryId: attendanceCategory,
      tags: [],
      status: "open",
      askedBy: studentId,
      existingAnswerCheck: {
        checkedAt: new Date(),
        token: "seed-existing-answer-check-2",
        matchedFaqs: [],
        matchedQuestions: []
      },
      answerCount: 0
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

async function upsertFlags(studentId: string, moderatorId: string, faqIds: string[]) {
  const flaggedFaq = faqIds[0];
  if (!flaggedFaq) return;
  await FlagModel.findOneAndUpdate(
    { entityType: "faq", entityId: flaggedFaq, reportedBy: studentId },
    {
      entityType: "faq",
      entityId: flaggedFaq,
      reason: "outdated",
      details: "The steps do not match the latest portal UI.",
      status: "under_review",
      reportedBy: studentId,
      reviewedBy: moderatorId,
      resolutionNote: "Seed review item"
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

async function seed() {
  await connectDatabase();
  const [student, moderator, admin] = await upsertDemoUsers();
  if (!student || !moderator || !admin) throw new Error("Failed to seed demo users");
  const { categories, tags } = await upsertTaxonomy();
  const faqs = await upsertFaqs(admin.id, categories, tags);
  await upsertCommunity(student.id, moderator.id, categories);
  await upsertFlags(
    student.id,
    moderator.id,
    faqs.map((faq) => faq.id)
  );
  logger.info("Seed completed", {
    users: demoUsers.length,
    categories: categories.size,
    tags: tags.size,
    faqs: faqs.length
  });
  await disconnectDatabase();
}

seed().catch(async (error: unknown) => {
  logger.error("Seed failed", error);
  await disconnectDatabase();
  process.exit(1);
});
