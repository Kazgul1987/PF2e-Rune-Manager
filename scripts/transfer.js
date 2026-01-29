// scripts/transfer.js

const MODULE_ID = "pf2e-rune-manager";

const TRANSFER_RUNES_SELECTOR = "a[data-action='transfer-runes']";
const CLICK_NAMESPACE_TRANSFER = ".pf2eRuneManagerTransfer";

const DBG_TRANSFER = (...args) => console.log("[RuneManager Transfer DBG]", ...args);

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

// --- Fundamental-Runen-Bewertungen (Level & Preis in GP) ---
// Direkt aus dem PF2e-System (FUNDAMENTAL_*_RUNE_DATA)
const FUNDAMENTAL_RUNE_VALUATION = {
  weapon: {
    potency: {
      1: { level: 2, price: 35 },
      2: { level: 10, price: 935 },
      3: { level: 16, price: 8935 },
      4: { level: 20, price: 70000 },
    },
    striking: {
      1: { level: 4, price: 65 }, // Striking
      2: { level: 12, price: 1065 }, // Greater Striking
      3: { level: 19, price: 31065 }, // Major Striking
      4: { level: 20, price: 70000 }, // Mythic Striking
    },
  },
  armor: {
    potency: {
      1: { level: 5, price: 160 },
      2: { level: 11, price: 1060 },
      3: { level: 18, price: 20560 },
      4: { level: 20, price: 70000 }, // Mythic Armor Potency
    },
    resilient: {
      1: { level: 8, price: 340 }, // Resilient
      2: { level: 14, price: 3440 }, // Greater Resilient
      3: { level: 20, price: 49440 }, // Major Resilient
      4: { level: 20, price: 70000 }, // Mythic Resilient
    },
  },
  shield: {
    reinforcing: {
      1: { level: 4, price: 75 }, // Minor
      2: { level: 7, price: 300 }, // Lesser
      3: { level: 10, price: 900 }, // Moderate
      4: { level: 13, price: 2500 }, // Greater
      5: { level: 16, price: 8000 }, // Major
      6: { level: 19, price: 32000 }, // Supreme
    },
  },
};

/**
 * Vollständige Fallback-Preise für alle Property-Runen (Armor & Weapon),
 * falls getRuneValuationData in der laufenden PF2e-Version nicht erreichbar ist.
 *
 * Schlüssel = slug der Rune (so wie in system.runes.property gespeichert)
 * level = Item Level
 * price = voller Runenpreis in GP
 */
