export class CharacterSheet {
  activateClickListener(html: HTMLElement): void {
    html.addEventListener("click", (event) => {
      const itemId = htmlClosest(event.target, "[data-item-id]")?.dataset.itemId;
      if (!itemId) {
        return;
      }

      this.openRuneAttachDialogPlaceholder(itemId);
    });
  }

  private openRuneAttachDialogPlaceholder(itemId: string): void {
    void itemId;
    // TODO: Replace with this.actor.openRuneAttachDialog(itemId).
  }
}

function htmlClosest(
  target: EventTarget | null,
  selectors: string
): HTMLElement | null {
  if (!(target instanceof Element)) {
    return null;
  }

  return target.closest(selectors);
}
