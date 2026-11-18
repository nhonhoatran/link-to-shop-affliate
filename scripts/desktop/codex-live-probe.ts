import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  POSTER_ANALYSIS_JSON_SCHEMA, posterAnalysisSchema,
} from '../../packages/shared/src/poster-analysis-schema';
import { DEFAULT_POSTER_PROMPT, DEFAULT_POSTER_PROMPT_VERSION } from '../../packages/shared/src/poster-analysis-prompt';
import { isolatedProbeArgs, readProbeConfig, redactProbeText, runProbeCli } from './codex-probe-runtime';

const root = process.cwd();
const options = {
  executable: process.env.CODEX_PROBE_EXECUTABLE || 'codex',
  model: process.env.CODEX_PROBE_MODEL || 'gpt-6.1-sol',
  timeoutMs: Number(process.env.CODEX_PROBE_TIMEOUT_MS || 240_000),
  maxOutputBytes: Number(process.env.CODEX_PROBE_MAX_OUTPUT_BYTES || 1024 * 1024),
  output: path.resolve(root, process.env.CODEX_PROBE_OUTPUT || 'plans/reports/261118-codex-desktop-live-probe.json'),
};
if (![options.timeoutMs, options.maxOutputBytes].every((number) => Number.isSafeInteger(number) && number > 0)) {
  throw new Error('Giới hạn phép thử phải là số nguyên dương');
}
const samples = process.argv.slice(2).length ? process.argv.slice(2) : [
  'assets-source/lookbook-samples/outfit-mesh-84-reference.png',
  'assets-source/lookbook-samples/outfit-dramatic-reference.png',
];

const main = async () => {
  const configBefore = readProbeConfig();
  const workspace = await mkdtemp(path.join(tmpdir(), 'under30ss-codex-probe-'));
  const isolated = isolatedProbeArgs(options.executable, workspace, configBefore.names);
  const report = {
    recordedAt: new Date().toISOString(), engine: 'Codex CLI', version: isolated.version,
    model: options.model, globalConfig: configBefore.summary, promptVersion: DEFAULT_POSTER_PROMPT_VERSION,
    promptSha256: createHash('sha256').update(DEFAULT_POSTER_PROMPT).digest('hex'),
    schemaSha256: createHash('sha256').update(JSON.stringify(POSTER_ANALYSIS_JSON_SCHEMA)).digest('hex'),
    isolation: { sandbox: 'read-only', approvals: 'never', ephemeral: true, shell: false,
      mcpVerifiedDisabled: isolated.disabledMcp, websiteTokenForwarded: false,
      inputBasename: 'input.png', toolEventsFailClosed: true, configUnchanged: false },
    limits: { timeoutMs: options.timeoutMs, maxOutputBytes: options.maxOutputBytes },
    samples: [] as Record<string, unknown>[],
  };
  for (const [index, sample] of samples.entries()) {
    const directory = path.join(workspace, `sample-${index + 1}`);
    await mkdir(directory);
    const bytes = await readFile(path.resolve(root, sample));
    const imagePath = path.join(directory, 'input.png');
    const schemaPath = path.join(directory, 'analysis.schema.json');
    const resultPath = path.join(directory, 'result.json');
    await writeFile(imagePath, bytes);
    await writeFile(schemaPath, JSON.stringify(POSTER_ANALYSIS_JSON_SCHEMA));
    const args = [...isolated.args, 'exec', '--sandbox', 'read-only', '--skip-git-repo-check',
      '--ephemeral', '--ignore-rules', '--json', '--color', 'never', '--model', options.model,
      '--image', imagePath, '--output-schema', schemaPath, '--output-last-message', resultPath, '-'];
    const run = await runProbeCli({ executable: options.executable, args, cwd: directory,
      prompt: DEFAULT_POSTER_PROMPT, timeoutMs: options.timeoutMs, maxOutputBytes: options.maxOutputBytes });
    let analysis: unknown = null;
    let parseError: string | null = null;
    try {
      if ((await stat(resultPath)).size > options.maxOutputBytes) throw new Error('Output vượt giới hạn');
      const result = posterAnalysisSchema.safeParse(JSON.parse(await readFile(resultPath, 'utf8')));
      if (result.success) analysis = result.data;
      else parseError = result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ');
    } catch { parseError = 'Không có câu trả lời cuối dạng JSON để kiểm tra'; }
    const succeeded = run.exitCode === 0 && !run.failure && run.turnCompletedAtMs !== null && analysis !== null;
    const record = { source: sample.replaceAll('\\', '/'), sourceSha256: createHash('sha256').update(bytes).digest('hex'),
      status: succeeded ? 'validated' : 'not_verified', ...run, parseError,
      analysis: succeeded ? analysis : null, unverifiedAnalysis: succeeded ? null : analysis };
    report.samples.push(record);
    report.isolation.configUnchanged = readProbeConfig().hash === configBefore.hash;
    await mkdir(path.dirname(options.output), { recursive: true });
    await writeFile(options.output, JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify({ source: record.source, status: record.status, exitCode: run.exitCode,
      durationMs: run.durationMs, failure: run.failure, parseError }));
  }
  console.log(`Evidence: ${path.relative(root, options.output).replaceAll('\\', '/')}`);
  if (report.samples.some((sample) => sample.status !== 'validated')) process.exitCode = 1;
};

main().catch((error: unknown) => {
  console.error(redactProbeText(error instanceof Error ? error.message : String(error)));
  process.exitCode = 1;
});
