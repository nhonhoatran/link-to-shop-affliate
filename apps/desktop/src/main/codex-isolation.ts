import { z } from 'zod';
import type { DesktopSettings } from '@under30ss/shared';
import { runBoundedProcess } from './bounded-process';

const ENV_NAMES = ['SYSTEMROOT', 'WINDIR', 'COMSPEC', 'PATH', 'PATHEXT', 'TEMP', 'TMP', 'HOME', 'USERPROFILE',
  'LOCALAPPDATA', 'APPDATA', 'PROGRAMDATA', 'PROGRAMFILES', 'PROGRAMFILES(X86)', 'HOMEDRIVE', 'HOMEPATH',
  'NUMBER_OF_PROCESSORS', 'PROCESSOR_ARCHITECTURE', 'CODEX_HOME', 'OPENAI_API_KEY', 'CODEX_API_KEY',
  'HTTP_PROXY', 'HTTPS_PROXY', 'ALL_PROXY', 'NO_PROXY'];
export const codexEnvironment = (source: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv =>
  Object.fromEntries(Object.entries(source).filter(([name, value]) => ENV_NAMES.includes(name.toUpperCase())
    && !/u30_import_[A-Za-z0-9_-]{16,}/.test(value ?? '')));

const DISABLED_FEATURES = ['shell_tool', 'apps', 'plugins', 'remote_plugin', 'hooks', 'multi_agent', 'multi_agent_v2',
  'image_generation', 'view_image', 'browser_use', 'computer_use', 'in_app_browser', 'skill_search',
  'skill_mcp_dependency_install', 'workspace_dependencies'];
const mcpListSchema = z.array(z.object({ name: z.string(), enabled: z.boolean() }));
export const codexExecutable = (configured: string): string => {
  if (/\.(?:cmd|bat|ps1)$/i.test(configured)) throw new Error('Chọn executable Codex gốc (.exe trên Windows), không dùng shell script');
  return process.platform === 'win32' && configured === 'codex' ? 'codex.exe' : configured;
};
export const isolateCodex = async (settings: DesktopSettings, cwd: string, signal: AbortSignal) => {
  const executable = codexExecutable(settings.cli.executable);
  const env = codexEnvironment();
  const args = ['--no-daemon', ...DISABLED_FEATURES.flatMap((name) => ['--disable', name])];
  if (settings.cli.profile) args.push('--profile', settings.cli.profile);
  const run = async (argv: string[]) => {
    const result = await runBoundedProcess({ executable, args: argv, env, cwd, signal,
      timeoutMs: settings.limits.analysisTimeoutMs, maxOutputBytes: settings.limits.maxOutputBytes });
    if (result.exitCode !== 0) throw new Error('Codex không đọc được cấu hình. Kiểm tra executable/profile và chạy codex --version.');
    return result.stdout;
  };
  const effective = mcpListSchema.parse(JSON.parse(await run([...args, 'mcp', 'list', '--json'])));
  for (const server of effective) {
    if (!/^[A-Za-z0-9_-]+$/.test(server.name)) throw new Error('Tên MCP có ký tự đặc biệt; hãy dùng profile Codex không có MCP này để phân tích');
    args.push('-c', `mcp_servers.${server.name}.enabled=false`, '-c', `mcp_servers.${server.name}.required=false`);
  }
  args.push('-a', 'never', '-c', 'web_search="disabled"', '-c', 'project_doc_max_bytes=0',
    '-c', 'agents.enabled=false', '-c', 'shell_environment_policy.inherit="none"', '-c', 'shell_environment_policy.include_only=[]');
  const verified = mcpListSchema.parse(JSON.parse(await run([...args, 'mcp', 'list', '--json'])));
  if (verified.some((server) => server.enabled)) throw new Error('MCP kế thừa chưa tắt hoàn toàn; đã chặn phân tích');
  return { executable, env, args };
};
