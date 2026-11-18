import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';

const ENV_NAMES = [
  'SystemRoot', 'WINDIR', 'ComSpec', 'PATH', 'PATHEXT', 'TEMP', 'TMP', 'USERPROFILE',
  'LOCALAPPDATA', 'APPDATA', 'ProgramData', 'ProgramFiles', 'ProgramFiles(x86)',
  'NUMBER_OF_PROCESSORS', 'PROCESSOR_ARCHITECTURE', 'CODEX_HOME', 'OPENAI_API_KEY', 'CODEX_API_KEY',
];
const DISABLED_FEATURES = [
  'shell_tool', 'apps', 'plugins', 'remote_plugin', 'hooks', 'multi_agent', 'multi_agent_v2',
  'image_generation', 'view_image', 'browser_use', 'computer_use', 'in_app_browser', 'skill_search',
  'skill_mcp_dependency_install', 'workspace_dependencies',
];

export const probeEnvironment = (): NodeJS.ProcessEnv => Object.fromEntries(
  Object.entries(process.env).filter(([name, value]) => ENV_NAMES.some((allowed) => allowed.toLowerCase() === name.toLowerCase())
    && !/u30_import_[A-Za-z0-9_-]{16,}/.test(value ?? '')),
);

export const redactProbeText = (text: string): string => {
  let result = text.replace(/\bu30_import_[A-Za-z0-9_-]{16,}/g, '[REDACTED]')
    .replace(/\b(?:sk|rk|sess)-[A-Za-z0-9_-]{8,}/g, '[REDACTED]')
    .replace(/Bearer\s+[^\s"',;]+/gi, 'Bearer [REDACTED]')
    .replace(/((?:api[_-]?key|access[_-]?token|refresh[_-]?token|authorization)\s*[=:]\s*)[^\s,}]+/gi, '$1[REDACTED]');
  for (const name of ['OPENAI_API_KEY', 'CODEX_API_KEY', 'USERPROFILE']) {
    const value = process.env[name];
    if (value) result = result.split(value).join(name === 'USERPROFILE' ? '%USERPROFILE%' : '[REDACTED]');
  }
  return result.replace(/https?:\/\/[^\s"'<>]+/gi, (value) => {
    try { const url = new URL(value); return `${url.origin}${url.pathname}`; } catch { return '[URL]'; }
  });
};

export const readProbeConfig = () => {
  const file = path.join(process.env.CODEX_HOME || path.join(homedir(), '.codex'), 'config.toml');
  const contents = readFileSync(file, 'utf8');
  const names = new Set<string>();
  for (const line of contents.split(/\r?\n/)) {
    const match = /^\s*\[\s*mcp_servers\s*\.\s*(?:"([^"\\]+)"|'([^']+)'|([A-Za-z0-9_-]+))(?:\s*\.[^\]]+)?\s*\]\s*(?:#.*)?$/.exec(line);
    if (match) names.add(match[1] || match[2] || match[3]!);
  }
  const setting = (name: string) => new RegExp(`^\\s*${name}\\s*=\\s*"([^"\\r\\n]*)"\\s*$`, 'm').exec(contents)?.[1] ?? null;
  const selectedProvider = setting('model_provider');
  let currentProvider: string | undefined;
  let baseUrl: string | undefined;
  for (const line of contents.split(/\r?\n/)) {
    const section = /^\s*\[\s*model_providers\.(?:"([^"\\]+)"|'([^']+)'|([A-Za-z0-9_-]+))\s*\]/.exec(line);
    if (/^\s*\[/.test(line)) currentProvider = section ? section[1] || section[2] || section[3] : undefined;
    if (currentProvider === selectedProvider) baseUrl ||= /^\s*base_url\s*=\s*"([^"\r\n]*)"\s*$/.exec(line)?.[1];
  }
  return {
    file, hash: createHash('sha256').update(contents).digest('hex'), names: [...names],
    summary: { model: setting('model'), provider: selectedProvider, baseUrl: baseUrl ? redactProbeText(baseUrl) : null },
  };
};

const cliText = (executable: string, args: string[], cwd: string): string => {
  const result = spawnSync(executable, args, { cwd, env: probeEnvironment(), shell: false, windowsHide: true,
    encoding: 'utf8', timeout: 30_000, maxBuffer: 2 * 1024 * 1024 });
  if (result.error || result.status !== 0) throw new Error(redactProbeText(result.error?.message || result.stderr || 'Codex preflight failed'));
  return result.stdout;
};

