// "Copy transcript" on the transcript chip: the video's transcript as plain
// text on the clipboard, in readable paragraphs with timestamps. Uses the
// same transcript the check reads (./acquire.ts), so it works whether or not
// YouTube's own panel is open, and on page videos with captions too.

import { cleanCueText, formatTimestamp, type Cue } from "./transcript";

export interface ExportOptions {
  title?: string;
  url?: string;
  /** "[m:ss]" at the start of each paragraph (default true). */
  timestamps?: boolean;
}

/** A paragraph ends at a sentence end after this many seconds, or after the hard limit regardless. */
const SOFT_PARAGRAPH_S = 30;
const HARD_PARAGRAPH_S = 60;

/** Cues -> paragraphs of whole sentences where the captions are punctuated. */
export function cuesToParagraphs(cues: readonly Cue[]): { start: number; text: string }[] {
  const out: { start: number; text: string }[] = [];
  let cur: { start: number; parts: string[] } | null = null;
  for (const c of cues) {
    const text = cleanCueText(c.text).replace(/\s+/g, " ").trim();
    if (!text) continue;
    cur ??= { start: c.start, parts: [] };
    cur.parts.push(text);
    const age = c.start + (c.dur ?? 0) - cur.start;
    if ((age >= SOFT_PARAGRAPH_S && /[.!?…]["”')\]]?$/.test(text)) || age >= HARD_PARAGRAPH_S) {
      out.push({ start: cur.start, text: cur.parts.join(" ") });
      cur = null;
    }
  }
  if (cur) out.push({ start: cur.start, text: cur.parts.join(" ") });
  return out;
}

export function transcriptToText(cues: readonly Cue[], opts: ExportOptions = {}): string {
  const head = [opts.title?.trim(), opts.url?.trim()].filter(Boolean).join("\n");
  const body = cuesToParagraphs(cues)
    .map((p) => (opts.timestamps === false ? p.text : `[${formatTimestamp(p.start)}] ${p.text}`))
    .join("\n\n");
  return head ? `${head}\n\n${body}\n` : `${body}\n`;
}

/**
 * Writes text to the clipboard from a content script (Chrome and Firefox).
 * Needs a recent click (transient user activation); the textarea fallback
 * covers pages where the async Clipboard API is blocked. False = not copied.
 */
export async function copyText(text: string, doc: Document = document): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // fall through
  }
  const ta = doc.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.cssText = "position:fixed !important; top:0; left:0; width:1px; height:1px; opacity:0; pointer-events:none;";
  const active = doc.activeElement as HTMLElement | null;
  doc.body.appendChild(ta);
  try {
    ta.select();
    return doc.execCommand("copy");
  } catch {
    return false;
  } finally {
    ta.remove();
    active?.focus?.({ preventScroll: true });
  }
}
