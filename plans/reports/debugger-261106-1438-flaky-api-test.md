# Flaky apps/api test: root cause + fix

## Reproduction
- Idle `pnpm test` x3: all green (58/58). Not reproducible without load.
- Added 12-24 busy-loop node processes (CPU burners) during api vitest / root `pnpm test`:
  - api run 2: `GenericMMSError: Instance failed to start within 10000ms` -> failures in auth-rate-limit,
    auth-cookie-flags, auth, seed (beforeAll/in-test `startTestApp`), plus `Cannot read properties of undefined (reading 'stop')` cascades.
  - api run 3: `Tests 43 passed (58)`, one worker died (exit 3221226505) in media-settings-admins; same overload.
  - Same symptom shape as the report: tests fail with "X passed (N)" and RECURSIVE_RUN_FIRST_FAIL.
- Exact failing test of the original incident was not captured; it is one of the files that boots mongod.

## Root cause (evidence)
- `test/helpers/test-app.ts` calls `MongoMemoryServer.create()` with no options. The library default
  `instance.launchTimeout` is 10 000 ms (error text above, MongoInstance.js:174).
- Every test file boots its own mongod (7 files, 9 `startTestApp` calls). With shared+api+web suites in parallel
  (web alone took 47 s under load) a cold mongod can exceed 10 s -> hard failure, not a slow pass.
- Secondary: auth-rate-limit/cookie-flags call `startTestApp` inside `it`, so mongod boot + argon2 hashes (semaphore=2) all count
  against the 30 s testTimeout; observed 25.4 s under load (thin margin). Argon2 verify is legitimately slow under CPU contention.
- Eliminated: race/featured test (deterministic mock), health 503 test (spies readyState), rate-limit windows (15 min), port reuse
  (stub uses port 0, mongod picks free ports), shared state (process.env cleaned in afterEach; vitest isolates files per worker).

## Fix (only test infra)
- `apps/api/test/helpers/test-app.ts`: `MongoMemoryServer.create({ instance: { launchTimeout: 60_000 } })` via named const + why-comment.
- `apps/api/vitest.config.ts`: `testTimeout` 30_000 -> 60_000 (only because mongod boot + argon2 are legitimately slow under parallel load;
  assertions untouched, no retries/skips).

## Verification
- Under 12 CPU burners, api vitest x3: 58/58 each (previously failed 2 of 3).
- Root `pnpm typecheck` then `pnpm test`, 5 consecutive runs, all exit 0:
  1-5: `packages/shared 30 passed (30)`, `apps/api 58 passed (58)`, `apps/web 150 passed (150)` each.

## Notes / unresolved
- Separate flake seen (out of scope, apps/web): `test/app/sitemap.test.ts > builds absolute URLs from SITE_URL, ignoring a trailing slash`
  failed once under heavy 24-burner load (47 s duration, likely default timeout). Needs its own look.
- Worker crash exit 3221226505 (0xC0000409) in media-settings-admins under extreme overload not root-caused (likely native sharp/mongod under
  memory/CPU pressure); did not recur after the fix.
- Residual: if CI is far slower than this machine, 60 s mongod launch may still be insufficient; consider a shared mongod via vitest globalSetup.

**Status:** DONE_WITH_CONCERNS
**Summary:** Flake = mongodb-memory-server default 10 s launch timeout exceeded when many suites boot mongod in parallel. Raised launchTimeout to 60 s and testTimeout to 60 s; 5/5 root runs green.
**Concerns/Blockers:** web sitemap test flaked under extreme synthetic load (out of my edit scope); exact original failing test name unconfirmed.
