// "Run on every site" (Chrome). The manifest's content script only covers the
// curated list (src/shared/autoSites.ts). When the user grants the optional
// <all_urls> permission, the same script is registered dynamically for every
// other site; revoking it unregisters it. Because the permission is optional
// and already declared, turning this on never changes the install warning,
// and an update never disables the extension for existing users.
// Firefox matches <all_urls> in the manifest and needs none of this.

import { autoSiteMatches } from "../shared/autoSites";

const SCRIPT_ID = "lad-all-sites";
const CONTENT_SCRIPT = "content-scripts/content.js";
export const ALL_SITES = ["<all_urls>"];

export async function hasAllSites(): Promise<boolean> {
  try {
    return await browser.permissions.contains({ origins: ALL_SITES });
  } catch {
    return false;
  }
}

/** Registers or unregisters the everywhere script to match the permission. */
export async function syncAllSitesScript(): Promise<boolean> {
  const granted = await hasAllSites();
  const existing = await browser.scripting.getRegisteredContentScripts({ ids: [SCRIPT_ID] });
  if (granted && existing.length === 0) {
    await browser.scripting.registerContentScripts([
      {
        id: SCRIPT_ID,
        matches: ALL_SITES,
        // The manifest script already covers these.
        excludeMatches: autoSiteMatches(),
        js: [CONTENT_SCRIPT],
        runAt: "document_idle",
        persistAcrossSessions: true,
      },
    ]);
  } else if (!granted && existing.length > 0) {
    await browser.scripting.unregisterContentScripts({ ids: [SCRIPT_ID] });
  }
  return granted;
}

/** Adds the content script to web tabs that are already open (an old copy retires itself). */
export async function injectIntoOpenTabs(): Promise<void> {
  if (!(await hasAllSites())) return;
  for (const tab of await browser.tabs.query({ url: ["http://*/*", "https://*/*"] })) {
    if (tab.id === undefined || tab.discarded) continue;
    void browser.scripting.executeScript({ target: { tabId: tab.id }, files: [`/${CONTENT_SCRIPT}`] }).catch(() => {});
  }
}

export function startAllSites(): void {
  if (import.meta.env.FIREFOX) return;
  const sync = () => void syncAllSitesScript().catch(() => {});
  sync();
  browser.runtime.onInstalled?.addListener(() => {
    sync();
    void injectIntoOpenTabs().catch(() => {});
  });
  browser.permissions.onAdded?.addListener((p) => {
    if (!p.origins?.includes("<all_urls>")) return;
    void syncAllSitesScript()
      .then(() => injectIntoOpenTabs())
      .catch(() => {});
  });
  browser.permissions.onRemoved?.addListener((p) => {
    if (p.origins?.includes("<all_urls>")) sync();
  });
}
