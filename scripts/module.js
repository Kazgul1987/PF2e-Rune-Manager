Hooks.on("renderActorSheetPF2e", (app, html) => {
  const itemRows = html.find("li[data-item-id]");

  itemRows.each((_index, row) => {
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

      // TODO: Open rune dialog or trigger automation for the selected item.
      console.info("Attach runes clicked", { actor, itemId });
    });
});
