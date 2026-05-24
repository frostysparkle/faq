import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { marked } from 'marked';
import dotenv from 'dotenv';

import User from '../models/User.js';
import Category from '../models/Category.js';
import Tag from '../models/Tag.js';
import Faq from '../models/Faq.js';
import { FAQ_STATUS } from '../constants/statuses.js';
import { USER_ROLES } from '../constants/roles.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SECTION_CATEGORY_MAP = [
  { matcher: /About the Internship/i, category: 'General Queries' },
  { matcher: /Timing and Dates/i, category: 'Submission & Deadlines' },
  { matcher: /NOC/i, category: 'NOC & Certificates' },
  { matcher: /Selection, Offer Letter, and Certificate/i, category: 'NOC & Certificates' },
  { matcher: /Work, Mentorship, and Projects/i, category: 'Stipend & Payments' },
  { matcher: /ViBe Platform|Yaksha Chat/i, category: 'Portal Access' },
  { matcher: /Team Formation/i, category: 'Technical Issues' }
];

const KNOWN_CATEGORIES = [
  'Stipend & Payments',
  'NOC & Certificates',
  'Technical Issues',
  'Submission & Deadlines',
  'Portal Access',
  'General Queries'
];

const CATEGORY_DEFAULT_DESCRIPTION = (name) => `${name} policy and support area.`;
const TAG_DEFAULT_DESCRIPTION = (name) => `Seed tag for ${name}.`;

const normalizeTagName = (tag) => tag.toLowerCase().trim().replace(/\s+/g, '-');

const mapSectionToCategory = (section) => {
  const rawCategory = section.trim();
  const mapping = SECTION_CATEGORY_MAP.find((entry) => entry.matcher.test(rawCategory));
  return mapping ? mapping.category : 'General Queries';
};

const collectAnswerText = (tokens, startIndex) => {
  const lines = [];
  let index = startIndex;

  while (index < tokens.length) {
    const token = tokens[index];

    if (token.type === 'heading' && token.depth <= 3) {
      break;
    }

    if (token.type === 'paragraph' || token.type === 'text' || token.type === 'blockquote') {
      lines.push(token.text.trim());
    } else if (token.type === 'list') {
      const listText = token.items.map((item) => item.text.trim()).join('\n');
      lines.push(listText);
    }

    index += 1;
  }

  return {
    answerText: lines.join('\n\n').trim(),
    nextIndex: index
  };
};

const generateTagsForQuestion = (questionText) => {
  const normalized = questionText.toLowerCase();
  const tags = new Set(['official-policy']);

  if (normalized.includes('noc')) {
    tags.add('noc-approval');
    tags.add('documents');
  }
  if (normalized.includes('stipend') || normalized.includes('free')) {
    tags.add('stipend');
    tags.add('payment-delay');
  }
  if (normalized.includes('deadline') || normalized.includes('date')) {
    tags.add('deadline-extension');
    tags.add('submission');
  }
  if (normalized.includes('vibe') || normalized.includes('video')) {
    tags.add('portal-error');
    tags.add('portal-access');
  }
  if (normalized.includes('team') || normalized.includes('member')) {
    tags.add('support-ticket');
  }
  if (normalized.includes('certificate')) {
    tags.add('certificate');
    tags.add('documents');
  }

  return [...tags].map(normalizeTagName);
};

const parseFaqItems = (markdownContent) => {
  const tokens = marked.lexer(markdownContent);
  const faqItems = [];
  let currentCategory = 'General Queries';

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];

    if (token.type === 'heading' && token.depth === 2) {
      currentCategory = mapSectionToCategory(token.text);
      continue;
    }

    if (token.type === 'heading' && token.depth === 3) {
      const questionText = token.text.replace(/^\d+\.\d+\s+/, '').trim();
      const { answerText, nextIndex } = collectAnswerText(tokens, index + 1);
      index = nextIndex - 1;

      if (!questionText || !answerText) {
        continue;
      }

      faqItems.push({
        title: questionText,
        category: currentCategory,
        tags: generateTagsForQuestion(questionText),
        summary: `${answerText.replace(/\s+/g, ' ').slice(0, 280)}...`,
        answer: answerText,
        qualityScore: 0,
        helpfulCount: 0,
        notHelpfulCount: 0,
        viewCount: 0
      });
    }
  }

  return faqItems;
};

const findOrCreateCategories = async () => {
  const categoryMap = new Map();

  for (const [index, categoryName] of KNOWN_CATEGORIES.entries()) {
    const category = await Category.findOneAndUpdate(
      { name: categoryName },
      {
        name: categoryName,
        description: CATEGORY_DEFAULT_DESCRIPTION(categoryName),
        displayOrder: index
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    categoryMap.set(categoryName, category);
  }

  return categoryMap;
};

const findOrCreateTags = async (tagNames) => {
  const tagMap = new Map();

  for (const [index, tagName] of [...new Set(tagNames)].entries()) {
    const normalizedTag = normalizeTagName(tagName);
    const tag = await Tag.findOneAndUpdate(
      { name: normalizedTag },
      {
        name: normalizedTag,
        description: TAG_DEFAULT_DESCRIPTION(normalizedTag),
        displayOrder: index
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    tagMap.set(normalizedTag, tag);
  }

  return tagMap;
};

const ensureAdminUser = async () => {
  const adminEmail = 'admin@samagama.dev';
  const existingAdmin = await User.findOne({ email: adminEmail });

  if (existingAdmin) {
    return existingAdmin;
  }

  return User.create({
    name: 'Samagama Admin',
    email: adminEmail,
    passwordHash: 'Admin@1234',
    role: USER_ROLES.ADMIN
  });
};

async function parseAndSeedMarkdown() {
  try {
    console.log('Locating and reading samagama_faq.md...');

    const filePath = path.join(__dirname, '../../../samagama_faq.md');

    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found at ${filePath}. Please verify your directory paths.`);
    }

    const markdownContent = fs.readFileSync(filePath, 'utf-8');
    const faqItems = parseFaqItems(markdownContent);

    if (faqItems.length === 0) {
      throw new Error('No FAQ entries were extracted from the markdown file. Verify the file structure and heading levels.');
    }

    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is missing from your .env configuration file.');
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB.');

    const adminUser = await ensureAdminUser();
    const categoryMap = await findOrCreateCategories();
    const tagMap = await findOrCreateTags(faqItems.flatMap((item) => item.tags));

    await Faq.deleteMany({});
    console.log('Cleared existing FAQ documents.');

    for (const item of faqItems) {
      const category = categoryMap.get(item.category) ?? categoryMap.get('General Queries');
      const categoryIds = category ? [category._id] : [];
      const tagIds = item.tags.map((tagName) => tagMap.get(normalizeTagName(tagName))?._id).filter(Boolean);

      await Faq.create({
        title: item.title,
        summary: item.summary,
        answer: item.answer,
        categories: categoryIds,
        tags: tagIds,
        status: FAQ_STATUS.PUBLISHED,
        sourceType: 'manual',
        helpfulCount: item.helpfulCount,
        notHelpfulCount: item.notHelpfulCount,
        viewCount: item.viewCount,
        qualityScore: item.qualityScore,
        createdBy: adminUser._id,
        updatedBy: adminUser._id,
        publishedAt: new Date()
      });
    }

    console.log(`Successfully seeded ${faqItems.length} FAQ entries from markdown.`);
  } catch (error) {
    console.error('Seed failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
    process.exit(0);
  }
}

parseAndSeedMarkdown();
