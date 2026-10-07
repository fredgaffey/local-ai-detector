// Which theme an in-page chip should use. On YouTube the page's own theme
// wins (it sets <html dark> in dark mode and nothing in light mode), so the
// chips match YouTube even when it disagrees with the system setting.
// Elsewhere, follow the system.

export type Theme = "light" | "dark";

export function pageTheme(doc: Document = document, win: Window = window): Theme {
  try {
    if (/(^|\.)youtube\.com$/.test(doc.location?.hostname ?? "")) {
      return doc.documentElement.hasAttribute("dark") ? "dark" : "light";
    }
    return win.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  } catch {
    return "light";
  }
}
