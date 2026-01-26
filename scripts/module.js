const RUNE_USAGE = {
  etchedOnto: "etched-onto",
  etchedOntoHeavyArmor: "etched-onto-heavy-armor",
  etchedOntoMediumArmor: "etched-onto-medium-armor",
  etchedOntoLightArmor: "etched-onto-light-armor",
  etchedOntoArmor: "etched-onto-armor",
  etchedOntoWeapon: "etched-onto-a-weapon",
  etchedOntoShield: "etched-onto-a-shield",
};

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

const getRuneUsageValue = (runeItem) =>
  (runeItem?.system?.usage?.value ?? runeItem?.system?.usage ?? "").toString().toLowerCase();

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

const isRuneCompatible = (runeItem, targetItem) => {
  if (!runeItem || !targetItem) {
    return false;
  }

  if (!["weapon", "armor", "shield"].includes(targetItem.type)) {
    return false;
  }

  const runeUsage = getRuneUsageValue(runeItem);
  const runeTraits = getRuneTraits(runeItem);
  const runeType =
    runeItem?.system?.runes?.type ??
    runeItem?.system?.runes?.category ??
    runeItem?.system?.runes?.value ??
    runeItem?.system?.runeType ??
    "";

  const targetCategory = targetItem?.system?.category?.toString().toLowerCase() ?? "";
  const targetDamageType =
    targetItem?.system?.damage?.damageType?.toString().toLowerCase() ?? "";
  const targetPropertyRunes = (targetItem?.system?.runes?.property ?? []).map((rune) =>
    rune?.toString().toLowerCase()
  );
  const targetTraits = getItemTraits(targetItem);
  const targetMaterialType = targetItem?.system?.material?.type?.toString().toLowerCase() ?? "";
  const targetRange =
    Number(targetItem?.system?.range?.value ?? targetItem?.system?.range ?? 0) || 0;
  const targetBaseItem = targetItem?.system?.baseItem?.toString().toLowerCase() ?? "";
  const targetSlug = targetItem?.slug ?? targetItem?.system?.slug ?? "";
  const targetNameSlug = (targetItem?.name ?? "").toString().toLowerCase().replace(/\s+/g, "-");

  const isWeapon = isItemType(targetItem, "weapon");
  const isArmor = isItemType(targetItem, "armor");
  const isShield = isItemType(targetItem, "shield");
  const isThrownWeapon = isWeapon && targetTraits.includes("thrown");
  const isMeleeWeapon =
    isWeapon && (targetTraits.includes("melee") || (!targetRange && !isThrownWeapon));
  const isMetalArmor =
    isArmor && (targetTraits.includes("metal") || targetMaterialType === "metal");
  const isNonmetalArmor =
    isArmor && (targetTraits.includes("nonmetal") || targetMaterialType === "nonmetal");
  const isClanDagger =
    targetBaseItem === "clan-dagger" ||
    targetSlug.toString().toLowerCase() === "clan-dagger" ||
    targetNameSlug === "clan-dagger";

  // Prefer system usage values (see PF2e usage config) and only fall back to traits if needed.
  const isEtchedUsage = runeUsage.startsWith(RUNE_USAGE.etchedOnto);
  const isWeaponTarget = isEtchedUsage
    ? runeUsage.includes("weapon")
    : runeTraits.includes("weapon");
  const isArmorTarget = isEtchedUsage ? runeUsage.includes("armor") : runeTraits.includes("armor");
  const isShieldTarget = isEtchedUsage
    ? runeUsage.includes("shield")
    : runeTraits.includes("shield");

  if (isWeaponTarget && targetItem.type !== "weapon") {
    return false;
  }
  if (isArmorTarget && targetItem.type !== "armor") {
    return false;
  }
  if (isShieldTarget && targetItem.type !== "shield") {
    return false;
  }

  const usageChecks = {
    "etched-onto-a-weapon": () => isWeapon,
    "etched-onto-a-shield": () => isShield,
    "etched-onto-armor": () => isArmor,
    "etched-onto-heavy-armor": () => isArmor && targetCategory === "heavy-armor",
    "etched-onto-medium-armor": () => isArmor && targetCategory === "medium-armor",
    "etched-onto-light-armor": () => isArmor && targetCategory === "light-armor",
    "etched-onto-metal-armor": () => isArmor && isMetalArmor,
    "etched-onto-lm-nonmetal-armor": () =>
      isArmor &&
      ["light-armor", "medium-armor"].includes(targetCategory) &&
      isNonmetalArmor,
    "etched-onto-med-heavy-armor": () =>
      isArmor && ["medium-armor", "heavy-armor"].includes(targetCategory),
    "etched-onto-medium-heavy-metal-armor": () =>
      isArmor && ["medium-armor", "heavy-armor"].includes(targetCategory) && isMetalArmor,
    "etched-onto-bludgeoning-weapon": () => isWeapon && targetDamageType === "bludgeoning",
    "etched-onto-melee-weapon": () => isWeapon && isMeleeWeapon,
    "etched-onto-melee-weapon-monk": () => isWeapon && isMeleeWeapon && targetTraits.includes("monk"),
    "etched-onto-slashing-melee-weapon": () =>
      isWeapon && isMeleeWeapon && targetDamageType === "slashing",
    "etched-onto-piercing-or-slashing-melee-weapon": () =>
      isWeapon &&
      isMeleeWeapon &&
      ["piercing", "slashing"].includes(targetDamageType),
    "etched-onto-piercing-or-slashing-weapon": () =>
      isWeapon && ["piercing", "slashing"].includes(targetDamageType),
    "etched-onto-weapon-wo-anarchic-rune": () => isWeapon && !targetPropertyRunes.includes("anarchic"),
    "etched-onto-weapon-wo-axiomatic-rune": () =>
      isWeapon && !targetPropertyRunes.includes("axiomatic"),
    "etched-onto-weapon-wo-unholy-rune": () => isWeapon && !targetPropertyRunes.includes("unholy"),
    "etched-onto-weapon-wo-holy-rune": () => isWeapon && !targetPropertyRunes.includes("holy"),
    "etched-onto-clan-dagger": () => isWeapon && isClanDagger,
    "etched-onto-thrown-weapon": () => isWeapon && isThrownWeapon,
  };
  const usageCheck = usageChecks[runeUsage];
  if (usageCheck && !usageCheck()) {
    return false;
  }

  const damageTypeTraits = ["piercing", "slashing", "bludgeoning"];
  const runeDamageTrait = runeTraits.find((trait) => damageTypeTraits.includes(trait));
  if (runeDamageTrait && targetDamageType && runeDamageTrait !== targetDamageType) {
    return false;
  }

  const hasHolyTrait = runeTraits.includes("holy");
  const hasUnholyTrait = runeTraits.includes("unholy");
  const hasWoHolyTrait = runeTraits.includes("wo-holy");
  const hasWoUnholyTrait = runeTraits.includes("wo-unholy");

  if (hasWoHolyTrait && targetPropertyRunes.includes("holy")) {
    return false;
  }
  if (hasWoUnholyTrait && targetPropertyRunes.includes("unholy")) {
    return false;
  }
  if (hasHolyTrait && (targetPropertyRunes.includes("unholy") || targetPropertyRunes.includes("wo-holy"))) {
    return false;
  }
  if (
    hasUnholyTrait &&
    (targetPropertyRunes.includes("holy") || targetPropertyRunes.includes("wo-unholy"))
  ) {
    return false;
  }

  if (runeType === "property" || runeTraits.includes("property")) {
    const slots = getPropertyRuneSlots(targetItem);
    const usedSlots = targetPropertyRunes.length;
    if (!slots || slots - usedSlots <= 0) {
      return false;
    }
  }

  const systemRuneData = globalThis.RUNE_DATA ?? globalThis.game?.pf2e?.runes?.RUNE_DATA;
  const systemPrunePropertyRunes =
    globalThis.prunePropertyRunes ?? globalThis.game?.pf2e?.runes?.prunePropertyRunes;
  const runeSlug =
    runeItem?.slug ??
    runeItem?.system?.slug ??
    runeItem?.system?.runes?.slug ??
    runeItem?.name?.toString().toLowerCase().replace(/\s+/g, "-");

  if (
    systemRuneData &&
    systemPrunePropertyRunes &&
    (runeType === "property" || runeTraits.includes("property")) &&
    runeSlug &&
    systemRuneData[runeSlug]
  ) {
    const pruned = systemPrunePropertyRunes([runeSlug], targetItem);
    if (Array.isArray(pruned) && !pruned.includes(runeSlug)) {
      return false;
    }
  }

  return true;
};

