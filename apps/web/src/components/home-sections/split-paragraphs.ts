/** Paragraphs are separated by blank lines; the text is never treated as HTML. */
export const splitParagraphs = (body: string): string[] =>
  body
    .split(/\r?\n\s*\r?\n/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph !== '');
