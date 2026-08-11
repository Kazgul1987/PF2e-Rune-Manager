import test from "node:test";
import assert from "node:assert/strict";

import { getPropertyRuneSlots, normalizeRuneFamilySlug } from "../scripts/api/pf2e-api.js";
import { canTransferRune } from "../scripts/services/rune-service.js";
import { getRuneSwapCost, getRuneTransferCost, getRuneTransferCostCP } from "../scripts/services/payment-service.js";

const item = (type, runes, extra = {}) => ({
  type,
  uuid: `${type}.${Math.random()}`,
  system: { runes, material: { type: null }, ...extra },
});

test("property slots follow prepared potency and orichalcum", () => {
  assert.equal(getPropertyRuneSlots(item("weapon", { potency: 2, property: [] })), 2);
  assert.equal(
    getPropertyRuneSlots(item("armor", { potency: 2, property: [] }, { material: { type: "orichalcum" } })),
    3
  );
  assert.equal(getPropertyRuneSlots(item("shield", { reinforcing: 2 })), 0);
});

test("property rune families normalize upgrade prefixes", () => {
  assert.equal(normalizeRuneFamilySlug("greaterFlaming"), "flaming");
  assert.equal(normalizeRuneFamilySlug("major_flaming"), "flaming");
});

test("central validation rejects cross-type and same-item transfers", () => {
  const source = item("weapon", { potency: 1, property: ["flaming"] });
  assert.equal(canTransferRune(source, source, { type: "property", slug: "flaming" }).reason, "sameItem");
  assert.equal(
    canTransferRune(source, item("armor", { potency: 1, property: [] }), { type: "property", slug: "flaming" }).reason,
    "itemTypeMismatch"
  );
});

test("a full property slot may be upgraded but not overfilled", () => {
  const source = item("weapon", { potency: 1, property: ["greaterFlaming"] });
  const target = item("weapon", { potency: 1, property: ["flaming"] });
  assert.equal(canTransferRune(source, target, { type: "property", slug: "greaterFlaming" }).valid, true);
  assert.equal(canTransferRune(source, target, { type: "property", slug: "shock" }).reason, "propertySlotsFull");
});

test("payment calculations reject invalid prices and honor the world percentage", () => {
  globalThis.game = { settings: { get: () => 15 } };
  assert.equal(getRuneTransferCost(100), 15);
  assert.equal(getRuneTransferCostCP(12.34), 185);
  assert.equal(getRuneSwapCost(100, 200), 30);
  assert.equal(getRuneTransferCost(-1), null);
  assert.equal(getRuneTransferCost("unknown"), null);
  delete globalThis.game;
});
