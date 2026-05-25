// Seeds the canonical category list + tag list + a starter set of published FAQs.
// Idempotent: re-running upserts existing categories/tags by slug and FAQs by title.
//
// Run: `npm --workspace @samagama/server run seed:faqs`
import { FAQ_CATEGORIES } from '@samagama/shared';
import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { logger } from '../config/logger.js';
import { CategoryModel } from '../models/Category.model.js';
import { TagModel } from '../models/Tag.model.js';
import { FaqModel } from '../models/Faq.model.js';
import { slugify } from '../utils/slugify.js';

const TAG_NAMES = [
  'noc',
  'certificate',
  'download',
  'login',
  'password',
  'attendance',
  'remote',
  'wfh',
  'leave',
  'stipend',
  'payment',
  'deadline',
  'project',
  'submission',
  'completion',
  'cohort',
  'bug',
  'policy',
];

interface SeedFaq {
  title: string;
  answer: string;
  summary?: string;
  categoryName: (typeof FAQ_CATEGORIES)[number];
  tags: string[];
}

const SEED_FAQS: SeedFaq[] = [
  {
    title: 'How do I download my NOC certificate?',
    answer:
      'Log in to the portal, navigate to Documents, and click NOC Certificate to download it as a PDF. The button activates within 7 working days of your internship end date.',
    summary: 'Download NOC PDF from Documents > NOC Certificate.',
    categoryName: 'NOC',
    tags: ['noc', 'certificate', 'download'],
  },
  {
    title: 'Login issues after a password reset',
    answer:
      'Clear your browser cache, use the most recently set password, and ensure third-party cookies are enabled. If problems persist, request a new reset email from the login page.',
    summary: 'Clear cache + cookies, retry the new password.',
    categoryName: 'Login & Access',
    tags: ['login', 'password'],
  },
  {
    title: 'How do I mark attendance for remote days?',
    answer:
      'Use the Remote Attendance button under Attendance > Mark Today before 10:00 AM IST. Late submissions need approval from your reporting manager.',
    summary: 'Mark before 10 AM under Attendance > Mark Today.',
    categoryName: 'Attendance',
    tags: ['attendance', 'remote', 'wfh'],
  },
  {
    title: 'When is the certificate of completion issued?',
    answer:
      'Certificates of completion are generated within 7 working days of your internship end date and emailed to your registered address.',
    summary: 'Within 7 working days of internship end.',
    categoryName: 'Certificates',
    tags: ['certificate', 'completion'],
  },
  {
    title: 'Stipend disbursement schedule for the current quarter',
    answer:
      'Stipends are processed on the 5th of each month for work completed in the previous month. Bank holidays may shift the credit by one to two business days.',
    summary: 'Processed on the 5th of each month.',
    categoryName: 'Stipend',
    tags: ['stipend', 'payment'],
  },
  {
    title: 'How do I submit the final project report?',
    answer:
      'Submit your report via Projects > Final Report before the deadline shown on your dashboard. Accepted formats: PDF, DOCX. Maximum file size 25 MB.',
    summary: 'Projects > Final Report, PDF or DOCX, max 25 MB.',
    categoryName: 'Project Submission',
    tags: ['project', 'submission'],
  },
  {
    title: 'Can I take leave during the internship?',
    answer:
      'You can take up to 2 casual leaves per month. Sick leaves over 2 consecutive days require a medical certificate uploaded to the Leave portal.',
    summary: '2 casual leaves/month; medical cert for >2 sick days.',
    categoryName: 'Internship Guidelines',
    tags: ['leave', 'policy'],
  },
  {
    title: 'My NOC still shows pending — what should I do?',
    answer:
      'NOC moves from Pending to Issued within 7 working days of internship completion. If it is stuck longer than that, raise a flag from the FAQ page or contact your coordinator.',
    summary: 'Wait 7 working days, then flag or contact coordinator.',
    categoryName: 'NOC',
    tags: ['noc', 'bug'],
  },
];

async function seed(): Promise<void> {
  await connectDatabase();

  // Migration step: previously the catch-all category was named "General". The Dashboard Spec
  // renamed it to "Other". If the legacy doc exists we rename it in place so existing FAQs
  // tagged to it stay correctly linked (no orphan).
  const legacy = await CategoryModel.findOne({ slug: 'general' });
  if (legacy) {
    legacy.name = 'Other';
    legacy.slug = 'other';
    await legacy.save();
    logger.info('Renamed legacy "General" category to "Other"');
  }

  // Categories
  const categoriesByName = new Map<string, string>();
  for (const name of FAQ_CATEGORIES) {
    const slug = slugify(name);
    const cat = await CategoryModel.findOneAndUpdate(
      { slug },
      { name, slug, isActive: true },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    categoriesByName.set(name, cat.id);
  }
  logger.info({ count: categoriesByName.size }, 'Categories seeded');

  // Tags
  const tagsByName = new Map<string, string>();
  for (const name of TAG_NAMES) {
    const slug = slugify(name);
    const tag = await TagModel.findOneAndUpdate(
      { slug },
      { name, slug, isActive: true },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    tagsByName.set(name, tag.id);
  }
  logger.info({ count: tagsByName.size }, 'Tags seeded');

  // FAQs
  for (const seedFaq of SEED_FAQS) {
    const categoryId = categoriesByName.get(seedFaq.categoryName);
    if (!categoryId) {
      logger.warn({ category: seedFaq.categoryName }, 'Skipping FAQ: missing category');
      continue;
    }
    const tagIds = seedFaq.tags
      .map((t) => tagsByName.get(t))
      .filter((id): id is string => Boolean(id));

    await FaqModel.findOneAndUpdate(
      { title: seedFaq.title },
      {
        $set: {
          title: seedFaq.title,
          answer: seedFaq.answer,
          summary: seedFaq.summary,
          categories: [categoryId],
          tags: tagIds,
          status: 'published',
          publishedAt: new Date(),
        },
        $setOnInsert: {
          slug: `${slugify(seedFaq.title)}-${Date.now().toString(36)}`,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  }
  logger.info({ count: SEED_FAQS.length }, 'FAQs seeded');

  await disconnectDatabase();
  logger.info('✅ FAQ seed complete.');
}

seed().catch(async (err) => {
  logger.error({ err }, 'Failed to seed FAQs');
  await disconnectDatabase().catch(() => undefined);
  process.exit(1);
});