const FALLBACK_PROPERTY_RUNE_VALUATION = {
  armor: {
    "acidResistant": { level: 8, price: 420 },
    "advancing": { level: 9, price: 625 },
    "aimAiding": { level: 6, price: 225 },
    "antimagic": { level: 15, price: 6500 },
    "assisting": { level: 5, price: 125 },
    "bitter": { level: 9, price: 135 },
    "coldResistant": { level: 8, price: 420 },
    "deathless": { level: 7, price: 330 },
    "electricityResistant": { level: 8, price: 420 },
    "energyAdaptive": { level: 13, price: 2600 },
    "ethereal": { level: 17, price: 13500 },
    "fireResistant": { level: 8, price: 420 },
    "fortification": { level: 12, price: 2000 },
    "glamered": { level: 5, price: 140 },
    "gliding": { level: 8, price: 450 },
    "greaterAcidResistant": { level: 12, price: 1650 },
    "greaterAdvancing": { level: 16, price: 8000 },
    "greaterColdResistant": { level: 12, price: 1650 },
    "greaterDread": { level: 18, price: 21000 },
    "greaterElectricityResistant": { level: 12, price: 1650 },
    "greaterFireResistant": { level: 12, price: 1650 },
    "greaterFortification": { level: 19, price: 24000 },
    "greaterInvisibility": { level: 10, price: 1000 },
    "greaterQuenching": { level: 10, price: 1000 },
    "greaterReady": { level: 11, price: 1200 },
    "greaterShadow": { level: 9, price: 650 },
    "greaterSlick": { level: 8, price: 450 },
    "greaterStanching": { level: 9, price: 600 },
    "greaterSwallowSpike": { level: 12, price: 1750 },
    "greaterWinged": { level: 19, price: 35000 },
    "immovable": { level: 12, price: 1800 },
    "implacable": { level: 11, price: 1200 },
    "invisibility": { level: 8, price: 500 },
    "lesserDread": { level: 6, price: 225 },
    "magnetizing": { level: 10, price: 900 },
    "majorQuenching": { level: 14, price: 4500 },
    "majorShadow": { level: 17, price: 14000 },
    "majorSlick": { level: 16, price: 9000 },
    "majorStanching": { level: 13, price: 2500 },
    "majorSwallowSpike": { level: 16, price: 19250 },
    "malleable": { level: 9, price: 650 },
    "misleading": { level: 16, price: 8000 },
    "moderateDread": { level: 12, price: 1800 },
    "portable": { level: 9, price: 660 },
    "quenching": { level: 6, price: 250 },
    "raiment": { level: 5, price: 140 },
    "ready": { level: 6, price: 200 },
    "rockBraced": { level: 13, price: 3000 },
    "shadow": { level: 5, price: 55 },
    "sinisterKnight": { level: 8, price: 500 },
    "sizeChanging": { level: 7, price: 350 },
    "slick": { level: 5, price: 45 },
    "soaring": { level: 14, price: 3750 },
    "stanching": { level: 5, price: 130 },
    "swallowSpike": { level: 6, price: 200 },
    "trueQuenching": { level: 18, price: 24000 },
    "trueStanching": { level: 17, price: 12500 },
    "winged": { level: 13, price: 2500 },
  },
  weapon: {
    "ancestralEchoing": { level: 15, price: 9500 },
    "anchoring": { level: 10, price: 900 },
    "ashen": { level: 9, price: 700 },
    "astral": { level: 8, price: 450 },
    "authorized": { level: 3, price: 50 },
    "bane": { level: 4, price: 100 },
    "bloodbane": { level: 8, price: 475 },
    "bloodthirsty": { level: 16, price: 8500 },
    "brilliant": { level: 12, price: 2000 },
    "called": { level: 7, price: 350 },
    "coating": { level: 9, price: 700 },
    "conducting": { level: 7, price: 300 },
    "corrosive": { level: 8, price: 500 },
    "crushing": { level: 3, price: 50 },
    "cunning": { level: 5, price: 140 },
    "dancing": { level: 13, price: 2700 },
    "deathdrinking": { level: 7, price: 360 },
    "decaying": { level: 8, price: 500 },
    "demolishing": { level: 6, price: 225 },
    "disrupting": { level: 5, price: 150 },
    "earthbinding": { level: 5, price: 125 },
    "energizing": { level: 6, price: 250 },
    "extending": { level: 7, price: 700 },
    "fanged": { level: 2, price: 30 },
    "fearsome": { level: 5, price: 160 },
    "flaming": { level: 8, price: 500 },
    "flickering": { level: 6, price: 250 },
    "flurrying": { level: 7, price: 360 },
    "frost": { level: 8, price: 500 },
    "ghostTouch": { level: 4, price: 75 },
    "giantKilling": { level: 8, price: 450 },
    "greaterAnchoring": { level: 18, price: 22000 },
    "greaterAshen": { level: 16, price: 9000 },
    "greaterAstral": { level: 15, price: 6000 },
    "greaterBloodbane": { level: 13, price: 2800 },
    "greaterBrilliant": { level: 18, price: 24000 },
    "greaterCorrosive": { level: 15, price: 6500 },
    "greaterCrushing": { level: 9, price: 650 },
    "greaterDecaying": { level: 15, price: 6500 },
    "greaterDisrupting": { level: 14, price: 4300 },
    "greaterExtending": { level: 13, price: 3000 },
    "greaterFanged": { level: 8, price: 425 },
    "greaterFearsome": { level: 12, price: 2000 },
    "greaterFlaming": { level: 15, price: 6500 },
    "greaterFrost": { level: 15, price: 6500 },
    "greaterGiantKilling": { level: 15, price: 6000 },
    "greaterHauling": { level: 11, price: 1300 },
    "greaterImpactful": { level: 17, price: 15000 },
    "greaterRooting": { level: 11, price: 1400 },
    "greaterShock": { level: 15, price: 6500 },
    "greaterThundering": { level: 15, price: 6500 },
    "grievous": { level: 9, price: 700 },
    "hauling": { level: 6, price: 225 },
    "holy": { level: 11, price: 1400 },
    "hooked": { level: 5, price: 140 },
    "hopeful": { level: 11, price: 1200 },
    "impactful": { level: 10, price: 1000 },
    "impossible": { level: 20, price: 70000 },
    "keen": { level: 13, price: 3000 },
    "kinWarding": { level: 3, price: 52 },
    "majorFanged": { level: 15, price: 6000 },
    "majorRooting": { level: 15, price: 6500 },
    "merciful": { level: 4, price: 70 },
    "nightmare": { level: 9, price: 250 },
    "pacifying": { level: 5, price: 150 },
    "returning": { level: 3, price: 55 },
    "rooting": { level: 7, price: 360 },
    "serrating": { level: 10, price: 1000 },
    "shifting": { level: 6, price: 225 },
    "shock": { level: 8, price: 500 },
    "shockwave": { level: 13, price: 3000 },
    "speed": { level: 16, price: 10000 },
    "spellStoring": { level: 13, price: 2700 },
    "swarming": { level: 9, price: 700 },
    "thundering": { level: 8, price: 500 },
    "trueRooting": { level: 19, price: 40000 },
    "underwater": { level: 3, price: 50 },
    "unholy": { level: 11, price: 1400 },
    "vorpal": { level: 17, price: 15000 },
    "wounding": { level: 7, price: 340 },
  },
  shield: {},
};

