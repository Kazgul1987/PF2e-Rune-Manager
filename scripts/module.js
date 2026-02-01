const MODULE_ID = "pf2e-rune-manager";
const ATTACH_RUNES_SELECTOR = "a[data-action='attach-runes']";
const CLICK_NAMESPACE = ".pf2eRuneManager";

const DBG = (...args) => console.log("[RuneManager DBG]", ...args);

// --- DC-Tabelle nach Level (moderate DC, GM Core / DC-by-level) ---
const LEVEL_DC_MAP = {
  0: 14,
  1: 15,
  2: 16,
  3: 18,
  4: 19,
  5: 20,
  6: 22,
  7: 23,
  8: 24,
  9: 26,
  10: 27,
  11: 28,
  12: 30,
  13: 31,
  14: 32,
  15: 34,
  16: 35,
  17: 36,
  18: 38,
  19: 39,
  20: 40,
};

const getDCForRuneLevel = (level) => {
  const lvl = Math.max(0, Math.min(20, Number(level) || 0));
  return LEVEL_DC_MAP[lvl] ?? 14;
};

const FALLBACK_WEAPON_PROPERTY_RUNE_SLUGS = new Set([
  "anarchic",
  "axiomatic",
  "bane",
  "brilliant",
  "corrosive",
  "cruel",
  "dancing",
  "disrupting",
  "flaming",
  "frost",
  "ghost-touch",
  "holy",
  "keen",
  "merciful",
  "returning",
  "shock",
  "shifting",
  "speed",
  "thundering",
  "vorpal",
  "wounding",
]);

Hooks.once("init", () => {
  game.settings?.register(MODULE_ID, "consumeRuneOnApply", {
    name: "Consume rune on apply",
    hint: "Delete the rune item after it is applied to a target.",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
  });
});

const sluggifyText = (value) => {
  const sluggifyFn =
    globalThis.sluggify ??
    globalThis.game?.pf2e?.sluggify ??
    globalThis.game?.pf2e?.system?.sluggify;

  if (!value) return "";
  const slug =
    typeof sluggifyFn === "function"
      ? sluggifyFn(value)
      : value.toString().toLowerCase().replace(/\s+/g, "-");
  return slug?.toString().toLowerCase() ?? "";
};

const sluggifyRuneName = (runeItem) => {
  const name = runeItem?.name ?? "";
  const explicitSlug = runeItem?.system?.slug ?? runeItem?.slug ?? "";
  const slugSource = explicitSlug || name;
  return sluggifyText(slugSource);
};

const getRuneUsageValue = (runeItem) =>
  (runeItem?.system?.usage?.value ?? runeItem?.system?.usage ?? "")
    .toString()
    .toLowerCase();

const getRuneTraits = (runeItem) =>
  (runeItem?.system?.traits?.value ?? runeItem?.system?.traits ?? [])
    .filter(Boolean)
    .map((trait) => trait.toString().toLowerCase());

const getItemTraits = (item) =>
  (item?.system?.traits?.value ?? item?.system?.traits ?? [])
    .filter(Boolean)
    .map((trait) => trait.toString().toLowerCase());

const isItemType = (item, type) =>
  typeof item?.isOfType === "function" ? item.isOfType(type) : item?.type === type;

const getPropertyRuneSlots = (targetItem) => {
  const systemSlotsFn =
    globalThis.getPropertyRuneSlots ??
    globalThis.game?.pf2e?.runes?.getPropertyRuneSlots ??
    globalThis.game?.pf2e?.item?.getPropertyRuneSlots ??
    globalThis.game?.pf2e?.Item?.getPropertyRuneSlots;

  if (typeof systemSlotsFn === "function") {
    return systemSlotsFn(targetItem);
  }

  const potency = Number(targetItem?.system?.runes?.potency ?? 0);
  return Math.max(0, potency);
};

const getActivePartyActor = () => {
  try {
    const partyId = game.settings?.get?.("pf2e", "activeParty");
    if (!partyId) return null;
    return game.actors?.get?.(partyId) ?? null;
  } catch {
    return null;
  }
};

