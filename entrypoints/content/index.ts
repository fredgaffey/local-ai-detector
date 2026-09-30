// Content script entrypoint. All actual logic lives in src/content/** (T2);
// this just wires WXT's entrypoint to it. See src/content/main.ts for the
// idempotent boot guard, extraction, highlight rendering, the floating
// pill, tooltips and hidden-Unicode markers.

import { bootContentScript } from "@/src/content";
import { autoSiteMatches } from "@/src/shared/autoSites";

export default defineContentScript({
  // Chrome: the curated auto-run list (src/shared/autoSites.ts); other sites
  // get the script on demand. The e2e build adds its localhost fixtures.
  matches: import.meta.env.FIREFOX
    ? ["<all_urls>"]
    : [...autoSiteMatches(), ...(import.meta.env.MODE === "e2e" ? ["http://localhost/*"] : [])],
  main() {
    try {
      bootContentScript();
    } catch {
      // A content script must never throw and break the host page.
      console.warn("[Local AI Detector] content script failed to start");
    }
  },
});
