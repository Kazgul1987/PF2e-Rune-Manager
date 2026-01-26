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
};
