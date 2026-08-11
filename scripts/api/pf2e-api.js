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

const FUNDAMENTAL_SLUGS = /^(?:(mythic|major|greater|supreme|moderate|lesser|minor)-)?(?:(weapon|armor)-potency|striking|resilient|reinforcing)(?:-rune)?(?:-(\d))?$/;
const FUNDAMENTAL_RANKS = { greater: 2, major: 3, mythic: 4 };
const REINFORCING_RANKS = { minor: 1, lesser: 2, moderate: 3, greater: 4, major: 5, supreme: 6 };

/** Identify a freestanding fundamental-rune item without preferring its display name. */
export function getFundamentalRuneData(runeItem) {
  const sourceId = String(runeItem?.sourceId ?? runeItem?.flags?.core?.sourceId ?? "");
  const sourceSlug = sourceId.match(/Item\.([^.]+)$/)?.[1] ?? "";
  const itemSlug = String(runeItem?.system?.slug ?? runeItem?.slug ?? "").toLowerCase();
  const explicitSlug = itemSlug || sourceSlug.toLowerCase();
  const match = explicitSlug.match(FUNDAMENTAL_SLUGS);
  if (match) {
    const [, prefix, potencyType, suffix] = match;
    const kind = potencyType ? "potency" : explicitSlug.match(/striking|resilient|reinforcing/)?.[0];
    const ranks = kind === "reinforcing" ? REINFORCING_RANKS : FUNDAMENTAL_RANKS;
    const rank = Number(suffix) || ranks[prefix] || 1;
    return kind ? { [kind]: rank, source: itemSlug ? "slug" : "source-id" } : {};
  }
  // A stable, non-fundamental slug is conclusive: do not reinterpret it heuristically.
  if (itemSlug) return {};

  const usage = String(runeItem?.system?.usage?.value ?? runeItem?.system?.usage ?? "").toLowerCase();
  const level = Number(runeItem?.system?.level?.value ?? runeItem?.system?.level);
  const price = Number(runeItem?.system?.price?.value?.gp ?? runeItem?.system?.price?.value ?? runeItem?.system?.price);
  if (level === 20 && usage === "etched-onto-a-weapon") {
    if (price === 70000) {
      const slugHint = String(runeItem?.system?.slug ?? runeItem?.slug ?? runeItem?.flags?.core?.sourceId ?? "").toLowerCase();
      if (slugHint.includes("striking")) return { striking: 4, source: "system-source-metadata" };
      if (slugHint.includes("potency")) return { potency: 4, source: "system-source-metadata" };
    }
  }
  if (level === 20 && usage === "etched-onto-armor") {
    if (price === 70000) {
      const slugHint = String(runeItem?.system?.slug ?? runeItem?.slug ?? runeItem?.flags?.core?.sourceId ?? "").toLowerCase();
      if (slugHint.includes("resilient")) return { resilient: 4, source: "system-source-metadata" };
      if (slugHint.includes("potency")) return { potency: 4, source: "system-source-metadata" };
    }
  }
  // Legacy fallback only
  const name = String(runeItem?.name ?? "").toLowerCase();
  const potency = name.match(/[+＋]\s*(\d+)/);
  if (potency) return { potency: Number(potency[1]), source: "legacy-name" };
  const kind = name.match(/striking|resilient|reinforcing/)?.[0];
  if (!kind) return {};
  const prefix = name.match(/mythic|supreme|major|greater|moderate|lesser|minor/)?.[0];
  const ranks = kind === "reinforcing" ? REINFORCING_RANKS : FUNDAMENTAL_RANKS;
  const rank = ranks[prefix] || 1;
  return { [kind]: rank, source: "legacy-name" };
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
 * potency grants the remainder. PF2e v14 exposes ABP through
 * game.pf2e.variantRules.AutomaticBonusProgression; if that runtime boundary is
 * unexpectedly unavailable while ABP is enabled, slot data is marked unknown.
 */
export function getPropertyRuneSlotData(item) {
  if (!isPF2eItemType(item, "weapon", "armor")) return { known: true, slots: 0, source: "item-type" };
  if (item?.system?.grade) return { known: true, slots: 0, source: "sf2e-grade" };
  const abp = globalThis.game?.pf2e?.variantRules?.AutomaticBonusProgression;
  let abpEnabled = false;
  if (typeof abp?.isEnabled === "function") {
    abpEnabled = abp.isEnabled(item?.actor ?? null);
  } else {
    const setting = globalThis.game?.pf2e?.settings?.variants?.abp;
    abpEnabled = setting != null && setting !== "noABP" && !item?.actor?.flags?.pf2e?.disableABP;
    if (abpEnabled) return { known: false, slots: null, source: "abp-runtime-api-unavailable" };
  }
  const potency = Number(item?.system?.runes?.potency);
  const material = item?.system?.material?.type === "orichalcum" ? 1 : 0;
  if (abpEnabled) {
    const getter = isPF2eItemType(item, "weapon") ? abp.getAttackPotency : abp.getDefensePotency;
    if (typeof getter !== "function") return { known: false, slots: null, source: "abp-potency-api-unavailable" };
    const actorLevel = !item?.actor || isPF2eItemType(item.actor, "loot") ? 20 : Number(item.actor.level);
    const abpPotency = Number(getter.call(abp, actorLevel));
    if (!Number.isInteger(abpPotency)) return { known: false, slots: null, source: "abp-invalid-potency" };
    return { known: true, slots: Math.max(0, Math.min(4, abpPotency + material)), source: "abp" };
  }
  return { known: true, slots: Math.max(0, Math.min(4, (Number.isInteger(potency) ? potency : 0) + material)), source: "item-potency" };
}

export function getPropertyRuneSlots(item) {
  return getPropertyRuneSlotData(item).slots;
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
