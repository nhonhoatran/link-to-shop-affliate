import { copyFile, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { POSTER_ANALYSIS_JSON_SCHEMA, posterAnalysisSchema, resolveCodexModel, type DesktopSettings, type PosterAnalysis } from '@under30ss/shared';
import { readBoundedText } from './atomic-json';
import { runBoundedProcess } from './bounded-process';
import { isolateCodex } from './codex-isolation';

export const redactRuntimeError = (value: string): string => value
  .replace(/\bu30_import_[A-Za-z0-9_-]{16,}/g, '[REDACTED]')
  .replace(/\b(?:sk|rk|sess|imp|uit)_[A-Za-z0-9_-]{8,}/g, '[REDACTED]')
  .replace(/\b(?:sk|rk|sess)-[A-Za-z0-9_-]{8,}/g, '[REDACTED]')
  .replace(/Bearer\s+[^\s"',;]+/gi, 'Bearer [REDACTED]')
  .replace(/((?:api[_-]?key|access[_-]?token|refresh[_-]?token|authorization)\s*[=:]\s*)[^\s,}]+/gi, '$1[REDACTED]')
  .slice(0, 2000);

export const analyzePoster = async (
  sourcePath: string, settings: DesktopSettings, workRoot: string, signal: AbortSignal,
): Promise<PosterAnalysis> => {
  if (/u30_import_[A-Za-z0-9_-]{16,}/.test(settings.prompt.text)) throw new Error('Prompt chứa token website; hãy xóa token khỏi prompt trước khi phân tích');
  await mkdir(workRoot, { recursive: true });
  const directory = await mkdtemp(path.join(workRoot, 'analysis-'));
  try {
    const image = path.join(directory, 'input.png');
    const schema = path.join(directory, 'schema.json');
    const output = path.join(directory, 'result.json');
    await copyFile(sourcePath, image);
    await writeFile(schema, JSON.stringify(POSTER_ANALYSIS_JSON_SCHEMA));
    const isolated = await isolateCodex(settings, directory, signal);
    const args = [...isolated.args, 'exec', '--sandbox', 'read-only', '--skip-git-repo-check', '--ephemeral', '--ignore-rules',
      '--json', '--color', 'never', '--image', image, '--output-schema', schema, '--output-last-message', output];
    args.push('--model', resolveCodexModel(settings.cli.model));
    args.push('-');
    let pending = '';
    let runtimeFailure: string | undefined;
    const processLine = (line: string) => {
      if (!line.trim()) return;
      const event = JSON.parse(line) as { type?: string; message?: string; error?: { message?: string }; item?: { type?: string } };
      if (event.item?.type && !['agent_message', 'reasoning', 'todo_list', 'error'].includes(event.item.type)) {
        throw new Error('Codex yêu cầu công cụ ngoài phạm vi; đã dừng phân tích');
      }
      if (event.type === 'turn.failed' || event.type === 'error') runtimeFailure = event.error?.message || event.message || 'Lượt phân tích thất bại';
    };
    const result = await runBoundedProcess({ ...isolated, args, cwd: directory, signal,
      stdin: settings.prompt.text, timeoutMs: settings.limits.analysisTimeoutMs, maxOutputBytes: settings.limits.maxOutputBytes,
      onStdout: (chunk) => {
        pending += chunk;
        let newline: number;
        while ((newline = pending.indexOf('\n')) >= 0) { const line = pending.slice(0, newline); pending = pending.slice(newline + 1); processLine(line); }
      },
    });
    processLine(pending);
    if (result.exitCode !== 0 || runtimeFailure) {
      throw new Error(`Codex chưa phân tích được ảnh. ${redactRuntimeError(runtimeFailure || result.stderr || 'Kiểm tra đăng nhập, model và gateway rồi thử lại.')}`);
    }
    return posterAnalysisSchema.parse(JSON.parse(await readBoundedText(output, settings.limits.maxOutputBytes)));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Không phân tích được ảnh';
    // eslint-disable-next-line preserve-caught-error -- Raw provider causes may contain credentials.
    throw new Error(redactRuntimeError(message));
  } finally {
    // Only the private directory allocated above is removed; source files stay untouched.
    await rm(directory, { recursive: true, force: true });
  }
};