const isRunestoneItem = (item) => {
  const slug = sluggifyText(item?.system?.slug ?? item?.slug ?? item?.name ?? "");
  const name = (item?.name ?? "").toString().toLowerCase();
  return slug.includes("runestone") || name.includes("runestone") || name.includes("rune stone");
};

const findRunestoneOwner = (actor) => {
  const actorRunestone = actor?.items?.find?.(isRunestoneItem) ?? null;
  if (actorRunestone) {
    return {
      owner: actor,
      locationLabel: "actor inventory",
      runestone: actorRunestone,
    };
  }

  const partyActor = getActivePartyActor();
  if (!partyActor || partyActor?.id === actor?.id) return null;
  const partyRunestone = partyActor?.items?.find?.(isRunestoneItem) ?? null;
  if (!partyRunestone) return null;

  return {
    owner: partyActor,
    locationLabel: "party stash",
    runestone: partyRunestone,
  };
};

const getPropertyRuneEntry = (propertyData, runeKey) => {
  if (!propertyData || !runeKey) return null;
  return propertyData[runeKey] ?? Object.values(propertyData).find((entry) => entry?.slug === runeKey);
};

const buildPropertyRuneItemData = ({
  runeKey,
  kind,
  runeItem,
  propertyData,
  fallbackLabel,
}) => {
  const entry = getPropertyRuneEntry(propertyData, runeKey);
  const name = entry?.name ?? fallbackLabel ?? runeKey ?? "Property Rune";
  const slug = entry?.slug ?? runeKey ?? sluggifyText(name);
  const levelValue =
    entry?.level ??
    entry?.itemLevel ??
    entry?.lvl ??
    runeItem?.system?.level?.value ??
    runeItem?.system?.level ??
    0;
  const rawTraits = entry?.traits ?? entry?.traits?.value ?? [];
  const traits = Array.isArray(rawTraits)
    ? rawTraits.map((trait) => trait.toString().toLowerCase())
    : [];
  if (!traits.includes("property")) traits.push("property");

  return {
    name,
    type: runeItem?.type ?? "equipment",
    system: {
      slug,
      level: { value: Number(levelValue) || 0 },
      traits: { value: traits },
      usage: { value: kind === "armor" ? "etched-onto-armor" : "etched-onto-weapon" },
    },
  };
};

const handleRemovedPropertyRune = async ({
  actor,
  runeItem,
  removedRuneKey,
  kind,
  systemRuneData,
  getPropertyRuneLabel,
}) => {
  if (!removedRuneKey) return;

  const ownerInfo = findRunestoneOwner(actor);
  const label = getPropertyRuneLabel?.(removedRuneKey) ?? removedRuneKey ?? "Property Rune";

  if (!ownerInfo) {
    ui.notifications?.warn?.(`No runestone found. ${label} is destroyed.`);
    return;
  }

  const propertyData =
    kind === "armor" ? systemRuneData?.armor?.property : systemRuneData?.weapon?.property;
  const runeData = buildPropertyRuneItemData({
    runeKey: removedRuneKey,
    kind,
    runeItem,
    propertyData,
    fallbackLabel: label,
  });

  try {
    await ownerInfo.owner?.createEmbeddedDocuments?.("Item", [runeData]);
    ui.notifications?.info?.(`${label} stored in ${ownerInfo.locationLabel}.`);
  } catch (error) {
    ui.notifications?.warn?.(`Failed to store ${label}. It is destroyed.`);
    DBG("handleRemovedPropertyRune failed", error);
  }
};

