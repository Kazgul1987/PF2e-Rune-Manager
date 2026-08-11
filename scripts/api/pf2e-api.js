/**
 * PF2e integration boundary.
 *
 * Only installed-system document data and APIs proven to exist on PF2e documents
 * are used here. The similarly named helpers in PF2e's physical/runes.ts are
 * internal module exports and are deliberately not assumed to exist on game.pf2e.
 */

export function isPF2eItemType(item, ...types) {
  return typeof item?.isOfType === "function"
    ? item.isOfType(...types)
    : types.includes(item?.type);
}

export function normalizeRuneSlug(value) {
  if (typeof value !== "string") return "";
  return value
    .trim()
    .replace(/[\s_]+(.)?/g, (_match, next = "") => next.toUpperCase())
    .replace(/^(.)/, (first) => first.toLowerCase());
}

export function normalizeRuneFamilySlug(value) {
  const slug = normalizeRuneSlug(value);
  const match = slug.match(/^(greater|major|lesser|minor|moderate|supreme|true)([A-Z].*)/);
  if (!match) return slug;
  return match[2].charAt(0).toLowerCase() + match[2].slice(1);
}

export function getPropertyRunes(item) {
  const property = item?.system?.runes?.property;
  return Array.isArray(property) ? property.filter((slug) => typeof slug === "string" && slug) : [];
}

/** Minimal compatibility equivalent of PF2e's internal prunePropertyRunes. */
export function prunePropertyRunes(runes) {
  const values = [...new Set((Array.isArray(runes) ? runes : []).filter(Boolean))];
  const titleCase = (value) => value.replace(/^(.)/, (character) => character.toUpperCase());
  return values.filter((rune) =>
    !values.includes(`greater${titleCase(rune)}`) &&
    !values.includes(`major${titleCase(rune.replace(/^greater/, ""))}`) &&
    !values.includes(`true${titleCase(rune.replace(/^greater|^major/, ""))}`)
  );
}

/**
 * Compatibility implementation of PF2e's internal getPropertyRuneSlots.
 * PF2e source: src/module/item/physical/runes.ts. Orichalcum grants one slot;
 * potency grants the remainder. ABP actor-level potency cannot be reproduced
 * through a public runtime API, so prepared item potency is the conservative
 * fallback. Starfinder-grade equipment intentionally has no PF2e rune slots.
 */
export function getPropertyRuneSlots(item) {
  if (!isPF2eItemType(item, "weapon", "armor")) return 0;
  if (item?.system?.grade) return 0;
  const potency = Number(item?.system?.runes?.potency);
  const material = item?.system?.material?.type === "orichalcum" ? 1 : 0;
  return Math.max(0, Math.min(4, (Number.isInteger(potency) ? potency : 0) + material));
}

export function getActivePartyActor() {
  return game.actors?.party ?? (() => {
    try {
      const id = game.settings?.get?.("pf2e", "activeParty");
      return id ? game.actors?.get?.(id) ?? null : null;
    } catch {
      return null;
    }
  })();
}

export function hasRuneDocumentData(item) {
  return isPF2eItemType(item, "weapon", "armor", "shield") && !!item?.system?.runes;
}
