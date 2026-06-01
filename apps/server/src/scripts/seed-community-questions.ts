// Creates community questions directly in MongoDB, bypassing the API.
// This is used when the check-existing workflow finds no FAQ match.
// Then the regular simulation script handles answers and voting.
//
// Run: `npm run seed:community-questions`
import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { UserModel } from '../models/User.model.js';
import { QuestionModel } from '../models/Question.model.js';

const BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:4000';

const STUDENT_EMAILS = [
  'aditya@samagama.test', 'priya@samagama.test', 'arjun@samagama.test',
  'sneha@samagama.test', 'vikram@samagama.test', 'kavya@samagama.test',
  'rohit@samagama.test', 'ananya@samagama.test', 'siddharth@samagama.test',
  'deepika@samagama.test', 'karthik@samagama.test', 'mythili@samagama.test',
  'naveen@samagama.test', 'divya@samagama.test', 'suresh@samagama.test',
  'meenakshi@samagama.test', 'chandran@samagama.test', 'lavanya@samagama.test',
  'balaji@samagama.test', 'uma@samagama.test', 'gopinath@samagama.test',
  'radhika@samagama.test', 'venkat@samagama.test', 'shakthi@samagama.test',
  'nandini@samagama.test',
];

// These are the question titles that did NOT match any FAQ during check-existing
// In a fresh run these would be all 30 questions — but since FAQs exist, we'll
// create community questions for demonstration purposes
const QUESTIONS = [
  { title: 'NOC format issue', description: 'My college provides NOC in its own format. Will it be accepted by IIT Ropar?' },
  { title: 'Dashboard shows interview incomplete', description: 'I completed my interview and Yaksha confirmed it, but my dashboard still shows "Incomplete". When will it update?' },
  { title: 'Interview status shows interrupted', description: 'Yaksha said my interview was completed successfully, but the portal shows "Interview Interrupted". Why?' },
  { title: 'Offer letter delayed after NOC', description: 'My NOC was uploaded and validated over 48 hours ago but I still have not received the formal offer letter. When will I get it?' },
  { title: 'Offer letter says NOC pending', description: 'My NOC is showing as validated on the dashboard but my offer letter still says "NOC Pending". Please fix this.' },
  { title: 'Cannot join Zoom meeting', description: 'I registered for the Zoom meeting but it says registration error or wrong passcode. What is the correct meeting link?' },
  { title: 'WhatsApp group is full', description: 'The Vicharanashala-Summership WhatsApp group shows as full. How can I join and receive updates?' },
  { title: 'Acceptance email bounced', description: 'My acceptance email bounced with "address not found". What should I do to confirm my acceptance?' },
  { title: 'How to sign offer letter', description: 'Do I need to print and sign the offer letter physically, or can I sign it digitally? And which email should I send it to?' },
  { title: 'Change locked internship dates', description: 'The internship dates on my dashboard are locked. I need to change them due to college exam conflicts. How can I modify them?' },
  { title: 'College refusing NOC', description: 'My college/university is refusing to give me an NOC for this unpaid internship. Is there an alternative?' },
  { title: 'No Zoom link received', description: 'I have not received any Zoom meeting link for today\'s session. When will I get the invite?' },
  { title: 'No ViBe course link', description: 'I received my offer letter but haven\'t received the Phase 1 / Bronze course link on ViBe. When will I get access?' },
  { title: 'Mentor not assigned', description: 'My internship started but no mentor has been assigned to me yet. When will I receive mentor details?' },
  { title: 'Dashboard not updating', description: 'I completed all the steps but my portal dashboard is not updating. What should I do?' },
  { title: 'Internship start date passed', description: 'My internship start date was 3 days ago but I still have not received any onboarding details or access. What to do?' },
  { title: 'Leaves and weekends policy', description: 'Do we get leaves during the internship? What about weekends and emergency situations?' },
  { title: 'Internship flexibility', description: 'Is the internship self-paced or are there fixed timings? Can I manage it alongside college classes?' },
  { title: 'How daily sessions work', description: 'Will we get a Zoom link every day or are sessions conducted through the Samagama dashboard?' },
  { title: 'Missed orientation recording', description: 'I missed the orientation session. Can I get the recording or make up for the missed content?' },
  { title: 'Spurti Points showing zero', description: 'My internship started but my Spurti Points are showing as zero. Will they be updated later?' },
  { title: 'Need selection letter for NOC', description: 'My college requires an official selection/confirmation letter before they will sign the NOC. How can I get one?' },
  { title: 'Withdraw from internship', description: 'I want to cancel or withdraw from the internship. What is the process?' },
  { title: 'Spelling mistake in offer letter', description: 'There is a spelling error in my name on the offer letter. How do I get it corrected?' },
  { title: 'Yaksha chat not working', description: 'I am unable to interact with Yaksha. The chat is not working and shows an interview timer. What should I do?' },
  { title: 'Cannot access ViBe platform', description: 'I cannot create an account on ViBe or access the course platform. The "create account" button does nothing.' },
  { title: 'Stipend eligibility query', description: 'I am an NPTEL Gold/Elite student and received an email about a ₹5,000 stipend, but my dashboard shows "VINS (No Stipend)". Am I eligible?' },
  { title: 'Standup meetings before start date', description: 'My internship starts next month but I received a Zoom standup meeting link. Should I attend even though my start date hasn\'t arrived?' },
  { title: 'No confirmation after acceptance email', description: 'I signed and sent the acceptance email 3 days ago but received no confirmation. Is that normal?' },
  { title: 'Mistake in acceptance email format', description: 'I replied with "reply" instead of "reply all" to the acceptance email. Will it still be accepted? Should I resend?' },
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function seedCommunityQuestions() {
  if (env.isProduction) {
    logger.error('Refusing to seed in production. Aborting.');
    process.exit(1);
  }

  await connectDatabase();

  // Fetch default category
  const { defaultCategoryObjectId } = await import('../models/Category.model.js').then((m) => {
    return { defaultCategoryObjectId: m.CategoryModel.findOne().then((c) => c?._id) };
  }) as unknown as { defaultCategoryObjectId: string };

  const students = await UserModel.find({ email: { $in: STUDENT_EMAILS } }).lean<{ _id: string }[]>();
  if (students.length === 0) throw new Error('No student accounts found. Run seed:student-accounts first.');

  logger.info({ studentCount: students.length }, 'Fetched student accounts');

  const shuffledStudents = shuffle(students);
  const shuffledQuestions = shuffle([...QUESTIONS]);
  const createdIds: string[] = [];

  for (let i = 0; i < shuffledQuestions.length; i++) {
    const student = shuffledStudents[i % shuffledStudents.length];
    const q = shuffledQuestions[i];

    // Check if a community question with this title already exists
    const existing = await QuestionModel.findOne({
      title: q.title,
      type: 'community',
      status: { $in: ['open', 'answered'] },
    }).lean();
    if (existing) {
      logger.info({ title: q.title, existingId: existing._id.toString() }, 'Question already exists — skipping');
      createdIds.push(existing._id.toString());
      continue;
    }

    const created = await QuestionModel.create({
      title: q.title,
      description: q.description,
      type: 'community',
      status: 'open',
      askedBy: student._id,
      existingAnswerCheck: { checkedAt: new Date() },
      answerCount: 0,
      viewCount: 0,
    });
    createdIds.push(created._id.toString());
    logger.info({ questionId: created._id.toString(), student: student._id, title: q.title }, 'Created community question');
    await new Promise((r) => setTimeout(r, 50));
  }

  logger.info({ created: createdIds.length }, 'Community questions seeded');
  logger.info('Question IDs for reference:', createdIds);

  await disconnectDatabase();
  logger.info('✅ Community questions seeded.');
}

seedCommunityQuestions().catch(async (err) => {
  logger.error({ err }, 'Failed');
  await disconnectDatabase().catch(() => undefined);
  process.exit(1);
});