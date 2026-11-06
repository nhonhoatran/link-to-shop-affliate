import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

// Local development only; containers receive real environment variables.
export const loadDotenv = (): void => {
  const candidates = [resolve(process.cwd(), '.env'), resolve(process.cwd(), '../../.env')];
  for (const file of candidates) {
    if (existsSync(file)) process.loadEnvFile(file);
  }
};