// --- Utils ---

const isItemTypeTransfer = (item, type) =>
  typeof item?.isOfType === "function" ? item.isOfType(type) : item?.type === type;

/** Property-Rune-Slots eines Ziel-Items bestimmen (mit PF2e-API, Fallback = Potency) */
const getPropertyRuneSlotsTransfer = (targetItem) => {
  const systemSlotsFn =
    globalThis.getPropertyRuneSlots ??
    globalThis.game?.pf2e?.runes?.getPropertyRuneSlots ??
    globalThis.game?.pf2e?.item?.getPropertyRuneSlots ??
    globalThis.game?.pf2e?.Item?.getPropertyRuneSlots;

  if (typeof systemSlotsFn === "function") {
    try {
      return systemSlotsFn(targetItem);
    } catch {
      // fall through to fallback
    }
  }

  const potency = Number(targetItem?.system?.runes?.potency ?? 0);
  return Math.max(0, potency);
};

/** Aktive Party ermitteln (falls gesetzt) */
const getActivePartyActor = () => {
  try {
    const partyId = game.settings?.get?.("pf2e", "activeParty");
    if (!partyId) return null;
    return game.actors?.get?.(partyId) ?? null;
  } catch {
    return null;
  }
};

/** GP-Bargeld eines Actors (inventar coins -> goldValue) */
const getActorGoldValue = (actor) => {
  try {
    const coins = actor?.inventory?.coins;
    return Number(coins?.goldValue ?? 0);
  } catch {
    return 0;
  }
};

/** Preis (GP) -> 10% Kosten in GP */
const getRuneTransferCostGP = (priceGP) => (Number(priceGP) || 0) * 0.1;

/** 10% Kosten in GP -> Kupfer für removeCoins(byValue) */
const getRuneTransferCostCP = (priceGP) => {
  // priceGP * 100 (cp/gp) * 0.1 (10%) = priceGP * 10
  return Math.round((Number(priceGP) || 0) * 10);
};

/** CamelCase/Slug zu lesbarem Namen ("greaterSlick" -> "Greater Slick") */
const titleCaseFromSlug = (slug) => {
  if (!slug) return "";
  const cleaned = slug.toString().replace(/([A-Z])/g, " $1").replace(/[-_]+/g, " ");
  return cleaned
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
};