const isRuneCompatible = (runeItem, targetItem) => {
  if (!runeItem || !targetItem) return false;
  if (!["weapon", "armor", "shield"].includes(targetItem.type)) return false;

  const runeUsage = getRuneUsageValue(runeItem);
  const runeTraits = getRuneTraits(runeItem);

  const targetCategory = (targetItem?.system?.category ?? "").toString().toLowerCase();
  const targetDamageType =
    targetItem?.system?.damage?.damageType?.toString().toLowerCase() ?? "";
  const targetPropertyRunes = (targetItem?.system?.runes?.property ?? []).map((r) =>
    r?.toString().toLowerCase()
  );

  const isWeapon = isItemType(targetItem, "weapon");
  const isArmor = isItemType(targetItem, "armor");
  const isShield = isItemType(targetItem, "shield");

  DBG("isRuneCompatible", {
    rune: runeItem?.name,
    runeUsage,
    runeTraits,
    target: targetItem?.name,
    targetType: targetItem?.type,
    targetCategory,
    targetDamageType,
    targetPropertyRunes,
  });

  const usageChecks = {
    "etched-onto-a-weapon": () => isWeapon,
    "etched-onto-a-shield": () => isShield,
    "etched-onto-armor": () => isArmor,
    "etched-onto-heavy-armor": () => isArmor && targetCategory === "heavy",
    "etched-onto-light-armor": () => isArmor && targetCategory === "light",
    "etched-onto-med-heavy-armor": () =>
      isArmor && ["medium", "heavy"].includes(targetCategory),
    "etched-onto-lm-nonmetal-armor": () =>
      isArmor && ["light", "medium"].includes(targetCategory),
    "etched-onto-medium-heavy-metal-armor": () =>
      isArmor && ["medium", "heavy"].includes(targetCategory),
    "etched-onto-bludgeoning-weapon": () => isWeapon && targetDamageType === "bludgeoning",
    "etched-onto-melee-weapon": () => isWeapon,
    "etched-onto-slashing-melee-weapon": () =>
      isWeapon && targetDamageType === "slashing",
    "etched-onto-piercing-or-slashing-melee-weapon": () =>
      isWeapon && ["piercing", "slashing"].includes(targetDamageType),
    "etched-onto-piercing-or-slashing-weapon": () =>
      isWeapon && ["piercing", "slashing"].includes(targetDamageType),
    "etched-onto-weapon-wo-anarchic-rune": () =>
      isWeapon && !targetPropertyRunes.includes("anarchic"),
    "etched-onto-weapon-wo-axiomatic-rune": () =>
      isWeapon && !targetPropertyRunes.includes("axiomatic"),
    "etched-onto-weapon-wo-unholy-rune": () =>
      isWeapon && !targetPropertyRunes.includes("unholy"),
    "etched-onto-weapon-wo-holy-rune": () =>
      isWeapon && !targetPropertyRunes.includes("holy"),
  };

  const usageCheck = usageChecks[runeUsage];
  if (usageCheck && !usageCheck()) {
    DBG("blocked by usageCheck", runeUsage);
    return false;
  }

  // Property slots prüfen (nur um volle Items früh auszufiltern)
  const systemRuneData = globalThis.RUNE_DATA ?? globalThis.game?.pf2e?.runes?.RUNE_DATA;
  if (systemRuneData) {
    const runeSlug = sluggifyRuneName(runeItem);
    const isWeaponProperty = systemRuneData.weapon?.property?.[runeSlug];
    const isArmorProperty = systemRuneData.armor?.property?.[runeSlug];
    if (isWeaponProperty || isArmorProperty) {
      const slots = getPropertyRuneSlots(targetItem);
      DBG("property slots", { slots, used: targetPropertyRunes.length });
      if (!slots || slots - targetPropertyRunes.length <= 0) return false;
    }
  }

  return true;
};

/**
 * Fundamental-Runen (Potency, Striking, Resilient, Reinforcing)
 * Wichtig: system.runes.* nutzt im aktuellen PF2e-System NUMERISCHE Werte,
 * keine Strings wie "greaterStriking".
 */
