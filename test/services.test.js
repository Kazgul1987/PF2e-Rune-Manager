import test from "node:test";
import assert from "node:assert/strict";

import { getFundamentalRuneData, getPropertyRuneSlotData, getPropertyRuneSlots, normalizeRuneFamilySlug } from "../scripts/api/pf2e-api.js";
import { canTransferRune } from "../scripts/services/rune-service.js";
import { getRuneSwapCost, getRuneTransferCost, getRuneTransferCostCP } from "../scripts/services/payment-service.js";
import { runCompensatedMutation } from "../scripts/services/transaction-service.js";

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

test("fundamental runes prefer structured data and survive renaming", () => {
  const renamed = { name: "Helgas Lieblingsrune", system: { usage: { value: "etched-onto-a-weapon" }, level: { value: 12 } } };
  assert.deepEqual(getFundamentalRuneData(renamed), { striking: 2, source: "system-usage-level" });
  assert.deepEqual(getFundamentalRuneData({ name: "Nicht Englisch", system: { slug: "major-striking" } }), { striking: 3, source: "slug" });
  assert.deepEqual(getFundamentalRuneData({ name: "Umbenannt", slug: "armor-potency-2", system: {} }), { potency: 2, source: "slug" });
  assert.deepEqual(getFundamentalRuneData({ name: "Greater Resilient Rune", system: {} }), { resilient: 2, source: "legacy-name" });
  assert.deepEqual(getFundamentalRuneData({ name: "Striking Rune", system: {} }), { striking: 1, source: "legacy-name" });
});

test("ABP property slots use PF2e's exposed variant-rule API", () => {
  globalThis.game = { pf2e: { variantRules: { AutomaticBonusProgression: {
    isEnabled: () => true, getAttackPotency: (level) => level >= 16 ? 3 : 2, getDefensePotency: () => 1,
  } } } };
  const weapon = item("weapon", { potency: 0, property: [] });
  weapon.actor = { level: 16, type: "character" };
  assert.deepEqual(getPropertyRuneSlotData(weapon), { known: true, slots: 3, source: "abp" });
  delete globalThis.game;
});

test("ABP safely reports unknown when its runtime API is unavailable", () => {
  globalThis.game = { pf2e: { settings: { variants: { abp: "ABPRulesAsWritten" } } } };
  assert.deepEqual(getPropertyRuneSlotData(item("weapon", { potency: 0, property: [] })), {
    known: false, slots: null, source: "abp-runtime-api-unavailable",
  });
  delete globalThis.game;
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

test("failed mutation restores items and refunds exactly once", async () => {
  let charged = 0, refunded = 0, restored = 0;
  const result = await runCompensatedMutation({
    applyPayment: async () => { charged++; return { success: true, charged: true, refund: async () => { refunded++; return true; } }; },
    applyMutation: async () => { throw new Error("update failed"); },
    restoreMutation: async () => { restored++; },
  });
  assert.equal(result.success, false);
  assert.equal(result.paymentRefunded, true);
  assert.deepEqual({ charged, refunded, restored }, { charged: 1, refunded: 1, restored: 1 });
});

test("refund failure is reported and never retried or double charged", async () => {
  let charged = 0, refunded = 0;
  const result = await runCompensatedMutation({
    applyPayment: async () => { charged++; return { success: true, charged: true, refund: async () => { refunded++; return false; } }; },
    applyMutation: async () => false,
    restoreMutation: async () => {},
  });
  assert.equal(result.paymentRefunded, false);
  assert.deepEqual({ charged, refunded }, { charged: 1, refunded: 1 });
});

test("insufficient funds never run the item mutation", async () => {
  let mutated = 0;
  const result = await runCompensatedMutation({
    applyPayment: async () => ({ success: false }),
    applyMutation: async () => { mutated++; },
  });
  assert.equal(result.phase, "payment");
  assert.equal(mutated, 0);
});
