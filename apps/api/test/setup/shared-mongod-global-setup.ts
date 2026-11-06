import { MongoMemoryServer } from 'mongodb-memory-server';
import type { TestProject } from 'vitest/node';

// mongodb-memory-server defaults to 10 s, which a cold mongod exceeds on a loaded machine.
const MONGOD_LAUNCH_TIMEOUT_MS = 120_000;

declare module 'vitest' {
  export interface ProvidedContext {
    mongoBaseUri: string;
  }
}

/** One mongod for the whole run; each test file picks its own database name on it. */
export default async function setup(project: TestProject): Promise<() => Promise<void>> {
  const mongod = await MongoMemoryServer.create({ instance: { launchTimeout: MONGOD_LAUNCH_TIMEOUT_MS } });
  project.provide('mongoBaseUri', mongod.getUri());
  return async () => {
    await mongod.stop();
  };
}
