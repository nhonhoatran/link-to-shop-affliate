import { spawn } from 'node:child_process';
import path from 'node:path';
import { StringDecoder } from 'node:string_decoder';

export interface BoundedProcessInput {
  executable: string; args: string[]; cwd: string; env: NodeJS.ProcessEnv;
  timeoutMs: number; maxOutputBytes: number; signal: AbortSignal; stdin?: string;
  onStdout?: (text: string) => void;
}
const terminateTree = (child: ReturnType<typeof spawn>) => {
  if (process.platform === 'win32' && child.pid) {
    const executable = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'taskkill.exe');
    const killer = spawn(executable, ['/pid', String(child.pid), '/t', '/f'], { shell: false, windowsHide: true, stdio: 'ignore' });
    killer.on('error', () => { child.kill(); });
  } else child.kill('SIGKILL');
};
export const runBoundedProcess = (input: BoundedProcessInput): Promise<{ stdout: string; stderr: string; exitCode: number | null }> =>
  new Promise((resolve, reject) => {
    if (input.signal.aborted) return reject(new Error('Đã hủy tác vụ'));
    const child = spawn(input.executable, input.args, { cwd: input.cwd, env: input.env, shell: false,
      windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    let size = 0;
    const stdoutDecoder = new StringDecoder('utf8');
    const stderrDecoder = new StringDecoder('utf8');
    let failure: Error | null = null;
    const stop = (reason: string) => { if (!failure) { failure = new Error(reason); terminateTree(child); } };
    const cancel = () => stop('Đã hủy tác vụ');
    const timeout = setTimeout(() => stop('Codex quá thời gian chờ. Kiểm tra kết nối hoặc tăng timeout rồi thử lại.'), input.timeoutMs);
    input.signal.addEventListener('abort', cancel, { once: true });
    child.stdout!.on('data', (buffer: Buffer) => {
      size += buffer.length;
      if (size > input.maxOutputBytes) return stop('Output Codex vượt giới hạn đã cấu hình');
      const text = stdoutDecoder.write(buffer); stdout += text;
      try { input.onStdout?.(text); } catch (error) { stop(error instanceof Error ? error.message : 'Sự kiện Codex không hợp lệ'); }
    });
    child.stderr!.on('data', (buffer: Buffer) => {
      size += buffer.length;
      if (size > input.maxOutputBytes) return stop('Output Codex vượt giới hạn đã cấu hình');
      stderr += stderrDecoder.write(buffer);
    });
    const cleanup = () => { clearTimeout(timeout); input.signal.removeEventListener('abort', cancel); };
    child.once('error', () => { cleanup(); reject(new Error('Không chạy được Codex CLI. Chọn đúng codex.exe đã cài trong cấu hình.')); });
    child.once('close', (exitCode) => {
      cleanup();
      stdout += stdoutDecoder.end(); stderr += stderrDecoder.end();
      if (failure) reject(failure); else resolve({ stdout, stderr, exitCode });
    });
    child.stdin!.on('error', () => { /* The process exit reports early failures. */ });
    child.stdin!.end(input.stdin ?? '');
  });
