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

  if (runeUsage.startsWith(RUNE_USAGE.etchedOntoHeavyArmor) && targetCategory !== "heavy-armor") {
    return false;
  }
  if (runeUsage.startsWith(RUNE_USAGE.etchedOntoMediumArmor) && targetCategory !== "medium-armor") {
    return false;
  }
  if (runeUsage.startsWith(RUNE_USAGE.etchedOntoLightArmor) && targetCategory !== "light-armor") {
    return false;
  }
  if (runeUsage.startsWith(RUNE_USAGE.etchedOntoArmor) && targetItem.type !== "armor") {
    return false;
  }
  if (runeUsage.startsWith(RUNE_USAGE.etchedOntoWeapon) && targetItem.type !== "weapon") {
    return false;
  }
  if (runeUsage.startsWith(RUNE_USAGE.etchedOntoShield) && targetItem.type !== "shield") {
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

  return "fundamental";
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

const applyFundamentalRune = async (runeItem, targetItem) => {
  if (!runeItem || !targetItem) {
    return;
  }

  const updates = {};
  const runeData = runeItem?.system?.runes ?? {};

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
  }

  if (targetItem.type === "shield") {
    if (runeData?.reinforcing != null) {
      updates["system.runes.reinforcing"] = runeData.reinforcing;
    }
  }

  if (Object.keys(updates).length) {
    await targetItem.update(updates);
  }
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
    return;
  }

  const propertyData =
    targetItem.type === "weapon"
      ? systemRuneData?.weapon?.property
      : systemRuneData?.armor?.property;

  if (!propertyData || !propertyData[runeSlug]) {
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
