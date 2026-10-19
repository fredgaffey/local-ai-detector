import { describe, expect, test } from "vitest";
import { cuesToParagraphs, transcriptToText } from "./exportTranscript";

const cues = [
  { start: 0, dur: 4, text: "Hello and welcome." },
  { start: 4, dur: 4, text: "[Music]" },
  { start: 8, dur: 25, text: "Today we look at   rockets." },
  { start: 33, dur: 5, text: "First, fuel" },
  { start: 95, dur: 3, text: "and that is it" },
];

describe("transcript export", () => {
  test("paragraphs break at a sentence end after 30 s, or at 60 s regardless; sound tags dropped", () => {
    expect(cuesToParagraphs(cues)).toEqual([
      { start: 0, text: "Hello and welcome. Today we look at rockets." },
      { start: 33, text: "First, fuel and that is it" },
    ]);
  });
  test("title, link, then timestamped paragraphs", () => {
    expect(transcriptToText(cues, { title: "Rockets", url: "https://www.youtube.com/watch?v=abc" })).toBe(
      "Rockets\nhttps://www.youtube.com/watch?v=abc\n\n[0:00] Hello and welcome. Today we look at rockets.\n\n[0:33] First, fuel and that is it\n",
    );
  });
  test("timestamps can be left out", () => {
    expect(transcriptToText(cues.slice(0, 1), { timestamps: false })).toBe("Hello and welcome.\n");
  });
});
