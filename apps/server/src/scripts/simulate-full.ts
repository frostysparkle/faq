// Complete student activity simulation for demo purposes.
// Creates community questions directly in MongoDB (no API rate limits),
// then uses the API for answers/voting with proper delays.
//
// Run: `npm run simulate:full`
import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { UserModel } from '../models/User.model.js';
import { QuestionModel } from '../models/Question.model.js';
import { CategoryModel } from '../models/Category.model.js';
import { signAccessToken } from '../utils/jwt.js';

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

const QUESTIONS = [
  'I completed my interview but my dashboard still shows "Incomplete". When will it update?',
  'Yaksha confirmed my interview was completed but the portal shows "Interview Interrupted". Why?',
  'My NOC was uploaded and validated over 48 hours ago but I still have not received the formal offer letter.',
  'My NOC shows as validated but my offer letter still says "NOC Pending". Please fix this.',
  'I registered for the Zoom meeting but it says registration error or wrong passcode.',
  'The Vicharanashala-Summership WhatsApp group shows as full. How can I join?',
  'My acceptance email bounced with "address not found". What should I do?',
  'Do I need to print and sign the offer letter physically, or can I sign it digitally?',
  'The internship dates on my dashboard are locked. How can I change them?',
  'My college is refusing to give me an NOC for this unpaid internship. Is there an alternative?',
  'I have not received any Zoom meeting link for today\'s session. When will I get it?',
  'I received my offer letter but haven\'t received the Phase 1 / Bronze course link on ViBe.',
  'My internship started but no mentor has been assigned to me yet.',
  'I completed all the steps but my portal dashboard is not updating. What should I do?',
  'My internship start date was 3 days ago but I still have not received any onboarding details.',
  'Do we get leaves during the internship? What about weekends and emergency situations?',
  'Is the internship self-paced or are there fixed timings for sessions?',
  'Will we get a Zoom link every day or are sessions conducted through the Samagama dashboard?',
  'I missed the orientation session. Can I get the recording or make up for it?',
  'My Spurti Points are showing as zero even though my internship started.',
  'My college requires an official selection/confirmation letter before they will sign the NOC.',
  'I want to cancel or withdraw from the internship. What is the process?',
  'There is a spelling error in my name on the offer letter. How do I get it corrected?',
  'I am unable to interact with Yaksha. The chat is not working properly.',
  'I cannot create an account on ViBe or access the course platform.',
  'I am an NPTEL Gold/Elite student — am I eligible for the ₹5,000 stipend?',
  'My internship starts next month but I received a Zoom standup link. Should I attend?',
  'I signed and sent the acceptance email 3 days ago but received no confirmation.',
  'I replied with "reply" instead of "reply all" to the acceptance email. Should I resend?',
  'My college provides NOC in its own format. Will it be accepted by IIT Ropar?',
];

const ANSWER_BODIES = [
  'I had the same issue. What worked for me was contacting the support team via email.',
  'Based on my experience, you should check the spam folder first.',
  'I asked Yaksha about this and got a helpful response. Have you tried using the #escalate command?',
  'This is a common issue during onboarding. The best approach is to wait 24-48 hours.',
  'You need to complete all previous steps before this step unlocks.',
  'Go to your profile settings and re-upload the document. That should refresh the status.',
  'The team usually responds within 24-48 hours on working days.',
  'I was told this is normal for the first few days. It should resolve automatically.',
  'Try clearing your browser cache and logging in again. That fixed the issue for me.',
  'Some features work better on Chrome than Firefox — try switching browsers.',
  'The portal typically updates at midnight. Changes should reflect by tomorrow morning.',
  'I recommend posting in the community section — other students might have a working solution.',
  'Have you checked if your document matches the required format?',
  'The best approach is to raise a ticket through the portal itself.',
  'In my case, the issue was with the email ID format — make sure you use your college email.',
  'The best solution is to be patient — the system takes time to process everything.',
  'What worked for me was reaching out directly on the WhatsApp group.',
  'I noticed that the portal works best on Chrome. Try switching browsers.',
];

interface TokenCache {
  [email: string]: { accessToken: string; userId: string };
}

async function getStudentToken(email: string, cache: TokenCache) {
  if (cache[email]) return cache[email];
  const user = await UserModel.findOne({ email }).lean<{ _id: string; role: string }>();
  if (!user) throw new Error(`User not found: ${email}`);
  const accessToken = signAccessToken({ sub: user._id, role: user.role as 'student' });
  cache[email] = { accessToken, userId: user._id };
  return cache[email];
}

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

