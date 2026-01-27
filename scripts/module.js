const MODULE_ID = "pf2e-rune-manager";
const ATTACH_RUNES_SELECTOR = "a[data-action='attach-runes']";
const CLICK_NAMESPACE = ".pf2eRuneManager";

const DBG = (...args) => console.log("[RuneManager DBG]", ...args);

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

  // Property slots prüfen
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

const getFundamentalRuneData = (runeItem) => {
  const name = (runeItem?.name ?? "").toString().toLowerCase();
  const data = {};

  const potencyMatch = name.match(/[+＋]\s*(\d+)/);
  if (potencyMatch) data.potency = Number(potencyMatch[1]);

  if (name.includes("mythic striking")) data.striking = "mythicStriking";
  else if (name.includes("major striking")) data.striking = "majorStriking";
  else if (name.includes("greater striking")) data.striking = "greaterStriking";
  else if (name.includes("striking")) data.striking = "striking";

  if (name.includes("mythic resilient")) data.resilient = "mythicResilient";
  else if (name.includes("major resilient")) data.resilient = "majorResilient";
  else if (name.includes("greater resilient")) data.resilient = "greaterResilient";
  else if (name.includes("resilient")) data.resilient = "resilient";

  if (name.includes("major reinforcing")) data.reinforcing = "majorReinforcing";
  else if (name.includes("greater reinforcing")) data.reinforcing = "greaterReinforcing";
  else if (name.includes("reinforcing")) data.reinforcing = "reinforcing";

  return data;
};

const getRuneCategory = (runeItem) => {
  const slug = sluggifyRuneName(runeItem);
  const systemRuneData = globalThis.RUNE_DATA ?? globalThis.game?.pf2e?.runes?.RUNE_DATA;

  DBG("getRuneCategory", { slug, hasRuneData: !!systemRuneData });

  if (
    slug &&
    systemRuneData &&
    ((systemRuneData.weapon?.property && slug in systemRuneData.weapon.property) ||
      (systemRuneData.armor?.property && slug in systemRuneData.armor.property))
  ) {
    return "property";
  }

  if (slug && !systemRuneData && FALLBACK_WEAPON_PROPERTY_RUNE_SLUGS.has(slug)) {
    return "weapon";
  }

  const fundamental = getFundamentalRuneData(runeItem);
  if (Object.keys(fundamental).length) return "fundamental";

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
    if (runeData.reinforcing != null) updates["system.runes.reinforcing"] = runeData.reinforcing;
  }

  if (Object.keys(updates).length) {
    await targetItem.update(updates);
    return true;
  }
  return false;
};

const applyPropertyRune = async (runeItem, targetItem) => {
  const systemRuneData = globalThis.RUNE_DATA ?? globalThis.game?.pf2e?.runes?.RUNE_DATA;
  const systemPrunePropertyRunes =
    globalThis.prunePropertyRunes ?? globalThis.game?.pf2e?.runes?.prunePropertyRunes;

  const runeSlug = sluggifyRuneName(runeItem);
  DBG("applyPropertyRune", { rune: runeItem?.name, runeSlug });

  const existing = targetItem?.system?.runes?.property ?? [];
  const maxSlots = getPropertyRuneSlots(targetItem);
  if (!maxSlots || existing.length >= maxSlots) {
    ui.notifications?.warn?.("No available property rune slots.");
    return false;
  }

  if (!systemRuneData || !systemPrunePropertyRunes) {
    if (targetItem.type === "weapon" && FALLBACK_WEAPON_PROPERTY_RUNE_SLUGS.has(runeSlug)) {
      const updated = Array.from(new Set([...existing, runeSlug]));
      await targetItem.update({ "system.runes.property": updated });
      return true;
    }
    ui.notifications?.warn?.("PF2e rune data unavailable.");
    return false;
  }

  if (targetItem.type === "weapon") {
    const weaponPropertyData = systemRuneData.weapon?.property;
    if (!weaponPropertyData || !(runeSlug in weaponPropertyData)) {
      ui.notifications?.warn?.("This is not a weapon property rune.");
      return false;
    }
    const updated = systemPrunePropertyRunes([...existing, runeSlug], weaponPropertyData);
    await targetItem.update({ "system.runes.property": updated });
    return true;
  }

  if (targetItem.type === "armor") {
    const armorPropertyData = systemRuneData.armor?.property;
    if (!armorPropertyData || !(runeSlug in armorPropertyData)) {
      ui.notifications?.warn?.("This is not an armor property rune.");
      return false;
    }
    const updated = systemPrunePropertyRunes([...existing, runeSlug], armorPropertyData);
    await targetItem.update({ "system.runes.property": updated });
    return true;
  }

  ui.notifications?.warn?.("Property runes on shields are not supported.");
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
  const isRune = usageValue.startsWith("etched-onto") || traits.includes("property") || traits.includes("fundamental");

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
          ${options.map((item) => `<option value="${item.id}">${item.name}</option>`).join("")}
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
          const consumeRune = dialogHtml.find("input[name='consume-rune']").prop("checked");
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
    const isRune = usageValue.startsWith("etched-onto") || traits.includes("property") || traits.includes("fundamental");
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
});
