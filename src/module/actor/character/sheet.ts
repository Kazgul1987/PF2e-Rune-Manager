import { CharacterActor } from "./actor";

export class CharacterSheet {
  constructor(private readonly actor: CharacterActor) {}

  activateClickListener(html: HTMLElement): void {
    html.addEventListener("click", (event) => {
      const itemId = htmlClosest(event.target, "[data-item-id]")?.dataset.itemId;
      if (!itemId) {
        return;
      }

      void this.actor.openRuneAttachDialog(itemId);
    });
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
