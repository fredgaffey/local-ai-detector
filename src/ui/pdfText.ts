// PDF -> plain text for scoring, with Mozilla's pdf.js (Apache-2.0). Used by
// the popup ("Check this PDF" on a PDF tab, and PDF files in the drop zone).
// Extension pages only: pdf.js runs its parser in a bundled module worker.
// Loaded lazily so the popup doesn't pay for it until a PDF is checked.
// Text only: no fonts are rendered and nothing extra is fetched.

/** Pages read at most; the scorer only needs a long sample, not a whole book. */
export const MAX_PDF_PAGES = 150;
/** Characters kept at most (well past what a Deep check reads). */
export const MAX_PDF_CHARS = 400_000;

interface TextItemLike {
  str?: string;
  hasEOL?: boolean;
}

/**
 * Joins one page's text items into lines. pdf.js gives a run per text chunk,
 * with hasEOL at line ends; lines are later re-flowed into paragraphs.
 */
export function pageItemsToText(items: readonly TextItemLike[]): string {
  let out = "";
  for (const it of items) {
    if (typeof it.str !== "string") continue;
    out += it.str;
    if (it.hasEOL) out += "\n";
  }
  return out;
}

/**
 * Re-flows hard-wrapped PDF lines into paragraphs: a line break inside a
 * paragraph becomes a space (a hyphen at the break is dropped when the next
 * line starts lowercase), and blank lines or short lines ending a sentence
 * end the paragraph.
 */
export function reflow(text: string): string {
  const lines = text.split("\n").map((l) => l.replace(/\s+/g, " ").trim());
  const paras: string[] = [];
  let cur = "";
  for (const line of lines) {
    if (!line) {
      if (cur) paras.push(cur);
      cur = "";
      continue;
    }
    if (!cur) cur = line;
    else if (/[a-z]-$/.test(cur) && /^[a-z]/.test(line)) cur = cur.slice(0, -1) + line;
    else cur += " " + line;
    // A short line ending a sentence is most likely a paragraph's last line.
    if (line.length < 50 && /[.!?:"”)]$/.test(line)) {
      paras.push(cur);
      cur = "";
    }
  }
  if (cur) paras.push(cur);
  return paras.join("\n\n");
}

export interface PdfText {
  text: string;
  pages: number;
  pagesRead: number;
}

export async function pdfToText(data: ArrayBuffer): Promise<PdfText> {
  const pdfjs = await import("pdfjs-dist");
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  const task = pdfjs.getDocument({
    data: new Uint8Array(data),
    disableFontFace: true,
    useSystemFonts: false,
    // Nothing is fetched beyond the bytes handed in.
    disableAutoFetch: true,
    disableStream: true,
  });
  const doc = await task.promise;
  try {
    const pagesRead = Math.min(doc.numPages, MAX_PDF_PAGES);
    const parts: string[] = [];
    let chars = 0;
    for (let n = 1; n <= pagesRead && chars < MAX_PDF_CHARS; n++) {
      const page = await doc.getPage(n);
      const content = await page.getTextContent();
      const t = reflow(pageItemsToText(content.items as TextItemLike[]));
      if (t) {
        parts.push(t);
        chars += t.length;
      }
      page.cleanup();
    }
    return { text: parts.join("\n\n").slice(0, MAX_PDF_CHARS), pages: doc.numPages, pagesRead };
  } finally {
    void task.destroy();
  }
}
