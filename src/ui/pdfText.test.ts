import { describe, expect, test } from "vitest";
import { pageItemsToText, reflow } from "./pdfText";

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
});
