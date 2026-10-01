import { describe, expect, test } from "vitest";
import { AUTO_SITES, autoSiteMatches, isAutoSite } from "./autoSites";

describe("autoSites", () => {
  test("listed hosts and their subdomains match; lookalikes don't", () => {
    expect(isAutoSite("reddit.com")).toBe(true);
    expect(isAutoSite("old.reddit.com")).toBe(true);
    expect(isAutoSite("en.wikipedia.org")).toBe(true);
    expect(isAutoSite("notreddit.com")).toBe(false);
    expect(isAutoSite("paulgraham.com")).toBe(false);
  });
  test("two match patterns per host, no duplicates", () => {
    const m = autoSiteMatches();
    expect(m.length).toBe(AUTO_SITES.length * 2);
    expect(new Set(AUTO_SITES).size).toBe(AUTO_SITES.length);
  });
});