const buildRuneTargetOptions = (actor, rune) => {
  const actorItems = actor?.items ?? [];
  return actorItems.filter((item) => isRuneCompatible(rune, item));
};

const getRuneCategory = (runeItem) => {
  const runeTraits = getRuneTraits(runeItem);
  const runeType =
    runeItem?.system?.runes?.type ??
    runeItem?.system?.runes?.category ??
    runeItem?.system?.runes?.value ??
    runeItem?.system?.runeType ??
    "";
  const normalizedType = runeType.toString().toLowerCase();

  if (normalizedType === "property" || runeTraits.includes("property")) {
    return "property";
  }

  const fundamentalData = getFundamentalRuneData(runeItem);
  if (Object.keys(fundamentalData).length) {
    return "fundamental";
  }

  return "property";
};

const sluggifyRuneName = (runeItem) => {
  const sluggifyFn =
    globalThis.sluggify ??
    globalThis.game?.pf2e?.sluggify ??
    globalThis.game?.pf2e?.system?.sluggify;
  const name = runeItem?.name ?? runeItem?.system?.slug ?? runeItem?.slug ?? "";

  if (typeof sluggifyFn === "function") {
    return sluggifyFn(name);
  }

  return name.toString().toLowerCase().replace(/\s+/g, "-");
};