/** Fundamental-Runen-Label je nach Rang */
const getFundamentalRuneLabel = (itemType, kind, rank) => {
  const r = Number(rank) || 0;
  if (kind === "potency") {
    return `${itemType === "weapon" ? "Weapon" : itemType === "armor" ? "Armor" : "Shield"} Potency +${r}`;
  }

  if (kind === "striking") {
    switch (r) {
      case 1:
        return "Striking Rune";
      case 2:
        return "Greater Striking Rune";
      case 3:
        return "Major Striking Rune";
      case 4:
        return "Mythic Striking Rune";
      default:
        return `Striking Rune (Rank ${r})`;
    }
  }

  if (kind === "resilient") {
    switch (r) {
      case 1:
        return "Resilient Rune";
      case 2:
        return "Greater Resilient Rune";
      case 3:
        return "Major Resilient Rune";
      case 4:
        return "Mythic Resilient Rune";
      default:
        return `Resilient Rune (Rank ${r})`;
    }
  }

  if (kind === "reinforcing") {
    switch (r) {
      case 1:
        return "Reinforcing Rune (Minor)";
      case 2:
        return "Reinforcing Rune (Lesser)";
      case 3:
        return "Reinforcing Rune (Moderate)";
      case 4:
        return "Reinforcing Rune (Greater)";
      case 5:
        return "Reinforcing Rune (Major)";
      case 6:
        return "Reinforcing Rune (Supreme)";
      default:
        return `Reinforcing Rune (Rank ${r})`;
    }
  }

  return `${kind} Rune (Rank ${r})`;
};

/** Fundamental-Runen Level & Preis aus FUNDAMENTAL_RUNE_VALUATION holen */
const getFundamentalRuneValuation = (itemType, kind, rank) => {
  const table = FUNDAMENTAL_RUNE_VALUATION[itemType]?.[kind];
  if (!table) return { level: 0, price: 0 };
  const entry = table[Number(rank) || 0];
  if (!entry) return { level: 0, price: 0 };
  return { level: entry.level ?? 0, price: entry.price ?? 0 };
};

/** PF2e-Rune-Valuation-Funktion holen (falls verfügbar) */
const getRuneValuationFn = () =>
  globalThis.getRuneValuationData ??
  globalThis.game?.pf2e?.runes?.getRuneValuationData ??
  null;

/** Versuch, für eine Property-Rune Level & Preis zu bekommen */
const getPropertyRuneValuation = (item, propertySlug, runeValuations) => {
  // 1) Versuch über getRuneValuationData (falls verfügbar)
  if (Array.isArray(runeValuations) && runeValuations.length) {
    const found = runeValuations.find(
      (data) => typeof data?.slug === "string" && data.slug === propertySlug
    );
    if (found) {
      const level = Number(found.level ?? 0) || 0;
      const price = Number(found.price ?? 0) || 0;
      if (price > 0 || level > 0) {
        return { level, price };
      }
    }
  }

  // 2) Fallback über unsere lokale Tabelle
  const itemType = item?.type;
  const table =
    itemType === "weapon"
      ? FALLBACK_PROPERTY_RUNE_VALUATION.weapon
      : itemType === "armor"
      ? FALLBACK_PROPERTY_RUNE_VALUATION.armor
      : itemType === "shield"
      ? FALLBACK_PROPERTY_RUNE_VALUATION.shield
      : null;

  if (table && Object.prototype.hasOwnProperty.call(table, propertySlug)) {
    const entry = table[propertySlug];
    return { level: entry.level ?? 0, price: entry.price ?? 0 };
  }

  // 3) Wenn wir gar nichts wissen: 0 / 0 zurückgeben
  return { level: 0, price: 0 };
};

