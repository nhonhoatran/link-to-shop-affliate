import { execFile } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import path from 'node:path';

const execute = promisify(execFile);
const inspect = async (tag) => {
  const { stdout } = await execute('wsl', ['-d', 'Ubuntu', '--', 'docker', 'image', 'inspect', tag], { windowsHide: true, maxBuffer: 1024 * 1024 });
  return JSON.parse(stdout)[0];
};
const script = `const fs=require('node:fs');
const store='/repo/node_modules/.pnpm';
const packages=fs.existsSync(store)?fs.readdirSync(store).filter(name=>/^electron(?:@|-builder@)/.test(name)):[];
let resolves=false;try{require.resolve('electron',{paths:['/repo','/repo/apps/web','/repo/apps/api']});resolves=true;}catch{}
console.log(JSON.stringify({electronPackages:packages,electronResolves:resolves}));
if(packages.length||resolves)process.exitCode=1;`;
const results = [];
for (const tag of ['under30ss-api:desktop-import-check', 'under30ss-web:desktop-import-check']) {
  const image = await inspect(tag);
  const { stdout } = await execute('wsl', ['-d', 'Ubuntu', '--', 'docker', 'run', '--rm', '--read-only', '--entrypoint', 'node', tag, '-e', script],
    { windowsHide: true, maxBuffer: 1024 * 1024, timeout: 60_000 });
  const buildOnlyValuesPersisted = (image.Config.Env ?? []).some((entry) =>
    /^(?:API_INTERNAL_URL|SITE_URL|MEDIA_PUBLIC_BASE_URL|REVALIDATE_SECRET)=/.test(entry));
  if (buildOnlyValuesPersisted) throw new Error('Build-only environment unexpectedly persisted');
  results.push({ tag, imageId: image.Id, bytes: image.Size, ...JSON.parse(stdout.trim()), buildOnlyValuesPersisted });
}
const report = { recordedAt: new Date().toISOString(), status: 'passed', results,
  scope: 'Built server images; read-only one-shot Node checks. No API service, database, or object-storage connection started.' };
const output = path.resolve('plans/reports/261118-desktop-server-images.json');
await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report));
