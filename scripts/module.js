// --- Helpers: Property-Runes sicher über CONFIG.PF2E erkennen ---
const getPropertyRuneSources = () => {
  const cfgWeapon = CONFIG?.PF2E?.weaponPropertyRunes ?? {};
  const cfgArmor = CONFIG?.PF2E?.armorPropertyRunes ?? {};
  const runeDataWeapon =
    globalThis.RUNE_DATA?.weapon?.property ??
    globalThis.game?.pf2e?.runes?.RUNE_DATA?.weapon?.property ??
    {};
  const runeDataArmor =
    globalThis.RUNE_DATA?.armor?.property ??
    globalThis.game?.pf2e?.runes?.RUNE_DATA?.armor?.property ??
    {};
  return {
    weapon: Object.keys(runeDataWeapon).length ? runeDataWeapon : cfgWeapon,
    armor: Object.keys(runeDataArmor).length ? runeDataArmor : cfgArmor,
  };
};

// --- FIX 1: getRuneCategory (Property-Runen auch ohne RUNE_DATA erkennen) ---
const getRuneCategory = (runeItem) => {
  const slug = sluggifyRuneName(runeItem);
  const { weapon, armor } = getPropertyRuneSources();

  if (slug && (slug in weapon || slug in armor)) {
    return "property";
  }

  const fundamental = getFundamentalRuneData(runeItem);
  if (Object.keys(fundamental).length) {
    return "fundamental";
  }

  return null;
};

// --- FIX 1: applyPropertyRune (Fallback auf CONFIG.PF2E.*PropertyRunes) ---
const applyPropertyRune = async (runeItem, targetItem) => {
  const systemPrunePropertyRunes =
    globalThis.prunePropertyRunes ?? globalThis.game?.pf2e?.runes?.prunePropertyRunes;

  const runeSlug = sluggifyRuneName(runeItem);
  const { weapon, armor } = getPropertyRuneSources();

  if (!systemPrunePropertyRunes) {
    ui.notifications?.warn?.("PF2e prunePropertyRunes unavailable.");
    return false;
  }

  if (!runeSlug) {
    ui.notifications?.warn?.("Unable to map property rune: missing slug.");
    return false;
  }

  const existing = targetItem?.system?.runes?.property ?? [];
  const maxSlots = getPropertyRuneSlots(targetItem);
  if (!maxSlots || existing.length >= maxSlots) {
    ui.notifications?.warn?.("No available property rune slots.");
    return false;
  }

  if (targetItem.type === "weapon") {
    if (!(runeSlug in weapon)) {
      ui.notifications?.warn?.("This is not a weapon property rune.");
      return false;
    }
    const updated = systemPrunePropertyRunes([...existing, runeSlug], weapon);
    await targetItem.update({ "system.runes.property": updated });
    return true;
  }

  if (targetItem.type === "armor") {
    if (!(runeSlug in armor)) {
      ui.notifications?.warn?.("This is not an armor property rune.");
      return false;
    }
    const updated = systemPrunePropertyRunes([...existing, runeSlug], armor);
    await targetItem.update({ "system.runes.property": updated });
    return true;
  }

  ui.notifications?.warn?.("Property runes on shields are not supported.");
  return false;
};

// --- FIX 2: applyFundamentalRune (specific / ABP blocken) ---
const applyFundamentalRune = async (runeItem, targetItem) => {
  if (targetItem?.isSpecific) {
    ui.notifications?.warn?.("Cannot apply runes to specific magic items.");
    return false;
  }

  // ABP check (if enabled, fundamental runes are ignored)
  const abpEnabled =
    game?.settings?.get?.("pf2e", "automaticBonusProgression") ??
    game?.pf2e?.settings?.automaticBonusProgression ??
    false;

  if (abpEnabled) {
    ui.notifications?.warn?.("ABP is enabled; fundamental runes are ignored.");
    return false;
  }

  const runeData = getFundamentalRuneData(runeItem);
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
    if (runeData.reinforcing != null) updates["system.runes.reinforcing"] = runeData.reinforcing;
  }

  if (Object.keys(updates).length) {
    await targetItem.update(updates);
    return true;
  }

  ui.notifications?.warn?.("Unable to map fundamental rune.");
  return false;
};

const openRuneAttachDialog = (actor, runeItem) => {
  if (!actor || !runeItem) return;

  const title = game.i18n.format("PF2E.RuneManager.AttachRunesDialogTitle", {
    item: runeItem.name ?? game.i18n.localize("PF2E.RuneManager.AttachRunes"),
  });
  const content = `<p>${game.i18n.localize("PF2E.RuneManager.AttachRunesDialogBody")}</p>`;

  new Dialog({
    title,
    content,
    buttons: {
      close: {
        icon: '<i class="fa-solid fa-check"></i>',
        label: game.i18n.localize("PF2E.Close"),
      },
    },
    default: "close",
  }).render(true);
};

// --- renderActorSheetHook: Icon für Runen anzeigen ---
const renderActorSheetHook = (app, html) => {
  const itemRows = html.find("li[data-item-id]");

  itemRows.each((_index, row) => {
    const itemId = row.dataset.itemId;
    const item = app.actor?.items?.get(itemId);

    const usage = item?.system?.usage?.value ?? "";
    const usageValue = usage.toString().toLowerCase();

    // ✅ Runen zuverlässig über usage erkennen
    const isRune = usageValue.startsWith("etched-onto");
    if (!isRune) return;

    const controls = $(row).find(".item-controls");
    if (!controls.length || controls.find(".attach-runes").length) return;

    const attachRunesControl = $(
      '<a class="attach-runes" data-action="attach-runes" data-tooltip="PF2E.RuneManager.AttachRunes"></a>'
    ).append('<i class="fa-solid fa-sparkles fa-fw"></i>');

    controls.append(attachRunesControl);
  });

  html
    .off("click.pf2e-rune-manager", ".attach-runes")
    .on("click.pf2e-rune-manager", ".attach-runes", (event) => {
      event.preventDefault();

      const itemId = $(event.currentTarget).closest("li[data-item-id]").data("itemId");
      const runeItem = app.actor?.items?.get(itemId);

      if (!runeItem) {
        ui.notifications?.warn?.("Unable to locate rune item.");
        return;
      }

      openRuneAttachDialog(app.actor, runeItem);
    });
};

Hooks.once("init", () => {
  Hooks.on("renderActorSheetPF2e", renderActorSheetHook);
});