const getFundamentalRuneData = (runeItem) => {
  const rawName = (runeItem?.name ?? "").toString();
  const name = rawName.toLowerCase();
  const data = {};

  // +1 / +2 / +3 / +4 (Potency) aus dem Namen extrahieren
  const potencyMatch = rawName.match(/[+＋]\s*(\d+)/);
  if (potencyMatch) {
    data.potency = Number(potencyMatch[1]);
  }

  // Falls vorhanden, den Klammerzusatz auslesen: "Striking (Greater)" -> "greater"
  const rankMatch = rawName.match(/\(([^)]+)\)/);
  const rankWord = rankMatch ? rankMatch[1].trim().toLowerCase() : "";

  // Helper für Striking/Resilient: 1..4
  const get4Rank = (kind) => {
    // Mythic-Variante: kann als "Mythic Striking" ODER "(Mythic)" auftreten
    if (name.startsWith(`mythic ${kind}`) || rankWord === "mythic") return 4;
    if (name.startsWith(`major ${kind}`) || rankWord === "major") return 3;
    if (name.startsWith(`greater ${kind}`) || rankWord === "greater") return 2;
    // Basis-Rune (ohne Zusätze)
    return 1;
  };

  // Weapon: Striking
  if (name.includes("striking")) {
    data.striking = get4Rank("striking");
  }

  // Armor: Resilient
  if (name.includes("resilient")) {
    data.resilient = get4Rank("resilient");
  }

  // Shield: Reinforcing (1..6)
  if (name.includes("reinforcing")) {
    // Default: Minor = 1
    let rank = 1;

    // Bevorzugt nach Klammerzusatz gehen, falls vorhanden
    const reinforcingRankWord = rankWord || "";

    const w = reinforcingRankWord || "";
    const lw = w.toLowerCase();

    if (lw === "supreme" || name.includes("reinforcing rune (supreme)")) rank = 6;
    else if (lw === "major" || name.includes("reinforcing rune (major)")) rank = 5;
    else if (lw === "greater" || name.includes("reinforcing rune (greater)")) rank = 4;
    else if (lw === "moderate" || name.includes("reinforcing rune (moderate)")) rank = 3;
    else if (lw === "lesser" || name.includes("reinforcing rune (lesser)")) rank = 2;
    else if (lw === "minor" || name.includes("reinforcing rune (minor)")) rank = 1;

    data.reinforcing = rank;
  }

  return data;
};

const getRuneCategory = (runeItem) => {
  const slug = sluggifyRuneName(runeItem);
  const systemRuneData = globalThis.RUNE_DATA ?? globalThis.game?.pf2e?.runes?.RUNE_DATA;
  const usage = getRuneUsageValue(runeItem);

  const fundamental = getFundamentalRuneData(runeItem);
  if (Object.keys(fundamental).length) {
    DBG("getRuneCategory -> fundamental", { slug, usage, fundamental });
    return "fundamental";
  }

  DBG("getRuneCategory", { slug, hasRuneData: !!systemRuneData, usage });

  // 1) Wenn das System uns Rune-Daten liefert, klassisch über RUNE_DATA gehen
  if (
    slug &&
    systemRuneData &&
    ((systemRuneData.weapon?.property && slug in systemRuneData.weapon.property) ||
      (systemRuneData.armor?.property && slug in systemRuneData.armor.property))
  ) {
    DBG("getRuneCategory -> property-via-RUNE_DATA", { slug });
    return "property";
  }

  // 2) Fallback: bekannte Waffen-Property-Runen ohne RUNE_DATA
  if (slug && !systemRuneData && FALLBACK_WEAPON_PROPERTY_RUNE_SLUGS.has(slug)) {
    DBG("getRuneCategory -> weapon-property-fallback", { slug });
    return "property";
  }

  // 3) Allgemeiner Fallback: alles, was "etched-onto-...weapon/armor" ist und
  //    NICHT fundamental war, behandeln wir als Property-Rune
  if (
    usage.startsWith("etched-onto-armor") ||
    usage.startsWith("etched-onto-a-weapon") ||
    usage.startsWith("etched-onto-weapon")
  ) {
    DBG("getRuneCategory -> property-by-usage", { slug, usage });
    return "property";
  }

  DBG("getRuneCategory -> null", { slug, usage });
  return null;
};

