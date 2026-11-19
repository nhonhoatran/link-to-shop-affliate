/* global window */
import { _electron, expect } from '@playwright/test';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const repo = path.resolve('../..');
const temporary = await mkdtemp(path.join(tmpdir(), 'under30ss-packaged-model-'));
const appData = path.join(temporary, 'appdata');
await mkdir(appData, { recursive: true });
const executable = path.resolve('dist/package/win-unpacked/Under30ss Importer.exe');
const env = { ...process.env, APPDATA: appData };
delete env.ELECTRON_RUN_AS_NODE;
let application;
const launch = async () => {
  application = await _electron.launch({ executablePath: executable, env, timeout: 30_000 });
  const page = await application.firstWindow();
  await expect(page.getByRole('heading', { name: 'Nhập bộ sưu tập bằng AI' })).toBeVisible();
  return page;
};
try {
  let page = await launch();
  const userData = await application.evaluate(({ app }) => app.getPath('userData'));
  const fresh = await page.evaluate(() => window.desktop.invoke('readSettings', {}));
  expect(fresh.settings.cli.model).toBe('gpt-6.1-sol');
  await application.close(); application = undefined;
  await writeFile(path.join(userData, 'settings.json'), JSON.stringify({ cli: { model: 'gpt-6-astra' } }));
  page = await launch();
  const migrated = await page.evaluate(() => window.desktop.invoke('readSettings', {}));
  expect(migrated.settings.cli.model).toBe('gpt-6.1-sol');
  expect(JSON.parse(await readFile(path.join(userData, 'settings.json'), 'utf8')).cli.model).toBe('gpt-6.1-sol');
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(executable)) hash.update(chunk);
  const report = { recordedAt: new Date().toISOString(), status: 'passed', artifact: path.relative(repo, executable),
    bytes: (await stat(executable)).size, sha256: hash.digest('hex'), freshDefault: fresh.settings.cli.model,
    legacySettingsMigrated: migrated.settings.cli.model };
  const reportPath = path.join(repo, 'plans/reports/desktop-ai-smoke/packaged-model.json');
  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report));
} finally {
  await application?.close();
  await rm(temporary, { recursive: true, force: true });
}
