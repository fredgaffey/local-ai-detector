// Tiers task (docs/plan.md "Two tiers: Quick (default) and Deep (on
// demand)"): the tier -> detector-set mapping, and settings migration for
// `Settings.tiers` (a fresh install, and a stored value missing/corrupted
// by an older or foreign build).

import { describe, expect, it } from "vitest";
import { fusionForTier } from "./models";
import {
  ALL_TIER_DETECTORS,
  DEFAULT_SETTINGS,
  DEFAULT_TIERS,
  migrateSettings,
  sanitizeTiers,
  type FusionDetector,
  type Settings,
  type TierSettings,
} from "../shared/settings";

describe("fusionForTier", () => {
  it("quick uses settings.tiers.quickDetectors, weighted", () => {
    const tiers: TierSettings = { ...DEFAULT_TIERS, quickDetectors: ["tmr", "lite"] };
    expect(fusionForTier("quick", tiers)).toEqual({ detectors: ["tmr", "lite"], method: "weighted" });
  });

  it("deep uses settings.tiers.deepDetectors, weighted", () => {
    const tiers: TierSettings = { ...DEFAULT_TIERS, deepDetectors: ["binoculars"] };
    expect(fusionForTier("deep", tiers)).toEqual({ detectors: ["binoculars"], method: "weighted" });
  });

  it("defaults: quick is tabularis, deep is desklib + tabularis (v7 accuracy pass)", () => {
    expect(fusionForTier("quick", DEFAULT_TIERS).detectors).toEqual(["tabularis"]);
    expect(fusionForTier("deep", DEFAULT_TIERS).detectors).toEqual(["desklib", "tabularis"]);
  });

  it("v7 moves the old Quick/Deep/Fusion defaults to the new models, keeps hand-picked sets", () => {
    const merged = (stored: Partial<Settings>) => migrateSettings({ ...DEFAULT_SETTINGS, ...stored } as Settings, stored);
    const old = { ...DEFAULT_TIERS, quickDetectors: ["tmr"], deepDetectors: ["tmr", "fakespot"] } as Settings["tiers"];
    const out = merged({ settingsVersion: 6, tiers: old, fusion: { detectors: ["fakespot", "tmr"], method: "weighted" } });
    expect(out.tiers.quickDetectors).toEqual(["tabularis"]);
    expect(out.tiers.deepDetectors).toEqual(["desklib", "tabularis"]);
    expect(out.fusion.detectors).toEqual(["desklib", "tabularis"]);
    const picked = { ...DEFAULT_TIERS, quickDetectors: ["lite"], deepDetectors: ["fakespot", "binoculars"] } as Settings["tiers"];
    const kept = merged({ settingsVersion: 6, tiers: picked });
    expect(kept.tiers.quickDetectors).toEqual(["lite"]);
    expect(kept.tiers.deepDetectors).toEqual(["fakespot", "binoculars"]);
  });

  it("v6 moves the old all-six Deep default to the pair, keeps a hand-picked set", () => {
    const merged = (stored: Partial<Settings>) => migrateSettings({ ...DEFAULT_SETTINGS, ...stored } as Settings, stored);
    const allSix = { ...DEFAULT_TIERS, deepDetectors: ["fakespot", "tmr", "modernbert", "lite", "perplexity", "binoculars"] } as Settings["tiers"];
    expect(merged({ settingsVersion: 5, tiers: allSix }).tiers.deepDetectors).toEqual(DEFAULT_TIERS.deepDetectors);
    expect(ALL_TIER_DETECTORS).toContain("desklib");
    const picked = { ...DEFAULT_TIERS, deepDetectors: ["fakespot", "binoculars"] as Settings["tiers"]["deepDetectors"] };
    expect(merged({ settingsVersion: 5, tiers: picked }).tiers.deepDetectors).toEqual(["fakespot", "binoculars"]);
  });

  it("falls back to the tier's own default if given an empty list (never an empty Fusion)", () => {
    expect(fusionForTier("quick", { ...DEFAULT_TIERS, quickDetectors: [] }).detectors).toEqual(DEFAULT_TIERS.quickDetectors);
    expect(fusionForTier("deep", { ...DEFAULT_TIERS, deepDetectors: [] }).detectors).toEqual(DEFAULT_TIERS.deepDetectors);
  });
});