const applyFundamentalRune = async (runeItem, targetItem) => {
  const runeData = getFundamentalRuneData(runeItem);
  DBG("applyFundamentalRune", { rune: runeItem?.name, runeData });

  const updates = {};
  if (targetItem.type === "weapon") {
    if (runeData.potency != null) updates["system.runes.potency"] = runeData.potency;
    if (runeData.striking != null) updates["system.runes.striking"] = runeData.striking;
  }
  if (targetItem.type === "armor") {
    if (runeData.potency != null) updates["system.runes.potency"] = runeData.potency;
    if (runeData.resilient != null) updates["system.runes.resilient"] = runeData.resilient;
  }
  if (targetItem.type === "shield") {
    if (runeData.reinforcing != null)
      updates["system.runes.reinforcing"] = runeData.reinforcing;
  }

  if (Object.keys(updates).length) {
    await targetItem.update(updates);
    return true;
  }
  return false;
};

/** Hilfsfunktion: "Advancing (Greater)" -> "greaterAdvancing", "Acid-Resistant" -> "acidResistant" usw. */
const toCamelCaseKey = (value) => {
  if (!value) return "";
  // Diakritika raus, Sonderzeichen in Leerzeichen umwandeln
  let sanitized = value
    .toString()
    .normalize?.("NFKD")
    .replace(/[^A-Za-z0-9\s\-]/g, " ");
  const tokens = sanitized
    .split(/[\s\-]+/)
    .map((t) => t.toLowerCase())
    .filter(Boolean);
  if (!tokens.length) return "";
  const [first, ...rest] = tokens;
  return first + rest.map((t) => t.charAt(0).toUpperCase() + t.slice(1)).join("");
};

const getPropertyRuneTypeKeyFromName = (name) => {
  if (!name) return "";
  const trimmed = name.toString().trim();
  const match = trimmed.match(/^(?<base>.+?)\s*\((?<rank>.+?)\)\s*$/);
  if (match?.groups) {
    const base = match.groups.base.trim();
    const rank = match.groups.rank.trim().toLowerCase();
    const baseKey = toCamelCaseKey(base);
    if (!baseKey) return "";

    const rankMap = {
      lesser: "lesser",
      greater: "greater",
      major: "major",
      moderate: "moderate",
      true: "true",
      improved: "improved",
      supreme: "supreme",
    };
    const prefix = rankMap[rank] ?? rank;
    return prefix + baseKey.charAt(0).toUpperCase() + baseKey.slice(1);
  }

  return toCamelCaseKey(trimmed);
};

/**
 * Liefert für eine Property-Rune:
 *   kind: "weapon" | "armor" | null
 *   key:  den actual System-Key (z.B. "greaterAdvancing") oder null
 */
const resolvePropertyRuneKey = (runeItem, targetItemType, systemRuneData) => {
  const slug = sluggifyRuneName(runeItem);
  const name = runeItem?.name ?? "";
  const nameKey = getPropertyRuneTypeKeyFromName(name);

  const weaponProps = systemRuneData?.weapon?.property ?? {};
  const armorProps = systemRuneData?.armor?.property ?? {};

  const candidates = new Set([slug, nameKey].filter(Boolean));

  const groups = [];
  if (targetItemType === "weapon") groups.push({ kind: "weapon", data: weaponProps });
  if (targetItemType === "armor") groups.push({ kind: "armor", data: armorProps });

  // Falls das Ziel nicht klar ist (sollte hier nicht vorkommen), trotzdem beides versuchen
  if (!groups.length) {
    groups.push({ kind: "weapon", data: weaponProps });
    groups.push({ kind: "armor", data: armorProps });
  }

  for (const { kind, data } of groups) {
    for (const [key, value] of Object.entries(data)) {
      if (!value) continue;
      const dataSlug = (value.slug ?? "").toString();
      if (candidates.has(key) || candidates.has(dataSlug)) {
        return { kind, key };
      }
    }
  }

  // Fallback: bekannte Weapon-Property-Runen über Slug
  if (targetItemType === "weapon" && FALLBACK_WEAPON_PROPERTY_RUNE_SLUGS.has(slug)) {
    return { kind: "weapon", key: slug };
  }

  return { kind: null, key: null };
};