/** Auswahl-Liste der einzelnen Runen eines Items vorbereiten */
const buildRuneChoices = (sourceItem) => {
  const runes = sourceItem?.system?.runes ?? {};
  const itemType = sourceItem?.type;
  const choices = [];

  if (!["weapon", "armor", "shield"].includes(itemType)) return choices;

  const runeValuationFn = getRuneValuationFn();
  const runeValuations =
    typeof runeValuationFn === "function" ? runeValuationFn(sourceItem) ?? [] : [];

  const isWeapon = isItemTypeTransfer(sourceItem, "weapon");
  const isArmor = isItemTypeTransfer(sourceItem, "armor");
  const isShield = isItemTypeTransfer(sourceItem, "shield");

  // Fundamental: Potency
  const potency = Number(runes.potency ?? 0);
  if (potency > 0 && (isWeapon || isArmor)) {
    const kind = "potency";
    const label = getFundamentalRuneLabel(itemType, kind, potency);
    const { level, price } = getFundamentalRuneValuation(itemType, kind, potency);

    choices.push({
      id: `fundamental:${itemType}:${kind}:${potency}`,
      type: "fundamental",
      kind,
      itemType,
      rank: potency,
      slug: null,
      level,
      price,
      label,
    });
  }

  // Fundamental: Striking / Resilient / Reinforcing
  if (isWeapon) {
    const striking = Number(runes.striking ?? 0);
    if (striking > 0) {
      const kind = "striking";
      const label = getFundamentalRuneLabel(itemType, kind, striking);
      const { level, price } = getFundamentalRuneValuation(itemType, kind, striking);
      choices.push({
        id: `fundamental:${itemType}:${kind}:${striking}`,
        type: "fundamental",
        kind,
        itemType,
        rank: striking,
        slug: null,
        level,
        price,
        label,
      });
    }
  }

  if (isArmor) {
    const resilient = Number(runes.resilient ?? 0);
    if (resilient > 0) {
      const kind = "resilient";
      const label = getFundamentalRuneLabel(itemType, kind, resilient);
      const { level, price } = getFundamentalRuneValuation(itemType, kind, resilient);
      choices.push({
        id: `fundamental:${itemType}:${kind}:${resilient}`,
        type: "fundamental",
        kind,
        itemType,
        rank: resilient,
        slug: null,
        level,
        price,
        label,
      });
    }
  }

  if (isShield) {
    const reinforcing = Number(runes.reinforcing ?? 0);
    if (reinforcing > 0) {
      const kind = "reinforcing";
      const label = getFundamentalRuneLabel(itemType, kind, reinforcing);
      const { level, price } = getFundamentalRuneValuation(itemType, kind, reinforcing);
      choices.push({
        id: `fundamental:${itemType}:${kind}:${reinforcing}`,
        type: "fundamental",
        kind,
        itemType,
        rank: reinforcing,
        slug: null,
        level,
        price,
        label,
      });
    }
  }

  // Property-Runen: jede einzeln
  const propRunes = Array.isArray(runes.property) ? runes.property : [];
  propRunes.forEach((slug, index) => {
    if (!slug) return;
    const labelName = titleCaseFromSlug(slug);
    const { level, price } = getPropertyRuneValuation(sourceItem, slug, runeValuations);

    choices.push({
      id: `property:${itemType}:${slug}:${index}`,
      type: "property",
      itemType,
      kind: "property",
      rank: null,
      slug,
      level,
      price,
      label: `${labelName} (${itemType === "weapon" ? "Weapon Property" : "Armor Property"})`,
    });
  });

  return choices;
};

/**
 * Versucht, die 10%-Kosten einer Rune von Actor ODER Party abzuziehen,
 * je nach paySource: "actor" | "party".
 */
const payRuneTransferCost = async (actor, partyActor, priceGP, paySource) => {
  const costCP = getRuneTransferCostCP(priceGP); // 10% in Kupfer
  if (costCP <= 0) {
    return { success: true, costGP: 0 };
  }

  const actorCoins = actor?.inventory?.coins;
  const partyCoins = partyActor?.inventory?.coins;

  const actorCP = Number(actorCoins?.copperValue ?? 0);
  const partyCP = Number(partyCoins?.copperValue ?? 0);

  const costGP = costCP / 100;

  if (paySource === "party") {
    if (!partyActor) {
      ui.notifications?.warn?.("No active party found to pay the rune transfer cost.");
      return { success: false, costGP };
    }
    if (partyCP < costCP) {
      ui.notifications?.warn?.(
        `Party stash does not have enough funds to pay rune transfer cost (${costGP.toFixed(
          2
        )} gp).`
      );
      return { success: false, costGP };
    }

    const ok = await partyActor.inventory.removeCoins({ cp: costCP }, { byValue: true });
    if (!ok) {
      ui.notifications?.warn?.("Could not remove coins from party stash.");
      return { success: false, costGP };
    }
    return { success: true, costGP };
  }

  // Default / "actor"
  if (actorCP < costCP) {
    ui.notifications?.warn?.(
      `Actor does not have enough funds to pay rune transfer cost (${costGP.toFixed(2)} gp).`
    );
    return { success: false, costGP };
  }

  const ok = await actor.inventory.removeCoins({ cp: costCP }, { byValue: true });
  if (!ok) {
    ui.notifications?.warn?.("Could not remove coins from actor.");
    return { success: false, costGP };
  }

  return { success: true, costGP };
};

/**
 * Tatsächlicher Transfer einer EINZELNEN Rune vom Source-Item zum Target-Item
 */
