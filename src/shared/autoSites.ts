// Sites where the content script loads by itself (the automatic Quick check,
// card, highlights) in the Chrome build. Everywhere else the extension still
// works on demand: the toolbar button, right-click menu and shortcuts grant
// activeTab, and the router injects the same script into that tab
// (src/engine/router.ts). Firefox keeps <all_urls>.
//
// A curated list keeps the first Chrome Web Store release out of the
// in-depth review that broad host access triggers; all-sites auto-run comes
// back as an opt-in in a later version (CHROMEWEBSTORE.md "Host access").
//
// Chosen for where AI-written text turns up: forums and comments, social
// posts, blogging platforms, Q&A, reviews, news and reference.

export const AUTO_SITES: readonly string[] = [
  // Forums, comments, link aggregators
  "reddit.com",
  "news.ycombinator.com",
  "lobste.rs",
  "slashdot.org",
  "tildes.net",
  "lemmy.world",
  "discourse.org",
  "4chan.org",
  "stackexchange.com",
  "stackoverflow.com",
  "superuser.com",
  "serverfault.com",
  "askubuntu.com",
  "mathoverflow.net",
  "quora.com",
  // Social
  "x.com",
  "twitter.com",
  "threads.com",
  "threads.net",
  "bsky.app",
  "mastodon.social",
  "linkedin.com",
  "facebook.com",
  "instagram.com",
  "tumblr.com",
  "pinterest.com",
  "tiktok.com",
  // Video
  "youtube.com",
  // Blogging and publishing platforms
  "medium.com",
  "substack.com",
  "wordpress.com",
  "blogspot.com",
  "blogger.com",
  "dev.to",
  "hashnode.dev",
  "hashnode.com",
  "ghost.io",
  "beehiiv.com",
  "wattpad.com",
  "archiveofourown.org",
  "producthunt.com",
  "indiehackers.com",
  "hackernoon.com",
  "github.com",
  // Reviews and shopping
  "amazon.com",
  "amazon.co.uk",
  "amazon.ca",
  "amazon.com.au",
  "amazon.de",
  "tripadvisor.com",
  "yelp.com",
  "trustpilot.com",
  "goodreads.com",
  "etsy.com",
  "ebay.com",
  "g2.com",
  "capterra.com",
  "glassdoor.com",
  "imdb.com",
  "letterboxd.com",
  "steamcommunity.com",
  "store.steampowered.com",
  // Reference and learning
  "wikipedia.org",
  "wikihow.com",
  "fandom.com",
  "britannica.com",
  "investopedia.com",
  "healthline.com",
  "webmd.com",
  "verywellhealth.com",
  "geeksforgeeks.org",
  "w3schools.com",
  "freecodecamp.org",
  "towardsdatascience.com",
  "coursera.org",
  // News and magazines
  "bbc.com",
  "bbc.co.uk",
  "theguardian.com",
  "nytimes.com",
  "washingtonpost.com",
  "cnn.com",
  "reuters.com",
  "apnews.com",
  "npr.org",
  "forbes.com",
  "businessinsider.com",
  "bloomberg.com",
  "theverge.com",
  "techcrunch.com",
  "wired.com",
  "arstechnica.com",
  "engadget.com",
  "cnet.com",
  "zdnet.com",
  "vice.com",
  "vox.com",
  "buzzfeed.com",
  "huffpost.com",
  "abc.net.au",
  "smh.com.au",
  "news.com.au",
  "cbc.ca",
  "aljazeera.com",
  "independent.co.uk",
  "dailymail.co.uk",
  "yahoo.com",
  "msn.com",
];

/** Match patterns for the host and its subdomains, http and https. */
export function autoSiteMatches(sites: readonly string[] = AUTO_SITES): string[] {
  return sites.flatMap((h) => [`*://${h}/*`, `*://*.${h}/*`]);
}