describe("sanitizeTiers", () => {
  it("quick budget defaults to 1024 tokens and is clamped", () => {
    expect(sanitizeTiers(undefined).quickMaxTokens).toBe(1024);
    expect(sanitizeTiers({ quickMaxTokens: 5 }).quickMaxTokens).toBe(128);
    expect(sanitizeTiers({ quickMaxTokens: 1e9 }).quickMaxTokens).toBe(32000);
    expect(sanitizeTiers({ quickMaxTokens: Number.NaN }).quickMaxTokens).toBe(1024);
  });

  it("passes through a valid value", () => {
    const t: TierSettings = { quickDetectors: ["tmr"], deepDetectors: ["tmr", "perplexity"], autoRunQuick: false, confirmQuick: true, quickMaxTokens: 1024, confirmAt: 0.5 };
    expect(sanitizeTiers(t)).toEqual(t);
  });

  it("drops unknown detectors (a newer version synced in) and dedupes", () => {
    expect(
      sanitizeTiers({ quickDetectors: ["lite", "lite", "bogus" as FusionDetector], deepDetectors: ["tmr"], autoRunQuick: true }),
    ).toEqual({ quickDetectors: ["lite"], deepDetectors: ["tmr"], autoRunQuick: true, confirmQuick: true, quickMaxTokens: 1024, confirmAt: 0.5 });
  });

  it("never returns an empty detector list for either tier", () => {
    expect(sanitizeTiers({ quickDetectors: [], deepDetectors: [] }).quickDetectors).toEqual(DEFAULT_TIERS.quickDetectors);
    expect(sanitizeTiers({ quickDetectors: [], deepDetectors: [] }).deepDetectors).toEqual(DEFAULT_TIERS.deepDetectors);
  });

  it("defaults autoRunQuick to on, and everything to the tier defaults, when undefined", () => {
    expect(sanitizeTiers(undefined)).toEqual(DEFAULT_TIERS);
  });
});

describe("settings migration: tiers", () => {
  const migrated = (stored: Partial<Settings>) => migrateSettings({ ...DEFAULT_SETTINGS, ...stored } as Settings, stored);

  it("a fresh install gets the intended defaults", () => {
    expect(DEFAULT_SETTINGS.tiers).toEqual(DEFAULT_TIERS);
    expect(migrated({}).tiers).toEqual(DEFAULT_TIERS);
  });

  it("settings stored before the tiers task (no `tiers` key at all) get the defaults, not a crash", () => {
    const preTiers = { mode: "ensemble" } as Partial<Settings>;
    expect(migrated(preTiers).tiers).toEqual(DEFAULT_TIERS);
  });

  it("a corrupted/foreign stored `tiers` value is sanitized rather than kept verbatim", () => {
    const out = migrated({ tiers: { quickDetectors: ["nope" as FusionDetector], deepDetectors: [], autoRunQuick: false, confirmQuick: true, quickMaxTokens: 1024, confirmAt: 0.5 } });
    // autoRunQuick: false folds into the single Auto-run control (Presence > Auto-run: Never).
    expect(out.tiers).toEqual({ quickDetectors: DEFAULT_TIERS.quickDetectors, deepDetectors: DEFAULT_TIERS.deepDetectors, autoRunQuick: true, confirmQuick: true, quickMaxTokens: 1024, confirmAt: 0.5 });
    expect(out.autoRunPolicy).toBe("never");
  });

  it("a valid stored choice survives migration untouched", () => {
    const custom: TierSettings = { quickDetectors: ["tmr", "lite"], deepDetectors: ["fakespot", "binoculars"], autoRunQuick: true, confirmQuick: false, quickMaxTokens: 2048, confirmAt: 0.5 };
    expect(migrated({ tiers: custom }).tiers).toEqual(custom);
  });
});

describe("confirmAt", () => {
  it("clamped to 0..0.95, defaulted when missing or junk", () => {
    expect(sanitizeTiers({ confirmAt: 0.3 }).confirmAt).toBe(0.3);
    expect(sanitizeTiers({ confirmAt: 2 }).confirmAt).toBe(0.95);
    expect(sanitizeTiers({ confirmAt: -1 }).confirmAt).toBe(0);
    expect(sanitizeTiers({ confirmAt: Number.NaN }).confirmAt).toBe(DEFAULT_TIERS.confirmAt);
    expect(sanitizeTiers({}).confirmAt).toBe(DEFAULT_TIERS.confirmAt);
  });
});
