/** Convert stored rich-text HTML to plain text and compute statistics. */

export function htmlToPlainText(html: string): string {
  if (!html) return "";
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(div|p|h[1-6]|li|blockquote)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export interface DocCounts {
  wordCount: number;
  charCount: number;
  lineCount: number;
}

export function computeCounts(plainText: string): DocCounts {
  const text = plainText ?? "";
  const words = text.length === 0 ? 0 : text.split(/\s+/).filter(Boolean).length;
  return {
    wordCount: words,
    charCount: text.length,
    lineCount: text.length === 0 ? 0 : text.split("\n").length,
  };
}

export function computeFromHtml(html: string): DocCounts & { plainText: string } {
  const plainText = htmlToPlainText(html);
  return { plainText, ...computeCounts(plainText) };
}
