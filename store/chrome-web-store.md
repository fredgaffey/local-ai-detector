# Chrome Web Store listing text

For the Developer Dashboard's listing fields. Permission justifications and
the data-collection declaration are in [`permissions.md`](permissions.md)
(copy those into the dashboard's separate "Permissions justification" and
"Data usage" forms). Promo images: [`promo/`](promo/). Screenshots (1280×800,
upload in this order): [`screenshots/`](screenshots/) (card + highlights,
sentence details, popup, YouTube). Older shots in
[`../docs/qa/shots/`](../docs/qa/shots/) and [`../docs/screenshots/`](../docs/screenshots/) show earlier UI.

## Category

**Productivity** (or **Tools**, if Chrome's current category list splits
them differently by the time you submit — pick whichever is closest; this
isn't a niche pick specific to one category taxonomy version). Not
"Accessibility": it doesn't change how a page is rendered or read, only adds
an analysis overlay.

## Short description (132 characters max)

```
Filter AI-generated content. Runs on your device. Free, open-source, no servers, no API keys, no accounts.
```

(101 characters.)

## Single-purpose statement

See [`permissions.md`](permissions.md#single-purpose-statement-chrome-web-store).

## Long description

```
Local AI Detector checks the text and images on the page you're reading for
signs of AI generation, entirely on your device. No servers, no API keys, no
accounts, no data collection.

WHAT IT DOES

• Scores the text on the page with open-source detection models that run in
  your browser, highlights the sentences most likely to be AI-written, and
  shows a calibrated probability rather than a made-up score.
• Click a highlighted sentence to see its score and what each model said.
• On comment threads, reviews and forums it scores each comment separately,
  and an optional filter dims the ones flagged as likely AI.
• On YouTube it checks the video's transcript and, experimentally, the
  narrator's voice. The audio never leaves your device.
• Checks images for signed Content Credentials (C2PA), AI-generator metadata
  and open-source invisible watermarks, and says plainly which watermarks
  can't be checked locally.
• Flags hidden or invisible characters in text, shown separately from the AI
  score.
• Runs automatically on a set of popular sites with lots of user-written
  text; on any other page, click the toolbar button or right-click to check
  it.
• A fast check runs by default; a one-click Deep check reads the whole page
  with the most accurate model pair.

PRIVACY

All analysis runs in your browser. The only downloads are the detection
models themselves (once, after you agree, 35–400 MB depending on your
choices) and, only on a site you've explicitly allowed, the bytes of an image
you ask it to check. Nothing you read is ever sent anywhere.

ACCURACY

This is not a forensic tool. On held-out web text the default models flag
about two-thirds of AI-written texts and about 5% of human-written ones.
Paraphrased or edited text often passes, and a low score means "no strong AI
signal", not "written by a human". The full measurements are published with
the source code.

OPEN SOURCE

MIT licensed. Every bundled model and library is openly licensed. Source code,
documentation and the privacy policy are linked from the Options page.
```

## Notes for whoever fills in the dashboard

- Keyword spam: the first submission (2026-09-30) was rejected for keyword
  spam. Chrome's policy counts lists of site, brand, product or model names
  as spam, so the description names none of them; keep it that way.

- Chrome's "Data usage" form: see
  [`permissions.md`](permissions.md#data-usage-disclosures-chrome-web-store-data-collection-form) —
  declare no data collection.
- Homepage / support URL: point at the source repository (or an issues page
  there) — there's no separate support site.
- Privacy policy URL: publish [`../PRIVACY.md`](../PRIVACY.md) somewhere with
  a stable URL (e.g. the repository's rendered file on GitHub) and paste that
  URL into the listing's privacy policy field.