const executeSingleRuneTransfer = async ({ source, target, choice, removeFromSource }) => {
  const sourceRunes = foundry.utils.duplicate(source.system?.runes ?? {});
  const targetRunes = foundry.utils.duplicate(target.system?.runes ?? {});

  const updatesSource = {};
  const updatesTarget = {};

  DBG_TRANSFER("executeSingleRuneTransfer", { source: source.name, target: target.name, choice });

  const isWeapon = isItemTypeTransfer(source, "weapon");
  const isArmor = isItemTypeTransfer(source, "armor");
  const isShield = isItemTypeTransfer(source, "shield");

  if (choice.type === "fundamental") {
    const { kind, rank } = choice;
    const r = Number(rank ?? 0);

    if (kind === "potency" && (isWeapon || isArmor)) {
      updatesTarget["system.runes.potency"] = r;
      if (removeFromSource) updatesSource["system.runes.potency"] = 0;
    } else if (kind === "striking" && isWeapon) {
      updatesTarget["system.runes.striking"] = r;
      if (removeFromSource) updatesSource["system.runes.striking"] = 0;
    } else if (kind === "resilient" && isArmor) {
      updatesTarget["system.runes.resilient"] = r;
      if (removeFromSource) updatesSource["system.runes.resilient"] = 0;
    } else if (kind === "reinforcing" && isShield) {
      updatesTarget["system.runes.reinforcing"] = r;
      if (removeFromSource) updatesSource["system.runes.reinforcing"] = 0;
    } else {
      ui.notifications?.warn?.("This fundamental rune cannot be transferred between these items.");
      return false;
    }
  } else if (choice.type === "property") {
    const slug = choice.slug;
    if (!slug) {
      ui.notifications?.warn?.("Missing property rune slug.");
      return false;
    }

    const maxSlots = getPropertyRuneSlotsTransfer(target);
    const sourceProps = Array.isArray(sourceRunes.property) ? [...sourceRunes.property] : [];
    const targetProps = Array.isArray(targetRunes.property) ? [...targetRunes.property] : [];

    if (!targetProps.includes(slug)) {
      targetProps.push(slug);
    }

    if (maxSlots && targetProps.filter(Boolean).length > maxSlots) {
      ui.notifications?.warn?.("Target item has no available property rune slots.");
      return false;
    }

    updatesTarget["system.runes.property"] = targetProps;

    if (removeFromSource) {
      const idx = sourceProps.indexOf(slug);
      if (idx !== -1) {
        sourceProps.splice(idx, 1);
        updatesSource["system.runes.property"] = sourceProps;
      }
    }
  } else {
    ui.notifications?.warn?.("Unknown rune type to transfer.");
    return false;
  }

  const updatePromises = [];
  if (Object.keys(updatesTarget).length) updatePromises.push(target.update(updatesTarget));
  if (Object.keys(updatesSource).length) updatePromises.push(source.update(updatesSource));

  if (updatePromises.length) {
    await Promise.all(updatePromises);
    return true;
  } else {
    ui.notifications?.info?.("No rune changes were necessary.");
    return false;
  }
};

/**
 * Kompletten Ablauf für eine Rune:
 * - ggf. Kosten einziehen (Vendor / Crafting Success)
 * - Rune von Source -> Target übertragen
 */
