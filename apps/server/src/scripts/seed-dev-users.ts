// ⚠️ DEV-ONLY — REMOVE BEFORE PRODUCTION RELEASE.
//
// Seeds the three test accounts that back the login page's dev role-switcher.
// Refuses to run when NODE_ENV=production as a defense-in-depth guard.
//
// Run via: `npm run seed:dev-users` (from the server workspace)
// Or:      `npm --workspace @samagama/server run seed:dev-users`
//
// Credentials must stay in sync with apps/client/src/features/auth/DevCredentials.tsx.
//
// To remove cleanly:
//   1. Delete this file.
//   2. Delete the `seed:dev-users` script in apps/server/package.json.

import bcrypt from 'bcryptjs';
import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { UserModel } from '../models/User.model.js';
import type { UserRole } from '@samagama/shared';

interface DevSeedAccount {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

const DEV_USERS: DevSeedAccount[] = [
  {
    name: 'Admin (Dev)',
    email: 'admin@samagama.test',
    password: 'AdminDev!2024',
    role: 'admin',
  },
  {
    name: 'Moderator (Dev)',
    email: 'moderator@samagama.test',
    password: 'ModDev!2024',
    role: 'moderator',
  },
  {
    name: 'Student (Dev)',
    email: 'student@samagama.test',
    password: 'StudentDev!2024',
    role: 'student',
  },
];

async function seedDevUsers(): Promise<void> {
  if (env.isProduction) {
    logger.error('Refusing to seed dev users in production. Aborting.');
    process.exit(1);
  }

  await connectDatabase();

  for (const account of DEV_USERS) {
    const passwordHash = await bcrypt.hash(account.password, 12);
    const result = await UserModel.findOneAndUpdate(
      { email: account.email },
      {
        $set: {
          name: account.name,
          passwordHash,
          role: account.role,
          status: 'active',
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    logger.info({ email: result.email, role: result.role }, 'Dev user upserted');
  }

  await disconnectDatabase();
  logger.info('✅ Dev users seeded.');
}

seedDevUsers().catch(async (err) => {
  logger.error({ err }, 'Failed to seed dev users');
  await disconnectDatabase().catch(() => undefined);
  process.exit(1);
});