const applyPropertyRune = async (runeItem, targetItem) => {
  const systemRuneData = globalThis.RUNE_DATA ?? globalThis.game?.pf2e?.runes?.RUNE_DATA;
  const systemPrunePropertyRunes =
    globalThis.prunePropertyRunes ?? globalThis.game?.pf2e?.runes?.prunePropertyRunes;

  const runeSlug = sluggifyRuneName(runeItem);
  DBG("applyPropertyRune", { rune: runeItem?.name, runeSlug });

  const existing = targetItem?.system?.runes?.property ?? [];
  const maxSlots = getPropertyRuneSlots(targetItem);
  if (!maxSlots) {
    ui.notifications?.warn?.("No available property rune slots.");
    return false;
  }

  const getPropertyRuneLabel = (value) => {
    if (!systemRuneData) return value;
    const propertyData =
      targetItem.type === "armor"
        ? systemRuneData.armor?.property
        : systemRuneData.weapon?.property;
    if (!propertyData) return value;
    const direct = propertyData[value];
    if (direct?.name) return direct.name;
    const match = Object.values(propertyData).find((entry) => entry?.slug === value);
    return match?.name ?? value;
  };

  const removeFirstMatch = (list, value) => {
    let removed = false;
    return list.filter((entry) => {
      if (!removed && entry === value) {
        removed = true;
        return false;
      }
      return true;
    });
  };

  const promptRuneRemoval = async () =>
    new Promise((resolve) => {
      let resolved = false;
      const options = existing
        .map((value) => {
          const label = getPropertyRuneLabel(value);
          return `<option value="${value}">${label}</option>`;
        })
        .join("");
      const content = `
        <p>Alle Property-Runen-Slots sind belegt.</p>
        <p>Welche Rune entfernen?</p>
        <div class="form-group">
          <label>Rune</label>
          <select name="remove-rune">${options}</select>
        </div>
      `;
      const finalize = (value) => {
        if (resolved) return;
        resolved = true;
        resolve(value ?? null);
      };
      new Dialog({
        title: "Property-Runen-Slots belegt",
        content,
        buttons: {
          confirm: {
            label: "Ersetzen",
            callback: (html) => {
              const value = html.find('select[name="remove-rune"]').val();
              finalize(value);
            },
          },
          cancel: {
            label: "Abbrechen",
            callback: () => finalize(null),
          },
        },
        default: "confirm",
        close: () => finalize(null),
      }).render(true);
    });

  let updatedExisting = existing;
  let removedRuneKey = null;
  if (existing.length >= maxSlots) {
    const removal = await promptRuneRemoval();
    if (!removal) return false;
    updatedExisting = removeFirstMatch(existing, removal);
    removedRuneKey = removal;
  }

  // Kein PF2e RUNE_DATA – simpler Fallback nur für bekannte Waffen-Property-Runen
  if (!systemRuneData || !systemPrunePropertyRunes) {
    const usage = getRuneUsageValue(runeItem);

    // Fallback für Waffen-Property-Runen (wie bisher)
    if (targetItem.type === "weapon" && FALLBACK_WEAPON_PROPERTY_RUNE_SLUGS.has(runeSlug)) {
      const updated = Array.from(new Set([...updatedExisting, runeSlug]));
      await targetItem.update({ "system.runes.property": updated });
      await handleRemovedPropertyRune({
        actor: targetItem?.actor ?? runeItem?.actor,
        runeItem,
        removedRuneKey,
        kind: "weapon",
        systemRuneData: null,
        getPropertyRuneLabel,
      });
      return true;
    }

    // NEU: Fallback für Armor-Property-Runen, wenn keine RUNE_DATA verfügbar ist
    if (targetItem.type === "armor" && usage.startsWith("etched-onto-armor")) {
      const updated = Array.from(new Set([...updatedExisting, runeSlug]));
      await targetItem.update({ "system.runes.property": updated });
      await handleRemovedPropertyRune({
        actor: targetItem?.actor ?? runeItem?.actor,
        runeItem,
        removedRuneKey,
        kind: "armor",
        systemRuneData: null,
        getPropertyRuneLabel,
      });
      return true;
    }

    ui.notifications?.warn?.("PF2e rune data unavailable.");
    return false;
  }

  const { kind, key } = resolvePropertyRuneKey(runeItem, targetItem.type, systemRuneData);

  if (!kind || !key) {
    ui.notifications?.warn?.(
      targetItem.type === "weapon"
        ? "This is not a weapon property rune."
        : targetItem.type === "armor"
        ? "This is not an armor property rune."
        : "Property runes on this item type are not supported."
    );
    return false;
  }

  if (kind === "weapon" && targetItem.type === "weapon") {
    const weaponPropertyData = systemRuneData.weapon?.property ?? {};
    const updated = systemPrunePropertyRunes([...updatedExisting, key], weaponPropertyData);
    await targetItem.update({ "system.runes.property": updated });
    await handleRemovedPropertyRune({
      actor: targetItem?.actor ?? runeItem?.actor,
      runeItem,
      removedRuneKey,
      kind: "weapon",
      systemRuneData,
      getPropertyRuneLabel,
    });
    return true;
  }

  if (kind === "armor" && targetItem.type === "armor") {
    const armorPropertyData = systemRuneData.armor?.property ?? {};
    const updated = systemPrunePropertyRunes([...updatedExisting, key], armorPropertyData);
    await targetItem.update({ "system.runes.property": updated });
    await handleRemovedPropertyRune({
      actor: targetItem?.actor ?? runeItem?.actor,
      runeItem,
      removedRuneKey,
      kind: "armor",
      systemRuneData,
      getPropertyRuneLabel,
    });
    return true;
  }

  ui.notifications?.warn?.("Property runes on this item type are not supported.");
  return false;
};

