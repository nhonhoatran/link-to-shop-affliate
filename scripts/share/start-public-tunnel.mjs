// Starts the full Docker stack and exposes it through a Cloudflare quick tunnel in one command.
//
//   pnpm share              # rebuild images if code changed, then start
//   pnpm share --no-build   # reuse existing images (faster)
//   pnpm share --no-admin   # skip creating the admin account
//
// A quick tunnel URL is random and changes on every run, so SITE_URL, MEDIA_PUBLIC_BASE_URL and ALLOWED_ORIGIN
// are passed to compose as shell overrides (they win over .env) instead of editing .env.
// Once the stack is up, an admin account (SHARE_ADMIN_EMAIL) is created if it does not exist yet. Its password is
// SHARE_ADMIN_PASSWORD when set (shell, then .env), otherwise a random one printed once. The password reaches
// create-admin through stdin, never as an argument.
// Ctrl+C closes the tunnel; the containers keep running.
import { spawn, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const COMPOSE_BASE = ['compose', '--env-file', '.env', '-f', 'infra/docker-compose.yml'];
const COMPOSE_ARGS = [...COMPOSE_BASE, 'up', '-d'];
const DEFAULT_ADMIN_EMAIL = 'admin@under30ss.local';
const GENERATED_PASSWORD_BYTES = 15; // 20 base64url characters
const TUNNEL_URL_PATTERN = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/;
const TUNNEL_URL_TIMEOUT_MS = 60_000;
const READY_TIMEOUT_MS = 120_000;
const READY_POLL_MS = 2_000;

const fail = (message) => {
  console.error(`\n[share] ${message}`);
  process.exit(1);
};

const readEnvValue = (key) => {
  try {
    const line = readFileSync(resolve(ROOT, '.env'), 'utf8')
      .split(/\r?\n/)
      .find((entry) => entry.startsWith(`${key}=`));
    return line?.slice(key.length + 1).trim().replace(/^["']|["']$/g, '') || undefined;
  } catch {
    return undefined;
  }
};

const hasCommand = (command, args) => {
  const result = spawnSync(command, args, { stdio: 'ignore' });
  return !result.error && result.status === 0;
};

const shellQuote = (value) => `'${String(value).replaceAll("'", `'\\''`)}'`;

let dockerOnHost;

// Runs `docker <args>`. Docker may live only inside WSL on Windows machines (no docker.exe on PATH).
// `input` is written to stdin; `capture` returns stdout instead of printing it.
const runDocker = (args, { env = {}, input, capture = false } = {}) => {
  const options = { cwd: ROOT, encoding: 'utf8', input, stdio: [input === undefined ? 'inherit' : 'pipe', capture ? 'pipe' : 'inherit', 'inherit'] };
  dockerOnHost ??= hasCommand('docker', ['version']);
  if (dockerOnHost) return spawnSync('docker', args, { ...options, env: { ...process.env, ...env } });
  if (process.platform !== 'win32' || !hasCommand('wsl', ['-e', 'true'])) {
    fail('Docker not found. Install Docker (or Docker inside WSL on Windows).');
  }
  const wslRoot = spawnSync('wsl', ['-e', 'wslpath', '-a', ROOT], { encoding: 'utf8' }).stdout.trim();
  const envPrefix = Object.entries(env).map(([key, value]) => `${key}=${shellQuote(value)}`).join(' ');
  const script = `cd ${shellQuote(wslRoot)} && ${envPrefix} docker ${args.map(shellQuote).join(' ')}`;
  return spawnSync('wsl', ['-e', 'bash', '-lc', script], options);
};

const runCompose = (overrides, build) => runDocker(build ? [...COMPOSE_ARGS, '--build'] : COMPOSE_ARGS, { env: overrides });

const readSetting = (key) => process.env[key]?.trim() || readEnvValue(key);

const adminCount = (email) => {
  const db = readEnvValue('MONGO_DB') ?? 'under30ss';
  const lookup = runDocker(
    [...COMPOSE_BASE, 'exec', '-T', 'mongo', 'mongosh', '--quiet', db, '--eval', `print(db.adminusers.countDocuments({ email: ${JSON.stringify(email)} }))`],
    { capture: true },
  );
  const count = Number(lookup.stdout?.trim().split(/\s+/).pop());
  return lookup.status === 0 && !Number.isNaN(count) ? count : undefined;
};

// With SHARE_ADMIN_PASSWORD set, the admin is created or its password reset to that value on every run, so .env
// stays the source of truth. Without it, the admin is created once with a random password and later runs leave it alone.
// Returns what to print in the summary.
const ensureAdmin = () => {
  const email = (readSetting('SHARE_ADMIN_EMAIL') ?? DEFAULT_ADMIN_EMAIL).toLowerCase();
  const configured = readSetting('SHARE_ADMIN_PASSWORD');

  if (!configured) {
    const count = adminCount(email);
    if (count === undefined) {
      console.warn('[share] Could not check admin accounts; skipped creating one.');
      return undefined;
    }
    if (count > 0) {
      console.log(`[share] Admin ${email} already exists (set SHARE_ADMIN_PASSWORD in .env to reset its password).`);
      return undefined;
    }
  }

  const password = configured ?? randomBytes(GENERATED_PASSWORD_BYTES).toString('base64url');
  console.log(`[share] ${configured ? 'Syncing' : 'Creating'} admin ${email} ...`);
  const result = runDocker(
    [...COMPOSE_BASE, 'exec', '-T', 'api', 'node', 'dist/scripts/create-admin.js', '--email', email, '--update-password'],
    { input: `${password}\n` },
  );
  if (result.status !== 0) {
    console.warn('[share] Admin setup failed, see output above. If the image predates --update-password, run "pnpm share" without --no-build.');
    return undefined;
  }
  return { email, generatedPassword: configured ? undefined : password };
};

const startTunnel = (localUrl) =>
  new Promise((resolveUrl, rejectUrl) => {
    const child = spawn('cloudflared', ['tunnel', '--no-autoupdate', '--url', localUrl], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let found = false;
    const timer = setTimeout(() => rejectUrl(new Error('Timed out waiting for the tunnel URL.')), TUNNEL_URL_TIMEOUT_MS);
    const onData = (chunk) => {
      const match = !found && chunk.toString().match(TUNNEL_URL_PATTERN);
      if (!match) return;
      found = true;
      clearTimeout(timer);
      resolveUrl({ child, url: match[0] });
    };
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    child.on('error', (error) => {
      clearTimeout(timer);
      rejectUrl(error.code === 'ENOENT' ? new Error('cloudflared not found on PATH.') : error);
    });
    child.on('exit', (code) => {
      if (!found) {
        clearTimeout(timer);
        rejectUrl(new Error(`cloudflared exited early (code ${code}).`));
      }
    });
  });

// A fresh trycloudflare hostname takes a few seconds to resolve publicly.
const waitUntilReachable = async (url) => {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
      if (response.ok) return true;
    } catch {
      // DNS not propagated yet or stack still warming up.
    }
    await new Promise((done) => setTimeout(done, READY_POLL_MS));
  }
  return false;
};

const main = async () => {
  const build = !process.argv.includes('--no-build');
  const localUrl = `http://localhost:${readEnvValue('CADDY_HTTP_PORT') ?? '8080'}`;

  console.log(`[share] Opening Cloudflare tunnel to ${localUrl} ...`);
  const { child, url } = await startTunnel(localUrl).catch((error) => fail(error.message));
  console.log(`[share] Tunnel URL: ${url}`);

  const stopTunnel = () => {
    if (!child.killed) child.kill();
  };
  process.on('SIGINT', () => {
    stopTunnel();
    console.log('\n[share] Tunnel closed. Containers are still running.');
    process.exit(0);
  });
  child.on('exit', (code) => fail(`cloudflared stopped (code ${code}). Run "pnpm share" again.`));

  console.log(`[share] Starting Docker stack${build ? ' (with --build)' : ''} ...`);
  const overrides = {
    SITE_URL: url,
    MEDIA_PUBLIC_BASE_URL: `${url}/media`,
    ALLOWED_ORIGIN: `${url},${localUrl}`,
  };
  const compose = runCompose(overrides, build);
  if (compose.status !== 0) {
    stopTunnel();
    fail('docker compose failed, see output above.');
  }

  const admin = process.argv.includes('--no-admin') ? undefined : ensureAdmin();

  console.log('[share] Waiting for the public URL to answer ...');
  const reachable = await waitUntilReachable(url);
  if (!reachable) console.warn('[share] Public URL not answering yet; it may need a little longer.');

  console.log('\n========================================');
  console.log(`  Site : ${url}`);
  console.log(`  Admin: ${url}/admin`);
  console.log(`  Local: ${localUrl}`);
  if (admin) {
    console.log(`  Admin login: ${admin.email}`);
    console.log(`  Password   : ${admin.generatedPassword ?? '(SHARE_ADMIN_PASSWORD in .env)'}`);
  }
  console.log('========================================');
  if (admin?.generatedPassword) console.log('Save this password now: it is shown only once.');
  console.log('Keep this window open. Press Ctrl+C to close the tunnel.\n');
};

main();
