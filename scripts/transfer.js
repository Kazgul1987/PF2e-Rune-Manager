// scripts/transfer.js

// Gleiche Modul-ID wie in module.js
const MODULE_ID = "pf2e-rune-manager";

// Nur für dieses File eigene Namespaces/Selector
const TRANSFER_RUNES_SELECTOR = "a[data-action='transfer-runes']";
const CLICK_NAMESPACE_TRANSFER = ".pf2eRuneManagerTransfer";

const DBG_TRANSFER = (...args) => console.log("[RuneManager Transfer DBG]", ...args);

/** Hilfsfunktion: prüft Item-Typ (kompatibel mit PF2e isOfType) */
const isItemTypeTransfer = (item, type) =>
  typeof item?.isOfType === "function" ? item.isOfType(type) : item?.type === type;

/** Property-Rune-Slots eines Ziel-Items bestimmen */
const getPropertyRuneSlotsTransfer = (targetItem) => {
  const systemSlotsFn =
    globalThis.getPropertyRuneSlots ??
    globalThis.game?.pf2e?.runes?.getPropertyRuneSlots ??
    globalThis.game?.pf2e?.item?.getPropertyRuneSlots ??
    globalThis.game?.pf2e?.Item?.getPropertyRuneSlots;

  if (typeof systemSlotsFn === "function") {
    return systemSlotsFn(targetItem);
  }

  // Fallback: Anzahl Slots = Potency
  const potency = Number(targetItem?.system?.runes?.potency ?? 0);
  return Math.max(0, potency);
};

/**
 * Alle möglichen Ziel-Items für eine Runen-Übertragung ermitteln.
 * Aktuell: gleicher Typ (weapon/armor/shield), nicht das Source-Item selbst.
 */
const buildRuneTransferTargets = (actor, sourceItem) => {
  if (!actor || !sourceItem) return [];
  return actor.items.filter(
    (item) =>
      item.id !== sourceItem.id &&
      ["weapon", "armor", "shield"].includes(item.type) &&
      item.type === sourceItem.type
  );
};

/**
 * Kernlogik: Runen von source -> target übertragen.
 * options:
 *  - potency: boolean
 *  - fundamental: boolean
 *  - property: boolean
 *  - removeFromSource: boolean
 */
const transferRunes = async ({ actor, source, target, options }) => {
  if (!source || !target) return;

  const sourceRunes = foundry.utils.duplicate(source.system?.runes ?? {});
  const targetRunes = foundry.utils.duplicate(target.system?.runes ?? {});

  const updatesSource = {};
  const updatesTarget = {};

  DBG_TRANSFER("transferRunes start", {
    source: source.name,
    target: target.name,
    options,
    sourceRunes,
    targetRunes,
  });

  const isWeapon = isItemTypeTransfer(source, "weapon");
  const isArmor = isItemTypeTransfer(source, "armor");
  const isShield = isItemTypeTransfer(source, "shield");

  // 1) Potency
  if (options.potency) {
    const srcPotency = Number(sourceRunes.potency ?? 0);
    if (srcPotency > 0) {
      updatesTarget["system.runes.potency"] = srcPotency;
      if (options.removeFromSource) {
        updatesSource["system.runes.potency"] = 0;
      }
    }
  }

  // 2) Fundamental-Runen (Striking / Resilient / Reinforcing)
  if (options.fundamental) {
    if (isWeapon) {
      const srcStriking = Number(sourceRunes.striking ?? 0);
      if (srcStriking > 0) {
        updatesTarget["system.runes.striking"] = srcStriking;
        if (options.removeFromSource) {
          updatesSource["system.runes.striking"] = 0;
        }
      }
    }
    if (isArmor) {
      const srcResilient = Number(sourceRunes.resilient ?? 0);
      if (srcResilient > 0) {
        updatesTarget["system.runes.resilient"] = srcResilient;
        if (options.removeFromSource) {
          updatesSource["system.runes.resilient"] = 0;
        }
      }
    }
    if (isShield) {
      const srcReinforcing = Number(sourceRunes.reinforcing ?? 0);
      if (srcReinforcing > 0) {
        updatesTarget["system.runes.reinforcing"] = srcReinforcing;
        if (options.removeFromSource) {
          updatesSource["system.runes.reinforcing"] = 0;
        }
      }
    }
  }

  // 3) Property-Runen
  if (options.property) {
    const srcProps = Array.isArray(sourceRunes.property) ? sourceRunes.property : [];
    const tgtProps = Array.isArray(targetRunes.property) ? targetRunes.property : [];

    if (srcProps.length) {
      const maxSlots = getPropertyRuneSlotsTransfer(target);
      if (!maxSlots || maxSlots <= 0) {
        ui.notifications?.warn?.("Target item has no property rune slots.");
      } else {
        const systemRuneData =
          globalThis.RUNE_DATA ?? globalThis.game?.pf2e?.runes?.RUNE_DATA;
        const prunePropertyRunes =
          globalThis.prunePropertyRunes ??
          globalThis.game?.pf2e?.runes?.prunePropertyRunes;

        let merged = [...tgtProps, ...srcProps];

        if (systemRuneData && typeof prunePropertyRunes === "function") {
          const propertyData =
            isWeapon && systemRuneData.weapon?.property
              ? systemRuneData.weapon.property
              : isArmor && systemRuneData.armor?.property
              ? systemRuneData.armor.property
              : null;

          if (propertyData) {
            merged = prunePropertyRunes(merged, propertyData);
          }
        }

        // Duplikate raus und auf Slotzahl begrenzen
        merged = Array.from(new Set(merged)).slice(0, maxSlots);
        updatesTarget["system.runes.property"] = merged;

        if (options.removeFromSource) {
          updatesSource["system.runes.property"] = [];
        }
      }
    }
  }

  DBG_TRANSFER("transferRunes updates", { updatesSource, updatesTarget });

  const updatePromises = [];
  if (Object.keys(updatesTarget).length) updatePromises.push(target.update(updatesTarget));
  if (Object.keys(updatesSource).length) updatePromises.push(source.update(updatesSource));

  if (updatePromises.length) {
    await Promise.all(updatePromises);
    ui.notifications?.info?.("Runes transferred.");
  } else {
    ui.notifications?.info?.("No runes to transfer.");
  }
};