const performRuneTransferWithCost = async ({
  actor,
  partyActor,
  source,
  target,
  choice,
  method,
  removeFromSource,
  paySource,
}) => {
  const level = Number(choice.level ?? 0);
  const priceGP = Number(choice.price ?? 0);
  const dc = getDCForRuneLevel(level);
  const costGP = getRuneTransferCostGP(priceGP);

  DBG_TRANSFER("performRuneTransferWithCost", {
    method,
    choice,
    level,
    priceGP,
    dc,
    costGP,
    paySource,
  });

  if (method === "vendor") {
    // Direkt bezahlen und übertragen
    const payment = await payRuneTransferCost(actor, partyActor, priceGP, paySource);
    if (!payment.success) return;

    const ok = await executeSingleRuneTransfer({ source, target, choice, removeFromSource });
    if (ok) {
      ui.notifications?.info?.(
        `Rune transferred via vendor. Cost: ${payment.costGP.toFixed(
          2
        )} gp (10% of rune price).`
      );
    }
    return;
  }

  // --- Crafting: zuerst Chat-Eintrag mit Inline-Check, dann Ergebnis abfragen ---
  const runeLabel = choice.label ?? "Rune";
  const speaker = ChatMessage.getSpeaker({ actor });

  const inlineCheck = `@Check[crafting|dc:${dc}|name:${runeLabel}]`;
  const content = `
    <p><strong>Rune Transfer (Crafting)</strong></p>
    <p><strong>Rune:</strong> ${runeLabel}</p>
    <p><strong>Item Level:</strong> ${level || "?"}</p>
    <p><strong>Rune Price:</strong> ${priceGP || 0} gp</p>
    <p><strong>Crafting Check DC:</strong> ${dc}</p>
    <p>${inlineCheck}</p>
    <p>On success: Pay 10% of rune price (${costGP.toFixed(
      2
    )} gp) from ${paySource === "party" ? "party stash" : "actor"} funds and transfer the rune.</p>
  `;

  await ChatMessage.create({
    speaker,
    content,
    type: CONST.CHAT_MESSAGE_TYPES.OTHER,
  });

  // Nach dem Wurf Ergebnis manuell bestätigen lassen
  new Dialog({
    title: "Crafting Result",
    content: `<p>Did the crafting check to transfer <strong>${runeLabel}</strong> (DC ${dc}) succeed?</p>`,
    buttons: {
      success: {
        label: "Success",
        callback: async () => {
          const payment = await payRuneTransferCost(actor, partyActor, priceGP, paySource);
          if (!payment.success) return;

          const ok = await executeSingleRuneTransfer({
            source,
            target,
            choice,
            removeFromSource,
          });
          if (ok) {
            ui.notifications?.info?.(
              `Rune transferred via crafting. Cost: ${payment.costGP.toFixed(
                2
              )} gp (10% of rune price).`
            );
          }
        },
      },
      failure: {
        label: "Failure",
      },
    },
    default: "failure",
  }).render(true);
};

/** Mögliche Ziel-Items für Transfer (gleicher Typ, anderes Item) */
const buildRuneTransferTargets = (actor, sourceItem) => {
  if (!actor || !sourceItem) return [];
  return actor.items.filter(
    (item) =>
      item.id !== sourceItem.id &&
      ["weapon", "armor", "shield"].includes(item.type) &&
      item.type === sourceItem.type
  );
};

// --- UI / Hooks ---

