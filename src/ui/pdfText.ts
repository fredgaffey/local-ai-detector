// PDF -> plain text for scoring, with Mozilla's pdf.js (Apache-2.0). Used by
// the popup ("Check this PDF" on a PDF tab, and PDF files in the drop zone).
// Extension pages only: pdf.js runs its parser in a bundled module worker.
// Loaded lazily so the popup doesn't pay for it until a PDF is checked.
// Text only: no fonts are rendered and nothing extra is fetched.

/** Pages scored at most; the scorer only needs a long sample, not a whole book. */
export const MAX_PDF_PAGES = 150;
/** Pages scanned for text at most when choosing the sample (very long books). */
export const MAX_PDF_SCAN_PAGES = 3000;
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

/** Words on a page (whitespace-separated runs with a letter or digit). */
export function wordCount(text: string): number {
  return text.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}

/** Small deterministic PRNG (mulberry32), so a given PDF always samples the same pages. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Which pages to score when there are more than `max`: a random sample of
 * `max` from the wordiest 2×`max` pages (skipping covers, figures, tables and
 * reference lists that carry little prose), seeded so the same PDF always
 * gives the same pages. Returned in page order (0-based indexes).
 */
export function choosePages(words: readonly number[], max = MAX_PDF_PAGES, seed = 1): number[] {
  const w = (i: number) => words[i] ?? 0;
  const all = words.map((_, i) => i);
  if (all.length <= max) return all.filter((i) => w(i) > 0);
  const pool = [...all].sort((x, y) => w(y) - w(x) || x - y).slice(0, max * 2).filter((i) => w(i) > 0);
  const rand = rng(seed);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = pool[i] as number;
    pool[i] = pool[j] as number;
    pool[j] = tmp;
  }
  return pool.slice(0, max).sort((x, y) => x - y);
}

/** Seed from the file's size and a few of its bytes: same file, same pages. */
function seedFrom(bytes: Uint8Array): number {
  let h = bytes.length >>> 0;
  const step = Math.max(1, Math.floor(bytes.length / 64));
  for (let i = 0; i < bytes.length; i += step) h = Math.imul(h ^ (bytes[i] ?? 0), 2654435761) >>> 0;
  return h;
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
  const bytes = new Uint8Array(data);
  const seed = seedFrom(bytes);
  const task = pdfjs.getDocument({
    // pdf.js may transfer the buffer to its worker; keep our copy for nothing else.
    data: bytes.slice(),
    disableFontFace: true,
    useSystemFonts: false,
    // Nothing is fetched beyond the bytes handed in.
    disableAutoFetch: true,
    disableStream: true,
  });
  const doc = await task.promise;
  try {
    const scanned = Math.min(doc.numPages, MAX_PDF_SCAN_PAGES);
    const texts: string[] = [];
    for (let n = 1; n <= scanned; n++) {
      const page = await doc.getPage(n);
      const content = await page.getTextContent();
      texts.push(reflow(pageItemsToText(content.items as TextItemLike[])));
      page.cleanup();
    }
    const chosen = choosePages(texts.map(wordCount), MAX_PDF_PAGES, seed);
    const text = chosen.map((i) => texts[i] ?? "").join("\n\n").slice(0, MAX_PDF_CHARS);
    return { text, pages: doc.numPages, pagesRead: chosen.length };
  } finally {
    void task.destroy();
  }
}