/** Klickhandler für das neue Icon in der Inventarliste */
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

  const dialogContent = `
    <form>
      <div class="form-group">
        <label>Target item</label>
        <select name="target">
          ${targets.map((i) => `<option value="${i.id}">${i.name}</option>`).join("")}
        </select>
      </div>
      <div class="form-group">
        <label>
          <input type="checkbox" name="potency" checked />
          Transfer Potency
        </label>
      </div>
      <div class="form-group">
        <label>
          <input type="checkbox" name="fundamental" checked />
          Transfer Striking / Resilient / Reinforcing
        </label>
      </div>
      <div class="form-group">
        <label>
          <input type="checkbox" name="property" checked />
          Transfer Property Runes
        </label>
      </div>
      <div class="form-group">
        <label>
          <input type="checkbox" name="remove" checked />
          Remove runes from source
        </label>
      </div>
    </form>
  `;

  new Dialog({
    title: "Transfer Runes",
    content: dialogContent,
    buttons: {
      confirm: {
        label: "Confirm",
        callback: (html) => {
          const targetId = html.find("select[name='target']").val();
          const potency = html.find("input[name='potency']").prop("checked");
          const fundamental = html.find("input[name='fundamental']").prop("checked");
          const property = html.find("input[name='property']").prop("checked");
          const remove = html.find("input[name='remove']").prop("checked");

          if (!targetId) return;

          Hooks.callAll("pf2eRuneManagerTransferRunes", {
            actor,
            sourceId,
            targetId,
            options: {
              potency,
              fundamental,
              property,
              removeFromSource: remove,
            },
          });
        },
      },
      cancel: { label: "Cancel" },
    },
    default: "confirm",
  }).render(true);
};

/** Icon in der Actor-Sheet-Inventarliste einbauen */
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

// Hook registrieren (separat von deinem bestehenden renderActorSheetPF2e in module.js)
Hooks.on("renderActorSheetPF2e", renderActorSheetTransferHook);

// Click-Handler ans Dokument hängen
Hooks.once("ready", () => {
  $(document)
    .off(`click${CLICK_NAMESPACE_TRANSFER}`, TRANSFER_RUNES_SELECTOR)
    .on(`click${CLICK_NAMESPACE_TRANSFER}`, TRANSFER_RUNES_SELECTOR, handleTransferRunesClick);
});

// Eigener Hook für die eigentliche Übertragung
Hooks.on("pf2eRuneManagerTransferRunes", async ({ actor, sourceId, targetId, options }) => {
  const source = actor?.items?.get(sourceId);
  const target = actor?.items?.get(targetId);
  DBG_TRANSFER("pf2eRuneManagerTransferRunes", {
    source: source?.name,
    target: target?.name,
    options,
  });
  if (!source || !target) return;
  await transferRunes({ actor, source, target, options });
});