async function httpGet(url: string, token: string) {
  let retries = 0;
  while (retries < 5) {
    const res = await fetch(`${BASE_URL}${url}`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    if (res.status === 429) {
      retries++;
      await sleep(retries * 1500);
      continue;
    }
    if (!res.ok) throw new Error(`GET ${url} failed: ${res.status}`);
    return res.json() as Promise<{ data: unknown }>;
  }
  throw new Error(`GET ${url} rate limited after 5 retries`);
}

async function httpPost(url: string, token: string, body: unknown) {
  let retries = 0;
  while (retries < 5) {
    const res = await fetch(`${BASE_URL}${url}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.status === 429) {
      retries++;
      await sleep(retries * 1500);
      continue;
    }
    if (res.status === 204) return null;
    if (!res.ok) throw new Error(`POST ${url} failed: ${res.status} ${await res.text()}`);
    return res.json() as Promise<{ data: unknown }>;
  }
  throw new Error(`POST ${url} rate limited after 5 retries`);
}

async function httpPatch(url: string, token: string, body: unknown) {
  let retries = 0;
  while (retries < 5) {
    const res = await fetch(`${BASE_URL}${url}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.status === 429) {
      retries++;
      await sleep(retries * 1500);
      continue;
    }
    if (res.status === 204) return null;
    if (!res.ok) throw new Error(`PATCH ${url} failed: ${res.status} ${await res.text()}`);
    return res.json() as Promise<{ data: unknown }>;
  }
  throw new Error(`PATCH ${url} rate limited after 5 retries`);
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function simulate() {
  if (env.isProduction) {
    logger.error('Refusing to run simulation in production. Aborting.');
    process.exit(1);
  }

  await connectDatabase();
  const tokenCache: TokenCache = {};

  const students = await UserModel.find({ email: { $in: STUDENT_EMAILS } }).lean<{ _id: string; email: string }[]>();
  if (students.length === 0) throw new Error('No student accounts. Run seed:student-accounts first.');
  logger.info({ count: students.length }, 'Fetched student accounts');

  const defaultCategory = await CategoryModel.findOne().lean<{ _id: string }>();
  if (!defaultCategory) throw new Error('No categories found. Please seed categories first.');
  logger.info({ categoryId: defaultCategory._id.toString() }, 'Fetched default category');

  const modToken = (await getStudentToken('kushagra@samagama.test', tokenCache)).accessToken;

  // ── Step 1: Reset existing data from previous runs ──────────────────────────
  logger.info('=== Resetting previous run data ===');
  const { AnswerModel } = await import('../models/Answer.model.js');
  const questionIds = await QuestionModel.find({ type: 'community' }).distinct('_id');
  // Delete all existing answers for community questions (fresh start)
  await AnswerModel.deleteMany({ questionId: { $in: questionIds } });
  await sleep(200);
  // Reset question counts, status, and tagged students
  await QuestionModel.updateMany({ type: 'community' }, { status: 'open', answerCount: 0, taggedStudents: [] });
  logger.info('Reset complete — all community questions open, answers deleted, taggedStudents cleared');

  // ── Step 2: Create community questions directly in MongoDB ─────────────────
  logger.info('=== Creating community questions (direct MongoDB) ===');
  const shuffledQuestions = shuffle([...QUESTIONS]);
  const shuffledStudents = shuffle(students);
  const createdQuestionIds: string[] = [];

  for (let i = 0; i < shuffledQuestions.length; i++) {
    const student = shuffledStudents[i % shuffledStudents.length];
    const title = shuffledQuestions[i];

    const existing = await QuestionModel.findOne({ title, type: 'community' }).lean();
    if (existing) {
      logger.info({ title: title.slice(0, 40) }, 'Already exists — skipping');
      createdQuestionIds.push(existing._id.toString());
      continue;
    }

    const q = await QuestionModel.create({
      title,
      description: `${title} — please help!`,
      type: 'community',
      status: 'open',
      category: defaultCategory._id,
      askedBy: student._id,
      answerCount: 0,
      viewCount: 0,
    });
    createdQuestionIds.push(q._id.toString());
    logger.info({ questionId: q._id.toString(), title: title.slice(0, 50) }, 'Created');
    await sleep(30);
  }

  logger.info({ created: createdQuestionIds.length }, 'Community questions created');

  // ── Step 2.5: Tag multiple students onto select questions ──────────────────
  // Simulates the realistic case where many students have the same question.
  // Distribution: [12, 10, 8, 7, 5, 3, 2] tagged students on the first 7 questions.
  logger.info('=== Tagging students onto questions ===');
  const TAG_DISTRIBUTION = [12, 10, 8, 7, 5, 3, 2];

  for (let i = 0; i < Math.min(TAG_DISTRIBUTION.length, createdQuestionIds.length); i++) {
    const questionId = createdQuestionIds[i];
    const count = TAG_DISTRIBUTION[i];
    const taggedIds = shuffle(students).slice(0, count).map((s) => s._id);
    await QuestionModel.updateOne(
      { _id: questionId },
      { $set: { taggedStudents: taggedIds } },
    );
    logger.info({ questionId: questionId.slice(-6), taggedCount: count }, 'Students tagged');
    await sleep(20);
  }
  logger.info('Tagging complete');

  // ── Step 3: Fetch all community questions to get their IDs and answer counts ─
  await sleep(1000);
  const allQuestionsData = await httpGet('/api/qna/questions?type=community', modToken) as { data: { id: string; title: string; answerCount: number; status: string }[] };
  const openQuestions = allQuestionsData.data.filter((q) => q.status === 'open' || q.status === 'answered');

  // Top 3 by answerCount (or just first 3 if no answers yet)
  const topQuestions = [...openQuestions].sort((a, b) => b.answerCount - a.answerCount).slice(0, 3);
  const otherQuestions = openQuestions.filter((q) => !topQuestions.find((t) => t.id === q.id));

  logger.info({ total: openQuestions.length, topIds: topQuestions.map((q) => q.id.slice(-6)) });

  // ── Step 4: Post answers via API (3-5 per question) ───────────────────────
  logger.info('=== Posting answers (3-5 per question) ===');
  const shuffledForAnswers = shuffle(students);

  for (const q of openQuestions) {
    const isTop = topQuestions.some((t) => t.id === q.id);
    const numRespondents = isTop ? 5 : 3 + Math.floor(Math.random() * 2);
    const respondents = shuffle(shuffledForAnswers).slice(0, numRespondents);

    for (const student of respondents) {
      const { accessToken } = await getStudentToken(student.email, tokenCache);
      const body = pickRandom(ANSWER_BODIES);
      try {
        await httpPost(`/api/qna/questions/${q.id}/answers`, accessToken, { body });
        logger.info({ student: student.email, questionId: q.id.slice(-6) }, 'Answer posted');
      } catch (e) {
        logger.warn({ err: (e as Error).message, student: student.email });
      }
      await sleep(300);
    }
  }

  // ── Step 5: Vote on newly created answers (using allowPending=true) ──────────
  const allAnswersForVoting: { id: string; questionId: string }[] = [];

  for (const q of openQuestions) {
    const pendingData = await httpGet(`/api/moderation/questions/${q.id}/pending-answers?limit=10`, modToken) as { data: { id: string }[] };
    for (const a of pendingData.data) {
      allAnswersForVoting.push({ id: a.id, questionId: q.id });
    }
    await sleep(100);
  }
  logger.info({ answerCount: allAnswersForVoting.length }, 'Pending answers found for voting');

  logger.info('=== Voting on pending answers ===');
  await sleep(500);

  const votingStudents = shuffle(students).slice(0, 18);

  for (const answer of allAnswersForVoting) {
    const isTop = topQuestions.some((t) => t.id === answer.questionId);
    const numVoters = isTop ? 6 + Math.floor(Math.random() * 3) : 3 + Math.floor(Math.random() * 2);
    const voters = shuffle(votingStudents).slice(0, numVoters);

    for (const voter of voters) {
      const { accessToken } = await getStudentToken(voter.email, tokenCache);
      const direction = Math.random() < 0.8 ? 'up' : 'down';
      try {
        // Use allowPending=true so voting works on pending answers
        await httpPost(`/api/qna/answers/${answer.id}/vote/${direction}?allowPending=true`, accessToken, {});
      } catch { /* own answer or already voted */ }
    }
    await sleep(50);
  }

  // ── Step 5: Ensure top 3 questions have net positive votes ─────────────────
  logger.info('=== Ensuring top 3 have net positive votes ===');
  await sleep(500);
  for (const q of topQuestions) {
    const answersData = await httpGet(`/api/qna/questions/${q.id}/answers`, modToken) as { data: { id: string; upvoteCount: number; downvoteCount: number }[] };
    for (const a of answersData.data) {
      if (a.downvoteCount > a.upvoteCount) {
        const extra = a.downvoteCount - a.upvoteCount + 1;
        const extraVoters = shuffle(votingStudents).slice(0, extra);
        for (const voter of extraVoters) {
          const { accessToken } = await getStudentToken(voter.email, tokenCache);
          try {
            await httpPost(`/api/qna/answers/${a.id}/vote/up?allowPending=true`, accessToken, {});
          } catch { /* ignore */ }
          await sleep(50);
        }
      }
    }
  }

  await disconnectDatabase();
  logger.info('✅ Full simulation complete.', {
    questionsCreated: createdQuestionIds.length,
    totalQuestions: openQuestions.length,
    topQuestionIds: topQuestions.map((q) => q.id),
    totalAnswers: allAnswersForVoting.length,
    votingStudents: votingStudents.length,
  });
}

simulate().catch(async (err) => {
  logger.error({ err }, 'Simulation failed');
  await disconnectDatabase().catch(() => undefined);
  process.exit(1);
});