/** Klick auf das Transfer-Icon in der Inventarliste */
const handleTransferRunesClick = (event) => {
  const appId = event.currentTarget.closest(".app")?.dataset?.appid;
  const windowId = appId != null && appId !== "" ? Number(appId) : null;
  const app = windowId != null ? ui.windows?.[windowId] ?? ui.windows?.[appId] : null;
  const actor = app?.actor;
  const sourceId = event.currentTarget.closest("li[data-item-id]")?.dataset.itemId;
  const sourceItem = actor?.items?.get(sourceId);

  DBG_TRANSFER("click", { sourceId, sourceName: sourceItem?.name });

  if (!actor || !sourceItem) return;

  const targets = buildRuneTransferTargets(actor, sourceItem);
  if (!targets.length) {
    ui.notifications?.warn?.("No valid rune transfer targets found.");
    return;
  }

  const runeChoices = buildRuneChoices(sourceItem);
  if (!runeChoices.length) {
    ui.notifications?.warn?.("Source item has no runes to transfer.");
    return;
  }

  const partyActor = getActivePartyActor();
  const actorGP = getActorGoldValue(actor);
  const partyGP = partyActor ? getActorGoldValue(partyActor) : 0;

  const runeOptionsHTML = runeChoices
    .map(
      (c) =>
        `<option value="${c.id}">${c.label}${
          c.level || c.price
            ? ` (Lvl ${c.level || "?"}, Price ${c.price || 0} gp)`
            : ""
        }</option>`
    )
    .join("");

  const dialogContent = `
    <form>
      <div class="form-group">
        <label>Source item</label>
        <div class="form-fields">
          <span>${sourceItem.name}</span>
        </div>
      </div>

      <div class="form-group">
        <label>Target item</label>
        <select name="target">
          ${targets.map((i) => `<option value="${i.id}">${i.name}</option>`).join("")}
        </select>
      </div>

      <div class="form-group">
        <label>Rune to transfer</label>
        <select name="rune-choice">
          ${runeOptionsHTML}
        </select>
      </div>

      <div class="form-group">
        <label>Transfer method</label>
        <div class="form-fields">
          <label><input type="radio" name="method" value="crafting" checked /> Crafting</label>
          <label><input type="radio" name="method" value="vendor" /> Vendor</label>
        </div>
      </div>

      <div class="form-group">
        <label>Funds</label>
        <div class="form-fields">
          <p>Actor cash: ${actorGP.toFixed(2)} gp</p>
          <p>Party stash: ${partyGP.toFixed(2)} gp</p>
        </div>
      </div>

      <div class="form-group">
        <label>Payment source</label>
        <div class="form-fields">
          <label><input type="radio" name="pay-source" value="actor" checked /> Actor</label>
          <label><input type="radio" name="pay-source" value="party" /> Party stash</label>
        </div>
      </div>

      <div class="form-group">
        <label>
          <input type="checkbox" name="remove" checked />
          Remove rune from source after transfer
        </label>
      </div>
    </form>
  `;

  new Dialog(
    {
      title: "Transfer Runes",
      content: dialogContent,
      buttons: {
        confirm: {
          label: "Confirm",
          callback: async (html) => {
            const targetId = html.find("select[name='target']").val();
            const runeId = html.find("select[name='rune-choice']").val();
            const method = html.find("input[name='method']:checked").val() || "crafting";
            const paySource = html.find("input[name='pay-source']:checked").val() || "actor";
            const remove = html.find("input[name='remove']").prop("checked");

            if (!targetId || !runeId) return;

            const target = actor.items.get(targetId);
            if (!target) return;

            const choice = runeChoices.find((c) => c.id === runeId);
            if (!choice) {
              ui.notifications?.warn?.("Selected rune could not be resolved.");
              return;
            }

            Hooks.callAll("pf2eRuneManagerTransferRunes", {
              actor,
              partyActor,
              sourceId,
              targetId,
              choice,
              method,
              removeFromSource: remove,
              paySource,
            });
          },
        },
        cancel: { label: "Cancel" },
      },
      default: "confirm",
    },
    { width: 650 } // <-- größerer Dialog für bessere Lesbarkeit
  ).render(true);
};

/** Icon in die Actor-Sheet-Inventarliste einbauen */
const renderActorSheetTransferHook = (app, html) => {
  const itemRows = html.find("li[data-item-id]");
  itemRows.each((_index, row) => {
    const itemId = row.dataset.itemId;
    const item = app.actor?.items?.get(itemId);
    if (!item || !["weapon", "armor", "shield"].includes(item.type)) return;

    const controls = $(row).find(".item-controls");
    if (!controls.length || controls.find(".transfer-runes").length) return;

    const transferControl = $(
      '<a class="transfer-runes" data-action="transfer-runes" data-tooltip="PF2E.RuneManager.TransferRunes"></a>'
    ).append('<i class="fa-solid fa-right-left fa-fw"></i>');

    controls.append(transferControl);
  });
};

// Hook: Icon auf PF2e-Actor-Sheets
Hooks.on("renderActorSheetPF2e", renderActorSheetTransferHook);

// Hook: Klick-Handler registrieren
Hooks.once("ready", () => {
  $(document)
    .off(`click${CLICK_NAMESPACE_TRANSFER}`, TRANSFER_RUNES_SELECTOR)
    .on(`click${CLICK_NAMESPACE_TRANSFER}`, TRANSFER_RUNES_SELECTOR, handleTransferRunesClick);
});

// Hook: eigentliche Logik ausführen
Hooks.on(
  "pf2eRuneManagerTransferRunes",
  async ({ actor, partyActor, sourceId, targetId, choice, method, removeFromSource, paySource }) => {
    const source = actor?.items?.get(sourceId);
    const target = actor?.items?.get(targetId);
    DBG_TRANSFER("pf2eRuneManagerTransferRunes", {
      source: source?.name,
      target: target?.name,
      choice,
      method,
      removeFromSource,
      paySource,
    });
    if (!source || !target) return;

    await performRuneTransferWithCost({
      actor,
      partyActor,
      source,
      target,
      choice,
      method,
      removeFromSource,
      paySource: paySource || "actor",
    });
  }
);
