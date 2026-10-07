import { describe, expect, test } from "vitest";
import { pageTheme } from "./pageTheme";

function fakeDoc(hostname: string, dark: boolean): Document {
  return { location: { hostname }, documentElement: { hasAttribute: (a: string) => dark && a === "dark" } } as unknown as Document;
}
const sys = (dark: boolean) => ({ matchMedia: () => ({ matches: dark }) }) as unknown as Window;

describe("pageTheme", () => {
  test("YouTube light theme stays light even when the system is dark", () => {
    expect(pageTheme(fakeDoc("www.youtube.com", false), sys(true))).toBe("light");
  });
  test("YouTube dark theme is dark even when the system is light", () => {
    expect(pageTheme(fakeDoc("m.youtube.com", true), sys(false))).toBe("dark");
  });
  test("other sites follow the system", () => {
    expect(pageTheme(fakeDoc("example.com", false), sys(true))).toBe("dark");
    expect(pageTheme(fakeDoc("example.com", false), sys(false))).toBe("light");
  });
});
