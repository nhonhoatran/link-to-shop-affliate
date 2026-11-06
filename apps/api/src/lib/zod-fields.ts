import type { ZodIssue } from 'zod';

/** First message per dotted path wins; root-level issues go under "body". */
export const zodIssuesToFields = (issues: readonly ZodIssue[]): Record<string, string> => {
  const fields: Record<string, string> = {};
  for (const issue of issues) {
    const path = issue.path.join('.') || 'body';
    fields[path] ??= issue.message;
  }
  return fields;
};
