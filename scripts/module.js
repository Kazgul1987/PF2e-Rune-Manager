const parseRuneTargets = (rune) => {
  const runeSystem = rune?.system ?? {};
  const runeTraits = runeSystem?.traits?.value ?? runeSystem?.traits ?? [];
  const runeUsage = runeSystem?.usage?.value ?? runeSystem?.usage ?? "";
  const runeCategory =
    runeSystem?.runes?.type ??
    runeSystem?.runes?.category ??
    runeSystem?.runes?.value ??
    runeSystem?.runeType ??
    "";
  const targetSources = [runeUsage, runeCategory, ...(Array.isArray(runeTraits) ? runeTraits : [])]
    .filter(Boolean)
    .map((entry) => entry.toString().toLowerCase());
  const targets = new Set();

  if (targetSources.some((entry) => entry.includes("weapon"))) {
    targets.add("weapon");
  }
  if (targetSources.some((entry) => entry.includes("armor"))) {
    targets.add("armor");
  }
  if (targetSources.some((entry) => entry.includes("shield"))) {
    targets.add("shield");
  }

  return targets;
};

const buildRuneTargetOptions = (actor, rune) => {
  const allowedTargets = parseRuneTargets(rune);
  const hasTargetFilter = allowedTargets.size > 0;
  const actorItems = actor?.items ?? [];
  return actorItems.filter((item) => {
    if (!item) {
      return false;
    }
    if (hasTargetFilter && !allowedTargets.has(item.type)) {
      return false;
    }
    const hasRuneSlots = !!item.system?.runes;
    if (!hasTargetFilter && !hasRuneSlots) {
      return false;
    }
    return ["weapon", "armor", "shield"].includes(item.type);
  });
};

Hooks.on("renderActorSheetPF2e", (app, html) => {
  const itemRows = html.find("li[data-item-id]");

  itemRows.each((_index, row) => {
    const itemId = row.dataset.itemId;
    const item = app.actor?.items?.get(itemId);
    const isRune = item?.type === "rune" || item?.system?.type === "rune";
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
      const isRune = runeItem?.type === "rune" || runeItem?.system?.type === "rune";
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
