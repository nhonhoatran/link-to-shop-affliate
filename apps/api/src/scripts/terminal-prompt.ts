import { createInterface } from 'node:readline/promises';

export interface Prompter {
  ask(question: string): Promise<string>;
  askHidden(question: string): Promise<string>;
}

const readAllStdin = async (): Promise<string[]> => {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString('utf8').split(/\r?\n/);
};

const askVisible = async (question: string): Promise<string> => {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return (await rl.question(question)).trim();
  } finally {
    rl.close();
  }
};

const askHiddenOnTty = (question: string): Promise<string> =>
  new Promise((resolve, reject) => {
    const { stdin, stdout } = process;
    let value = '';
    const finish = (): void => {
      stdin.off('data', onData);
      stdin.setRawMode(false);
      stdin.pause();
      stdout.write('\n');
    };
    const onData = (chunk: string): void => {
      for (const char of chunk) {
        if (char === '\r' || char === '\n' || char === '\u0004') {
          finish();
          resolve(value);
          return;
        }
        if (char === '\u0003') {
          finish();
          reject(new Error('Cancelled'));
          return;
        }
        value = char === '\u007f' || char === '\b' ? value.slice(0, -1) : value + char;
      }
    };
    stdout.write(question);
    stdin.setRawMode(true);
    stdin.setEncoding('utf8');
    stdin.resume();
    stdin.on('data', onData);
  });

/** Interactive on a TTY (password is not echoed); reads one answer per line when stdin is piped. */
export const createPrompter = (): Prompter => {
  if (process.stdin.isTTY) return { ask: askVisible, askHidden: askHiddenOnTty };
  let lines: Promise<string[]> | undefined;
  const nextLine = async (): Promise<string> => {
    lines ??= readAllStdin();
    return ((await lines).shift() ?? '').trim();
  };
  return { ask: nextLine, askHidden: nextLine };
};
