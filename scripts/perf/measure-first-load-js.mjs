// Sums the encoded (compressed on the wire) size of every script a page loads, as Next 16 no longer prints
// "First Load JS". Run against a production server: `next start -p 3100`.
//
//   node scripts/perf/measure-first-load-js.mjs --base http://localhost:3100 --paths / /looks --runs 3 [--grep <text>]
//
// --grep lists the script chunks whose body contains <text>, to see which chunk carries a library.
import { chromium } from '@playwright/test';

const DEFAULT_RUNS = 3;
const DEFAULT_BASE = 'http://localhost:3100';

const parseArgs = (argv) => {
  const options = { base: DEFAULT_BASE, paths: [], runs: DEFAULT_RUNS, grep: null };
  let current = null;
  for (const arg of argv) {
    if (arg.startsWith('--')) {
      current = arg.slice(2);
      if (!['base', 'paths', 'runs', 'grep'].includes(current)) throw new Error(`Unknown option --${current}`);
      continue;
    }
    if (current === 'paths') options.paths.push(arg);
    else if (current === 'runs') options.runs = Number(arg);
    else if (current === 'base') options.base = arg;
    else if (current === 'grep') options.grep = arg;
    else throw new Error(`Unexpected argument ${arg}`);
  }
  if (options.paths.length === 0) options.paths.push('/');
  if (!Number.isInteger(options.runs) || options.runs < 1) throw new Error('--runs must be a positive integer');
  return options;
};

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

async function measureOnce(browser, url, grep) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const pending = [];
  page.on('response', (response) => {
    const request = response.request();
    if (request.resourceType() !== 'script') return;
    pending.push(
      (async () => {
        const sizes = await request.sizes();
        const matches = grep ? (await response.text()).includes(grep) : false;
        return { url: response.url(), bytes: sizes.responseBodySize, matches };
      })().catch((error) => ({ url: response.url(), bytes: 0, matches: false, error: String(error) })),
    );
  });
  const response = await page.goto(url, { waitUntil: 'networkidle' });
  if (!response || !response.ok()) throw new Error(`${url} answered ${response?.status() ?? 'no response'}`);
  const scripts = await Promise.all(pending);
  await context.close();
  return scripts;
}

async function main() {
  const { base, paths, runs, grep } = parseArgs(process.argv.slice(2));
  const browser = await chromium.launch();
  const report = [];
  try {
    for (const path of paths) {
      const totals = [];
      let lastScripts = [];
      for (let run = 0; run < runs; run += 1) {
        lastScripts = await measureOnce(browser, new URL(path, base).toString(), grep);
        totals.push(lastScripts.reduce((sum, script) => sum + script.bytes, 0));
      }
      report.push({
        path,
        runsKb: totals.map((bytes) => Number((bytes / 1024).toFixed(1))),
        medianKb: Number((median(totals) / 1024).toFixed(1)),
        scriptCount: lastScripts.length,
        ...(grep
          ? { chunksContaining: lastScripts.filter((s) => s.matches).map((s) => ({ url: s.url, kb: Number((s.bytes / 1024).toFixed(1)) })) }
          : {}),
      });
    }
  } finally {
    await browser.close();
  }
  console.log(JSON.stringify({ base, runs, grep, report }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
