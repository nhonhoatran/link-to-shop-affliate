import { createAdminInputSchema } from '@under30ss/shared';
import { getEnv } from '../config/env-config';
import { connectMongo, disconnectMongo } from '../db/mongo-connection';
import { loadDotenv } from '../lib/load-dotenv';
import { zodIssuesToFields } from '../lib/zod-fields';
import { createAdmin, setAdminPassword } from '../services/admin-user-service';
import { createPrompter } from './terminal-prompt';

const readEmailArg = (argv: string[]): string | undefined => {
  if (argv.some((arg) => arg === '--password' || arg.startsWith('--password='))) {
    throw new Error('Passwords are never accepted as arguments; omit --password and type it when prompted');
  }
  const index = argv.findIndex((arg) => arg === '--email' || arg.startsWith('--email='));
  if (index === -1) return undefined;
  const arg = argv[index] ?? '';
  return arg.startsWith('--email=') ? arg.slice('--email='.length) : argv[index + 1];
};

const main = async (): Promise<void> => {
  loadDotenv();
  const prompter = createPrompter();
  const email = readEmailArg(process.argv.slice(2)) ?? (await prompter.ask('Admin email: '));
  const password = await prompter.askHidden('Password (min 8 characters): ');
  if (process.stdin.isTTY && password !== (await prompter.askHidden('Repeat password: '))) {
    throw new Error('Passwords do not match');
  }

  const parsed = createAdminInputSchema.safeParse({ email, password });
  if (!parsed.success) {
    const details = Object.entries(zodIssuesToFields(parsed.error.issues)).map(([field, message]) => `${field}: ${message}`);
    throw new Error(`Invalid input - ${details.join('; ')}`);
  }

  const env = getEnv();
  await connectMongo(env.MONGODB_URI);
  try {
    // --update-password: an existing admin with this email gets the new password instead of a "duplicate" error.
    const updated = process.argv.includes('--update-password')
      ? await setAdminPassword(parsed.data.email, parsed.data.password)
      : null;
    if (updated) {
      console.log(`Updated password of admin ${updated.email} (${updated.id})`);
    } else {
      const admin = await createAdmin(parsed.data.email, parsed.data.password);
      console.log(`Created admin ${admin.email} (${admin.id})`);
    }
  } finally {
    await disconnectMongo();
  }
};

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
