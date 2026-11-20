/* global window */
import { _electron, expect } from '@playwright/test';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdtemp, mkdir, readFile, realpath, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const desktop = fileURLToPath(new URL('../', import.meta.url));
const repo = path.resolve(desktop, '../..');
const manifest = JSON.parse(await readFile(path.join(desktop, 'package.json'), 'utf8'));
const executable = path.join(desktop, manifest.build.directories.output, 'win-unpacked', `${manifest.build.productName}.exe`);
const reportPath = path.resolve(process.argv[2] ?? path.join(repo, 'plans/reports/desktop-ai-smoke/packaged-model.json'));
const temporaryRoot = await realpath(tmpdir());
const profilePrefix = 'under30ss-packaged-model-';
const profile = await mkdtemp(path.join(temporaryRoot, profilePrefix));
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
let application;
let cleanupError;
const launch = async () => {
  application = await _electron.launch({ executablePath: executable, args: [`--user-data-dir=${profile}`], env, timeout: 30_000 });
  const activeProfile = await application.evaluate(({ app }) => app.getPath('userData'));
  if (await realpath(activeProfile) !== profile) throw new Error('Packaged smoke did not start with its temporary profile');
  const page = await application.firstWindow();
  await expect(page.getByRole('heading', { name: 'Nhập bộ sưu tập bằng AI' })).toBeVisible();
  return page;
};
try {
  let page = await launch();
  const fresh = await page.evaluate(() => window.desktop.invoke('readSettings', {}));
  expect(fresh.settings.cli.model).toBe('gpt-6.1-sol');
  await application.close(); application = undefined;
  const settingsPath = path.join(profile, 'settings.json');
  await writeFile(settingsPath, JSON.stringify({ cli: { model: 'gpt-6-astra' } }));
  page = await launch();
  const migrated = await page.evaluate(() => window.desktop.invoke('readSettings', {}));
  expect(migrated.settings.cli.model).toBe('gpt-6.1-sol');
  expect(JSON.parse(await readFile(settingsPath, 'utf8')).cli.model).toBe('gpt-6.1-sol');
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(executable)) hash.update(chunk);
  const report = { recordedAt: new Date().toISOString(), status: 'passed', artifact: path.relative(repo, executable),
    bytes: (await stat(executable)).size, sha256: hash.digest('hex'), freshDefault: fresh.settings.cli.model,
    legacySettingsMigrated: migrated.settings.cli.model };
  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report));
} finally {
  try { await application?.close(); }
  finally {
    const cleanup = await realpath(profile);
    if (path.dirname(cleanup) !== temporaryRoot || !path.basename(cleanup).startsWith(profilePrefix)) {
      cleanupError = new Error('Refusing to remove a path outside the temporary smoke profile');
    } else {
      await rm(cleanup, { recursive: true, force: true, maxRetries: 3 });
    }
  }
}
if (cleanupError) throw cleanupError;