const buildRuneTargetOptions = (actor, rune) => {
  const actorItems = actor?.items ?? [];
  return actorItems.filter((item) => isRuneCompatible(rune, item));
};

const handleAttachRunesClick = (event) => {
  const appId = event.currentTarget.closest(".app")?.dataset?.appid;
  const windowId = appId != null && appId !== "" ? Number(appId) : null;
  const app = windowId != null ? ui.windows?.[windowId] ?? ui.windows?.[appId] : null;
  const actor = app?.actor;
  const itemId = event.currentTarget.closest("li[data-item-id]")?.dataset.itemId;
  const runeItem = actor?.items?.get(itemId);

  DBG("click", { itemId, rune: runeItem?.name });

  const usage = runeItem?.system?.usage?.value ?? "";
  const usageValue = usage.toString().toLowerCase();
  const rawTraits = runeItem?.system?.traits;
  const traits = Array.isArray(rawTraits?.value) ? rawTraits.value : [];
  const isRune =
    usageValue.startsWith("etched-onto") ||
    traits.includes("property") ||
    traits.includes("fundamental");

  if (!runeItem || !isRune) return;

  const options = buildRuneTargetOptions(actor, runeItem);
  if (!options.length) {
    ui.notifications?.warn("No valid rune targets found.");
    return;
  }

  const dialogContent = `
    <form>
      <div class="form-group">
        <label>Select target</label>
        <select name="rune-target">
          ${options
            .map((item) => `<option value="${item.id}">${item.name}</option>`)
            .join("")}
        </select>
      </div>
      <div class="form-group">
        <label>
          <input type="checkbox" name="consume-rune" ${
            game.settings?.get?.(MODULE_ID, "consumeRuneOnApply") ? "checked" : ""
          } />
          Consume rune item
        </label>
      </div>
    </form>
  `;

  new Dialog({
    title: "Attach Rune",
    content: dialogContent,
    buttons: {
      confirm: {
        label: "Confirm",
        callback: (dialogHtml) => {
          const targetId = dialogHtml.find("select[name='rune-target']").val();
          const consumeRune = dialogHtml
            .find("input[name='consume-rune']")
            .prop("checked");
          if (!targetId) return;

          Hooks.callAll("pf2eRuneManagerAttachRune", {
            actor,
            runeId: itemId,
            targetId,
            consumeRune,
          });
        },
      },
      cancel: { label: "Cancel" },
    },
    default: "confirm",
  }).render(true);
};

