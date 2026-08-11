import {
  getPropertyRuneSlots,
  getPropertyRunes,
  hasRuneDocumentData,
  isPF2eItemType,
  normalizeRuneFamilySlug,
} from "../api/pf2e-api.js";

export function canTransferRune(source, target, rune) {
  if (!source || !target || !rune) return { valid: false, reason: "missingDocument" };
  if (source === target || (source.uuid && source.uuid === target.uuid)) {
    return { valid: false, reason: "sameItem" };
  }
  if (!hasRuneDocumentData(source) || !hasRuneDocumentData(target)) {
    return { valid: false, reason: "invalidItem" };
  }
  if (source.type !== target.type) return { valid: false, reason: "itemTypeMismatch" };

  if (rune.type === "fundamental") {
    const validKind =
      (isPF2eItemType(target, "weapon") && ["potency", "striking"].includes(rune.kind)) ||
      (isPF2eItemType(target, "armor") && ["potency", "resilient"].includes(rune.kind)) ||
      (isPF2eItemType(target, "shield") && rune.kind === "reinforcing");
    return validKind ? { valid: true } : { valid: false, reason: "fundamentalMismatch" };
  }

  if (rune.type !== "property" || !rune.slug || isPF2eItemType(target, "shield")) {
    return { valid: false, reason: "propertyMismatch" };
  }
  const existing = getPropertyRunes(target);
  const family = normalizeRuneFamilySlug(rune.slug);
  const replacesFamily = existing.some((slug) => normalizeRuneFamilySlug(slug) === family);
  if (!replacesFamily && existing.length >= getPropertyRuneSlots(target)) {
    return { valid: false, reason: "propertySlotsFull" };
  }
  return { valid: true };
}