export const isolatedProbeArgs = (executable: string, cwd: string, configNames: string[]) => {
  const args = ['--no-daemon', ...DISABLED_FEATURES.flatMap((name) => ['--disable', name])];
  const listed: unknown = JSON.parse(cliText(executable, [...args, 'mcp', 'list', '--json'], cwd));
  if (!Array.isArray(listed) || listed.some((entry) => !entry || typeof entry.name !== 'string')) {
    throw new Error('Không xác minh được danh sách MCP từ Codex CLI');
  }
  const names = [...new Set([...configNames, ...listed.map((entry: { name: string }) => entry.name)])];
  for (const name of names) {
    if (!/^[A-Za-z0-9_-]+$/.test(name)) throw new Error('Tên MCP cần profile riêng để cách ly an toàn');
    args.push('-c', `mcp_servers.${name}.enabled=false`, '-c', `mcp_servers.${name}.required=false`);
  }
  args.push('-a', 'never', '-c', 'web_search="disabled"', '-c', 'project_doc_max_bytes=0',
    '-c', 'agents.enabled=false', '-c', 'shell_environment_policy.inherit="none"',
    '-c', 'shell_environment_policy.include_only=[]');
  const verified: unknown = JSON.parse(cliText(executable, [...args, 'mcp', 'list', '--json'], cwd));
  if (!Array.isArray(verified) || verified.some((entry) => !entry || entry.enabled !== false)) {
    throw new Error('MCP kế thừa chưa được tắt hoàn toàn; không chạy phân tích');
  }
  return { args, disabledMcp: names.sort(), version: cliText(executable, ['--version'], cwd).trim() };
};

interface RunInput { executable: string; args: string[]; cwd: string; prompt: string; timeoutMs: number; maxOutputBytes: number }
export const runProbeCli = (input: RunInput): Promise<{
  exitCode: number | null; durationMs: number; eventTypes: string[]; failure: string | null; stderr: string;
  eventNotes: { type: string; atMs: number; message: string | null }[];
  turnCompletedAtMs: number | null; processExitAtMs: number | null; exitSignal: string | null;
}> => new Promise((resolve, reject) => {
  const started = Date.now();
  const child = spawn(input.executable, input.args, { cwd: input.cwd, env: probeEnvironment(),
    shell: false, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
  const eventTypes = new Set<string>();
  const eventNotes: { type: string; atMs: number; message: string | null }[] = [];
  let turnCompletedAtMs: number | null = null;
  let processExitAtMs: number | null = null;
  let failure: string | null = null;
  let stderr = '';
  let pending = '';
  let bytes = 0;
  const stop = (message: string) => { failure = message; child.kill(); };
  const timer = setTimeout(() => stop('Hết thời gian chờ Codex; chưa xác minh ảnh'), input.timeoutMs);
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', (chunk: string) => {
    bytes += Buffer.byteLength(chunk);
    if (bytes > input.maxOutputBytes) return stop('Output Codex vượt giới hạn');
    pending += chunk;
    let newline: number;
    while ((newline = pending.indexOf('\n')) >= 0) {
      const line = pending.slice(0, newline); pending = pending.slice(newline + 1);
      if (!line.trim()) continue;
      try {
        const event = JSON.parse(line) as { type?: string; error?: { message?: string }; message?: string;
          item?: { type?: string; message?: string; text?: string } };
        if (event.type) eventTypes.add(event.type);
        if (event.item?.type) eventTypes.add(`item:${event.item.type}`);
        if (event.type === 'turn.completed') turnCompletedAtMs = Date.now() - started;
        if (['thread.started', 'turn.started', 'turn.completed', 'turn.failed', 'error'].includes(event.type || '') || event.item?.type === 'error') {
          const message = event.item?.type === 'error' ? event.item.message || event.item.text : event.error?.message || event.message;
          if (eventNotes.length < 30) eventNotes.push({ type: event.item?.type === 'error' ? 'item:error' : event.type!,
            atMs: Date.now() - started, message: message ? redactProbeText(message).slice(0, 2000) : null });
        }
        if (event.item?.type && !['agent_message', 'reasoning', 'todo_list', 'error'].includes(event.item.type)) {
          stop(`Codex yêu cầu công cụ ngoài phạm vi: ${event.item.type}`);
        }
        if (event.type === 'turn.failed' || event.type === 'error') {
          failure = redactProbeText(event.error?.message || event.message || 'Codex turn failed').slice(0, 2000);
        }
      } catch { stop('Output sự kiện Codex không phải JSON hợp lệ'); }
    }
  });
  child.stderr.on('data', (chunk: string) => {
    bytes += Buffer.byteLength(chunk);
    stderr = (stderr + chunk).slice(-4000);
    if (bytes > input.maxOutputBytes) stop('Output Codex vượt giới hạn');
  });
  child.on('error', (error) => { clearTimeout(timer); reject(new Error(redactProbeText(error.message))); });
  child.on('exit', () => { processExitAtMs = Date.now() - started; });
  child.on('close', (exitCode, exitSignal) => {
    clearTimeout(timer);
    resolve({ exitCode, durationMs: Date.now() - started, eventTypes: [...eventTypes], failure, stderr: redactProbeText(stderr),
      eventNotes, turnCompletedAtMs, processExitAtMs, exitSignal });
  });
  child.stdin.on('error', () => { /* The exit handler records startup failures. */ });
  child.stdin.end(input.prompt);
});
