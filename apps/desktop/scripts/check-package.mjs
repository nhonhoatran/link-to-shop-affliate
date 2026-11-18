import { execFile } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { stat, writeFile, mkdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { promisify } from 'node:util';
import path from 'node:path';

const unpacked = path.resolve('dist/package/win-unpacked');
const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const executable = path.join(unpacked, `${manifest.build.productName}.exe`);
const artifact = path.resolve(`dist/package/under30ss-importer-${manifest.version}-x64.exe`);
const source = `const sharp=require(${JSON.stringify(path.join(unpacked, 'resources/app.asar/node_modules/sharp'))});
sharp({create:{width:2,height:3,channels:3,background:'#ffffff'}}).png().toBuffer({resolveWithObject:true})
.then(({data,info})=>{console.log(JSON.stringify({width:info.width,height:info.height,format:info.format,bytes:data.length}));})
.catch(()=>{console.error('Packaged Sharp failed');process.exitCode=1;});`;
const result = await promisify(execFile)(executable, ['-e', source], {
  env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }, cwd: unpacked, windowsHide: true, timeout: 30_000, maxBuffer: 1024 * 1024,
});
const image = JSON.parse(result.stdout.trim());
if (image.width !== 2 || image.height !== 3 || image.format !== 'png') throw new Error('Packaged image pipeline failed');
const hash = createHash('sha256');
for await (const chunk of createReadStream(artifact)) hash.update(chunk);
const report = { recordedAt: new Date().toISOString(), status: 'passed', artifact: path.relative(path.resolve('../..'), artifact),
  bytes: (await stat(artifact)).size, sha256: hash.digest('hex'), packagedNativeSharp: image,
  signed: false, note: 'Portable build and packaged native image dependency verified; no installer or signed release validation.' };
const output = path.resolve('../../plans/reports/desktop-ai-smoke/package.json');
await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report));