const renderActorSheetHook = (app, html) => {
  const itemRows = html.find("li[data-item-id]");
  itemRows.each((_index, row) => {
    const itemId = row.dataset.itemId;
    const item = app.actor?.items?.get(itemId);
    const usage = item?.system?.usage?.value ?? "";
    const usageValue = usage.toString().toLowerCase();
    const rawTraits = item?.system?.traits;
    const traits = Array.isArray(rawTraits?.value) ? rawTraits.value : [];
    const isRune =
      usageValue.startsWith("etched-onto") ||
      traits.includes("property") ||
      traits.includes("fundamental");
    if (!isRune) return;

    const controls = $(row).find(".item-controls");
    if (!controls.length || controls.find(".attach-runes").length) return;

    const attachRunesControl = $(
      '<a class="attach-runes" data-action="attach-runes" data-tooltip="PF2E.RuneManager.AttachRunes"></a>'
    ).append('<i class="fa-solid fa-sparkles fa-fw"></i>');

    controls.append(attachRunesControl);
  });
};

Hooks.on("renderActorSheetPF2e", renderActorSheetHook);

Hooks.once("ready", () => {
  $(document)
    .off(`click${CLICK_NAMESPACE}`, ATTACH_RUNES_SELECTOR)
    .on(`click${CLICK_NAMESPACE}`, ATTACH_RUNES_SELECTOR, handleAttachRunesClick);
});

Hooks.on("pf2eRuneManagerAttachRune", async ({ actor, runeId, targetId, consumeRune }) => {
  const runeItem = actor?.items?.get(runeId);
  const targetItem = actor?.items?.get(targetId);

  DBG("attach", { rune: runeItem?.name, target: targetItem?.name });

  if (!runeItem || !targetItem || !isRuneCompatible(runeItem, targetItem)) {
    DBG("attach blocked", { runeItem, targetItem });
    return;
  }

  const shouldConsume =
    typeof consumeRune === "boolean"
      ? consumeRune
      : game.settings?.get?.(MODULE_ID, "consumeRuneOnApply");

  const runeCategory = getRuneCategory(runeItem);
  DBG("runeCategory", runeCategory);

  const runeLevel = runeItem?.system?.level?.value ?? runeItem?.system?.level ?? 0;
  const dc = getDCForRuneLevel(runeLevel);
  const inlineCheck = `@Check[crafting|dc:${dc}|name:${runeItem.name}]`;
  const speaker = ChatMessage.getSpeaker({ actor });

  const content = `
    <p><strong>Rune Attach (Crafting)</strong></p>
    <p><strong>Rune:</strong> ${runeItem?.name ?? "?"}</p>
    <p><strong>Target:</strong> ${targetItem?.name ?? "?"}</p>
    <p><strong>Item Level:</strong> ${runeLevel || "?"}</p>
    <p><strong>Crafting Check DC:</strong> ${dc}</p>
    <p>${inlineCheck}</p>
  `;

  await ChatMessage.create({
    speaker,
    content,
    type: CONST.CHAT_MESSAGE_TYPES.OTHER,
  });

  new Dialog({
    title: "Crafting Result",
    content: `<p>Did the crafting check to attach <strong>${runeItem?.name ?? "this rune"}</strong> (DC ${dc}) succeed?</p>`,
    buttons: {
      success: {
        label: "Success",
        callback: async () => {
          if (runeCategory === "property" || runeCategory === "weapon") {
            const applied = await applyPropertyRune(runeItem, targetItem);
            if (applied && shouldConsume) await runeItem.delete();
            return;
          }

          if (runeCategory === "fundamental") {
            const applied = await applyFundamentalRune(runeItem, targetItem);
            if (applied && shouldConsume) await runeItem.delete();
            return;
          }

          ui.notifications?.warn("Unable to determine rune category.");
        },
      },
      failure: {
        label: "Failure",
      },
    },
    default: "failure",
  }).render(true);
});
