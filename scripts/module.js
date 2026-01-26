Hooks.once("init", () => {
  console.log("PF2E Rune Manager | Initializing module");
});

Hooks.on("renderActorSheetPF2e", (app, html) => {
  html.addClass("pf2e-rune-manager");

  const label = game.i18n.localize("PF2E.RuneManager.AttachRunes");
  const button = document.createElement("button");
  button.type = "button";
  button.classList.add("pf2e-rune-manager__button");
  button.textContent = label;
  button.addEventListener("click", () => {
    ui.notifications?.info(label);
  });

  html.find(".sheet-header").first().append(button);
});
