import { describe, expect, test } from "vitest";
import { choosePages, pageItemsToText, reflow, wordCount } from "./pdfText";

describe("pdf text", () => {
  test("items join into lines at hasEOL", () => {
    expect(pageItemsToText([{ str: "Hello" }, { str: " world", hasEOL: true }, { str: "Next" }])).toBe("Hello world\nNext");
  });
  test("hard-wrapped lines re-flow into one paragraph; blank lines split paragraphs", () => {
    const text = "The quick brown fox jumps over the lazy dog and keeps\nrunning across the wide open field until the end of\nthe day.\n\nSecond paragraph here.";
    expect(reflow(text)).toBe(
      "The quick brown fox jumps over the lazy dog and keeps running across the wide open field until the end of the day.\n\nSecond paragraph here.",
    );
  });
  test("a hyphen at a line break joins the word", () => {
    expect(reflow("this is an extra-\nordinary result that continues on for a while longer here")).toBe(
      "this is an extraordinary result that continues on for a while longer here",
    );
  });
  test("word count ignores punctuation-only runs", () => {
    expect(wordCount("Hello, world — 42 times .")).toBe(4);
  });
  test("short PDFs: every page with text, in order", () => {
    expect(choosePages([10, 0, 30], 150)).toEqual([0, 2]);
  });
  test("long PDFs: max pages, drawn from the wordiest, in page order, same seed same pages", () => {
    const words = Array.from({ length: 1000 }, (_, i) => (i % 10 === 0 ? 5 : 300 + (i % 7)));
    const a = choosePages(words, 150, 42);
    expect(a.length).toBe(150);
    expect([...a].sort((x, y) => x - y)).toEqual(a);
    expect(a.every((i) => (words[i] ?? 0) >= 300)).toBe(true);
    expect(choosePages(words, 150, 42)).toEqual(a);
    expect(choosePages(words, 150, 7)).not.toEqual(a);
  });
});
