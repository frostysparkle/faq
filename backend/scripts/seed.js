'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI || MONGODB_URI.includes('<')) {
  console.error('ERROR: Set a valid MONGODB_URI in backend/.env before seeding.');
  process.exit(1);
}

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log('[seed] Connected to MongoDB');

  const User = require('../src/models/User');
  const Faq = require('../src/models/Faq');
  const SystemSettings = require('../src/models/SystemSettings');

  // Admin user
  const adminEmail = 'admin@samagama.dev';
  let admin = await User.findOne({ email: adminEmail });
  if (!admin) {
    admin = await User.create({
      email: adminEmail,
      passwordHash: await bcrypt.hash('Admin@1234', BCRYPT_ROUNDS),
      name: 'Admin',
      role: 'admin',
    });
    console.log('[seed] Admin user created:', adminEmail, '/ Admin@1234');
  } else {
    console.log('[seed] Admin user already exists, skipping.');
  }

  // Moderator user
  const modEmail = 'mod@samagama.dev';
  let mod = await User.findOne({ email: modEmail });
  if (!mod) {
    mod = await User.create({
      email: modEmail,
      passwordHash: await bcrypt.hash('Mod@1234', BCRYPT_ROUNDS),
      name: 'Moderator',
      role: 'moderator',
    });
    console.log('[seed] Moderator user created:', modEmail, '/ Mod@1234');
  } else {
    console.log('[seed] Moderator user already exists, skipping.');
  }

  // SystemSettings singleton
  await SystemSettings.get();
  console.log('[seed] SystemSettings singleton ensured.');

  // Sample FAQs
  const faqCount = await Faq.countDocuments();
  if (faqCount === 0) {
    await Faq.insertMany([
      {
        title: 'What is the Samagama internship portal?',
        answer: 'Samagama is a student internship portal that connects students with internship opportunities, provides FAQ resources, and supports community Q&A.',
        categories: ['General'],
        tags: ['intro', 'overview'],
        status: 'published',
        createdBy: admin._id,
      },
      {
        title: 'How do I register for an internship?',
        answer: 'To register, log in to the portal, go to the Internships section, search for openings, and click "Apply". Make sure your profile is complete before applying.',
        categories: ['Registration'],
        tags: ['internship', 'apply', 'registration'],
        status: 'published',
        createdBy: admin._id,
      },
      {
        title: 'What documents do I need to upload?',
        answer: 'You need to upload your resume (PDF), a recent passport-size photo, and your student ID. Optionally you can add a cover letter.',
        categories: ['Registration'],
        tags: ['documents', 'upload', 'resume'],
        status: 'published',
        createdBy: admin._id,
      },
      {
        title: 'When will I hear back after applying?',
        answer: 'The typical response time is 5–7 business days. You will receive an email notification and a portal update when your application status changes.',
        categories: ['Application Process'],
        tags: ['timeline', 'response', 'status'],
        status: 'published',
        createdBy: admin._id,
      },
      {
        title: 'How do I reset my password?',
        answer: 'Click "Forgot Password" on the login page, enter your registered email address, and follow the reset link sent to your inbox.',
        categories: ['Account'],
        tags: ['password', 'account', 'login'],
        status: 'published',
        createdBy: admin._id,
      },
    ]);
    console.log('[seed] 5 sample FAQs inserted.');
  } else {
    console.log(`[seed] FAQs collection already has ${faqCount} docs, skipping.`);
  }

  await mongoose.disconnect();
  console.log('[seed] Done.');
}

run().catch((err) => {
  console.error('[seed] Error:', err.message);
  process.exit(1);
});