const normalizeRuneText = (value) =>
  value
    .toString()
    .toLowerCase()
    .replace(/[()+＋]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const getRuneDisplayName = (runeItem) =>
  (runeItem?.name ?? runeItem?.system?.slug ?? runeItem?.slug ?? "").toString();

const extractRuneBonus = (runeItem) => {
  const runeData = runeItem?.system?.runes ?? {};
  if (Number.isInteger(runeData?.potency)) {
    return runeData.potency;
  }

  const name = getRuneDisplayName(runeItem);
  const explicitBonusMatch = name.match(/[+＋]\s*(\d+)/);
  if (explicitBonusMatch) {
    return Number(explicitBonusMatch[1]);
  }

  return null;
};

const getFundamentalTierFromKey = (targetKey, tierKey) => {
  if (tierKey == null) {
    return null;
  }

  const normalizedKey = tierKey.toString().trim();
  const numericKey = Number(normalizedKey);
  if (!Number.isNaN(numericKey)) {
    const tierLookup = {
      striking: {
        1: "striking",
        2: "greaterStriking",
        3: "majorStriking",
      },
      resilient: {
        1: "resilient",
        2: "greaterResilient",
        3: "majorResilient",
      },
      reinforcing: {
        1: "reinforcing",
        2: "greaterReinforcing",
        3: "majorReinforcing",
      },
    };
    if (targetKey === "potency") {
      return numericKey;
    }
    return tierLookup[targetKey]?.[numericKey] ?? null;
  }

  return normalizedKey;
};

const findFundamentalMatch = (data, runeSlug) => {
  if (!data || !runeSlug) {
    return null;
  }

  if (typeof data === "string") {
    return data === runeSlug ? { match: true } : null;
  }

  if (Array.isArray(data)) {
    return data.includes(runeSlug) ? { match: true } : null;
  }

  if (typeof data === "object") {
    if (data.slug && data.slug === runeSlug) {
      return { match: true };
    }
    for (const [key, entry] of Object.entries(data)) {
      if (entry == null) {
        continue;
      }
      if (typeof entry === "string" && entry === runeSlug) {
        return { match: true, tierKey: key };
      }
      if (Array.isArray(entry) && entry.includes(runeSlug)) {
        return { match: true, tierKey: key };
      }
      if (typeof entry === "object") {
        if (entry.slug && entry.slug === runeSlug) {
          return { match: true, tierKey: key };
        }
        if (Array.isArray(entry?.runes) && entry.runes.includes(runeSlug)) {
          return { match: true, tierKey: key };
        }
      }
    }
  }

  return null;
};

const getSystemFundamentalRuneData = (runeSlug) => {
  const systemRuneData = globalThis.RUNE_DATA ?? globalThis.game?.pf2e?.runes?.RUNE_DATA;
  if (!systemRuneData || !runeSlug) {
    return {};
  }

  const matches = {};
  const fundamentalTargets = [
    { category: "weapon", key: "potency", target: "potency" },
    { category: "weapon", key: "striking", target: "striking" },
    { category: "armor", key: "potency", target: "potency" },
    { category: "armor", key: "resilient", target: "resilient" },
    { category: "armor", key: "reinforcing", target: "reinforcing" },
    { category: "shield", key: "potency", target: "potency" },
    { category: "shield", key: "resilient", target: "resilient" },
    { category: "shield", key: "reinforcing", target: "reinforcing" },
  ];

  for (const { category, key, target } of fundamentalTargets) {
    const data =
      systemRuneData?.[category]?.fundamental?.[key] ?? systemRuneData?.[category]?.[key];
    if (!data) {
      continue;
    }

    const matchResult = findFundamentalMatch(data, runeSlug);
    if (matchResult?.match) {
      const tierValue = getFundamentalTierFromKey(target, matchResult.tierKey);
      matches[target] = tierValue ?? true;
    }
  }

  return matches;
};

const getFundamentalRuneData = (runeItem) => {
  const runeData = runeItem?.system?.runes ?? {};
  const runeName = getRuneDisplayName(runeItem);
  const runeSlug = sluggifyRuneName(runeItem);
  const normalizedName = normalizeRuneText(`${runeName} ${runeSlug}`);
  const systemFundamentalData = getSystemFundamentalRuneData(runeSlug);
  const data = {};

  const potencyBonus = runeData?.potency ?? extractRuneBonus(runeItem);
  if (systemFundamentalData.potency) {
    if (potencyBonus != null) {
      data.potency = potencyBonus;
    } else if (typeof systemFundamentalData.potency === "number") {
      data.potency = systemFundamentalData.potency;
    }
  } else if (potencyBonus != null && normalizedName.includes("potency")) {
    data.potency = potencyBonus;
  }

  if (systemFundamentalData.striking) {
    data.striking =
      runeData?.striking ??
      (typeof systemFundamentalData.striking === "string"
        ? systemFundamentalData.striking
        : null);
  } else if (runeData?.striking) {
    data.striking = runeData.striking;
  } else if (normalizedName.includes("major striking")) {
    data.striking = "majorStriking";
  } else if (normalizedName.includes("greater striking")) {
    data.striking = "greaterStriking";
  } else if (normalizedName.includes("striking")) {
    data.striking = "striking";
  }

  if (systemFundamentalData.resilient) {
    data.resilient =
      runeData?.resilient ??
      (typeof systemFundamentalData.resilient === "string"
        ? systemFundamentalData.resilient
        : null);
  } else if (runeData?.resilient) {
    data.resilient = runeData.resilient;
  } else if (normalizedName.includes("major resilient")) {
    data.resilient = "majorResilient";
  } else if (normalizedName.includes("greater resilient")) {
    data.resilient = "greaterResilient";
  } else if (normalizedName.includes("resilient")) {
    data.resilient = "resilient";
  }

  if (systemFundamentalData.reinforcing) {
    data.reinforcing =
      runeData?.reinforcing ??
      (typeof systemFundamentalData.reinforcing === "string"
        ? systemFundamentalData.reinforcing
        : null);
  } else if (runeData?.reinforcing) {
    data.reinforcing = runeData.reinforcing;
  } else if (normalizedName.includes("major reinforcing")) {
    data.reinforcing = "majorReinforcing";
  } else if (normalizedName.includes("greater reinforcing")) {
    data.reinforcing = "greaterReinforcing";
  } else if (normalizedName.includes("reinforcing")) {
    data.reinforcing = "reinforcing";
  }

  if (runeData?.potency != null && data.potency == null) {
    data.potency = runeData.potency;
  }

  return data;
};

const applyFundamentalRune = async (runeItem, targetItem) => {
  if (!runeItem || !targetItem) {
    return;
  }

  const updates = {};
  const runeData = getFundamentalRuneData(runeItem);

  if (targetItem.type === "weapon") {
    if (runeData?.potency != null) {
      updates["system.runes.potency"] = runeData.potency;
    }
    if (runeData?.striking != null) {
      updates["system.runes.striking"] = runeData.striking;
    }
  }

  if (targetItem.type === "armor") {
    if (runeData?.potency != null) {
      updates["system.runes.potency"] = runeData.potency;
    }
    if (runeData?.resilient != null) {
      updates["system.runes.resilient"] = runeData.resilient;
    }
    if (runeData?.reinforcing != null) {
      updates["system.runes.reinforcing"] = runeData.reinforcing;
    }
  }

  if (targetItem.type === "shield") {
    if (runeData?.potency != null) {
      updates["system.runes.potency"] = runeData.potency;
    }
    if (runeData?.resilient != null) {
      updates["system.runes.resilient"] = runeData.resilient;
    }
    if (runeData?.reinforcing != null) {
      updates["system.runes.reinforcing"] = runeData.reinforcing;
    }
  }

  if (Object.keys(updates).length) {
    await targetItem.update(updates);
    return;
  }

  ui.notifications?.warn?.(
    game.i18n?.localize?.("PF2E.RuneManager.UnableToMapFundamental") ??
      "Unable to map fundamental rune to target item."
  );
  console.warn(
    "[PF2E Rune Manager] Unable to map fundamental rune to target item.",
    runeItem,
    targetItem
  );
};

const applyPropertyRune = async (runeItem, targetItem) => {
  if (!runeItem || !targetItem) {
    return;
  }

  const systemRuneData = globalThis.RUNE_DATA ?? globalThis.game?.pf2e?.runes?.RUNE_DATA;
  const systemPrunePropertyRunes =
    globalThis.prunePropertyRunes ?? globalThis.game?.pf2e?.runes?.prunePropertyRunes;

  const runeSlug = sluggifyRuneName(runeItem);
  if (!systemRuneData || !systemPrunePropertyRunes || !runeSlug) {
    ui.notifications?.warn?.(
      game.i18n?.localize?.("PF2E.RuneManager.UnableToMapProperty") ??
        "Unable to map property rune to target item."
    );
    console.warn(
      "[PF2E Rune Manager] Unable to map property rune to target item.",
      runeItem,
      targetItem
    );
    return;
  }

  const propertyData =
    targetItem.type === "weapon"
      ? systemRuneData?.weapon?.property
      : systemRuneData?.armor?.property;

  if (!propertyData || !propertyData[runeSlug]) {
    ui.notifications?.warn?.(
      game.i18n?.localize?.("PF2E.RuneManager.UnableToMapProperty") ??
        "Unable to map property rune to target item."
    );
    console.warn(
      "[PF2E Rune Manager] Unable to map property rune to target item.",
      runeItem,
      targetItem
    );
    return;
  }

  const existing = targetItem?.system?.runes?.property ?? [];
  const pruned = systemPrunePropertyRunes([...existing, runeSlug], propertyData);
  await targetItem.update({ "system.runes.property": pruned });
};

Hooks.on("renderActorSheetPF2e", (app, html) => {
  const itemRows = html.find("li[data-item-id]");

  itemRows.each((_index, row) => {
    const itemId = row.dataset.itemId;
    const item = app.actor?.items?.get(itemId);
    const usage = item?.system?.usage?.value ?? "";
    const usageValue = usage.toString().toLowerCase();
    const itemType = item?.type ?? item?.system?.type ?? "";
    const rawItemTraits = item?.system?.traits;
    const itemTraitList = Array.isArray(rawItemTraits)
      ? rawItemTraits
      : Array.isArray(rawItemTraits?.value)
        ? rawItemTraits.value
        : [];
    const itemTraits = itemTraitList
      .filter(Boolean)
      .map((trait) => trait.toString().toLowerCase());
    const isRune =
      usageValue.startsWith("etched-onto") ||
      (!usageValue &&
        (itemType === "rune" ||
          itemTraits.includes("rune") ||
          itemTraits.includes("property") ||
          itemTraits.includes("fundamental")));
    if (!isRune) {
      return;
    }

    const controls = $(row).find(".item-controls");
    if (!controls.length || controls.find(".attach-runes").length) {
      return;
    }

    const attachRunesControl = $(
      '<a class="attach-runes" data-action="attach-runes" data-tooltip="PF2E.RuneManager.AttachRunes">'
    ).append('<i class="fa-solid fa-sparkles fa-fw"></i>');

    controls.append(attachRunesControl);
  });

  html
    .off("click", "a[data-action='attach-runes']")
    .on("click", "a[data-action='attach-runes']", (event) => {
      const itemId = event.currentTarget.closest("li[data-item-id]")?.dataset.itemId;
      const actor = app.actor;
      const runeItem = actor?.items?.get(itemId);
      const usage = runeItem?.system?.usage?.value ?? "";
      const usageValue = usage.toString().toLowerCase();
      const runeType = runeItem?.type ?? runeItem?.system?.type ?? "";
      const rawRuneTraits = runeItem?.system?.traits;
      const runeTraitList = Array.isArray(rawRuneTraits)
        ? rawRuneTraits
        : Array.isArray(rawRuneTraits?.value)
          ? rawRuneTraits.value
          : [];
      const runeTraits = runeTraitList
        .filter(Boolean)
        .map((trait) => trait.toString().toLowerCase());
      const isRune =
        usageValue.startsWith("etched-onto") ||
        (!usageValue &&
          (runeType === "rune" ||
            runeTraits.includes("rune") ||
            runeTraits.includes("property") ||
            runeTraits.includes("fundamental")));
      if (!runeItem || !isRune) {
        return;
      }

      const options = buildRuneTargetOptions(actor, runeItem);
      if (!options.length) {
        ui.notifications?.warn(
          game.i18n?.localize?.("PF2E.RuneManager.NoValidTargets") ?? "No valid rune targets found."
        );
        return;
      }
      const dialogContent = `
        <form>
          <div class="form-group">
            <label>${game.i18n?.localize?.("PF2E.RuneManager.SelectTarget") ?? "Select target"}</label>
            <select name="rune-target">
              ${options
                .map((item) => `<option value="${item.id}">${item.name}</option>`)
                .join("")}
            </select>
          </div>
        </form>
      `;

      new Dialog({
        title: game.i18n?.localize?.("PF2E.RuneManager.AttachRunes") ?? "Attach Rune",
        content: dialogContent,
        buttons: {
          confirm: {
            label: game.i18n?.localize?.("PF2E.RuneManager.Confirm") ?? "Confirm",
            callback: (dialogHtml) => {
              const targetId = dialogHtml.find("select[name='rune-target']").val();
              if (!targetId) {
                return;
              }
              if (typeof actor?.openRuneAttachDialog === "function") {
                actor.openRuneAttachDialog(itemId, targetId);
                return;
              }
              Hooks.callAll("pf2eRuneManagerAttachRune", {
                actor,
                runeId: itemId,
                targetId,
              });
            },
          },
          cancel: {
            label: game.i18n?.localize?.("PF2E.Cancel") ?? "Cancel",
          },
        },
        default: "confirm",
      }).render(true);
    });
});

Hooks.on("pf2eRuneManagerAttachRune", async ({ actor, runeId, targetId }) => {
  const runeItem = actor?.items?.get(runeId);
  const targetItem = actor?.items?.get(targetId);
  if (!runeItem || !targetItem || !isRuneCompatible(runeItem, targetItem)) {
    return;
  }

  const runeCategory = getRuneCategory(runeItem);
  if (runeCategory === "property") {
    await applyPropertyRune(runeItem, targetItem);
    return;
  }

  await applyFundamentalRune(runeItem, targetItem);
});
