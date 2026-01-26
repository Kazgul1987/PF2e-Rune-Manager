type RuneManagerItem = {
  id: string;
  name: string;
  type: string;
  system?: Record<string, unknown>;
  update?: (data: Record<string, unknown>) => Promise<unknown>;
};

type RuneManagerActor = {
  items: {
    get: (id: string) => RuneManagerItem | undefined;
    filter: (predicate: (item: RuneManagerItem) => boolean) => RuneManagerItem[];
  };
  sheet?: {
    render: (force?: boolean) => void;
  };
};

export class CharacterActor {
  constructor(private readonly actor: RuneManagerActor) {}

  async openRuneAttachDialog(itemId: string): Promise<void> {
    const runeItem = this.actor.items.get(itemId);
    if (!runeItem) {
      ui.notifications?.warn("Die Rune konnte nicht gefunden werden.");
      return;
    }

    const eligibleTargets = this.getEligibleRuneTargets(runeItem);
    if (eligibleTargets.length === 0) {
      ui.notifications?.warn("Es gibt keine passenden Ziele für diese Rune.");
      return;
    }

    const content = this.renderRuneTargetDialog(eligibleTargets);
    const dialog = new Dialog({
      title: "Rune anbringen",
      content,
      buttons: {
        confirm: {
          label: "Anbringen",
          callback: async (html) => {
            const selectedId = (html as JQuery)
              .find('input[name="rune-target"]:checked')
              .val() as string | undefined;
            if (!selectedId) {
              ui.notifications?.warn("Bitte wähle ein Ziel-Item aus.");
              return;
            }

            const targetItem = this.actor.items.get(selectedId);
            if (!targetItem) {
              ui.notifications?.warn("Das Ziel-Item konnte nicht gefunden werden.");
              return;
            }

            const success = await this.attachRuneToItem(runeItem, targetItem);
            if (success) {
              this.actor.sheet?.render(true);
            }
          },
        },
        cancel: {
          label: "Abbrechen",
        },
      },
      default: "confirm",
    });

    dialog.render(true);
  }

  private getEligibleRuneTargets(runeItem: RuneManagerItem): RuneManagerItem[] {
    const runeCategory = this.getRuneCategory(runeItem);
    return this.actor.items.filter((item) => {
      if (!this.isEquipmentItem(item)) {
        return false;
      }

      if (runeCategory && !this.isRuneCompatibleWithTarget(runeCategory, item)) {
        return false;
      }

      return this.hasAvailableRuneSlot(item);
    });
  }

  private renderRuneTargetDialog(items: RuneManagerItem[]): string {
    const options = items
      .map(
        (item) =>
          `<label class="radio"><input type="radio" name="rune-target" value="${item.id}"> ${item.name}</label>`
      )
      .join("<br>");

    return `<form><div class="form-group">${options}</div></form>`;
  }

  private async attachRuneToItem(
    runeItem: RuneManagerItem,
    targetItem: RuneManagerItem
  ): Promise<boolean> {
    if (!this.isEquipmentItem(targetItem)) {
      ui.notifications?.error("Runen können nur an Waffen oder Rüstungen angebracht werden.");
      return false;
    }

    const runeCategory = this.getRuneCategory(runeItem);
    if (runeCategory && !this.isRuneCompatibleWithTarget(runeCategory, targetItem)) {
      ui.notifications?.error("Diese Rune ist mit dem Ziel-Item nicht kompatibel.");
      return false;
    }

    if (!this.hasAvailableRuneSlot(targetItem)) {
      ui.notifications?.error("Das Ziel-Item hat keinen freien Runenslot.");
      return false;
    }

    if (!targetItem.update) {
      ui.notifications?.error("Das Ziel-Item kann nicht aktualisiert werden.");
      return false;
    }

    const currentRunes = this.getAttachedRunes(targetItem);
    const updatedRunes = [...currentRunes, runeItem.id];

    await targetItem.update({ "system.runes.items": updatedRunes });
    ui.notifications?.info(`Rune ${runeItem.name} wurde an ${targetItem.name} angebracht.`);
    return true;
  }

  private getAttachedRunes(targetItem: RuneManagerItem): string[] {
    const runes = (targetItem.system as { runes?: { items?: string[] } })?.runes
      ?.items;
    if (!Array.isArray(runes)) {
      return [];
    }
    return runes;
  }

  private hasAvailableRuneSlot(item: RuneManagerItem): boolean {
    const runesData = (item.system as { runes?: { slots?: { available?: number } } })?.runes;
    const available = runesData?.slots?.available;
    if (typeof available === "number") {
      return available > 0;
    }

    return true;
  }

  private getRuneCategory(runeItem: RuneManagerItem): string | null {
    const systemData = runeItem.system as {
      runeType?: string;
      category?: string;
    };

    return systemData?.runeType ?? systemData?.category ?? null;
  }

  private isEquipmentItem(item: RuneManagerItem): boolean {
    return item.type === "weapon" || item.type === "armor";
  }

  private isRuneCompatibleWithTarget(runeCategory: string, targetItem: RuneManagerItem): boolean {
    if (runeCategory === "weapon") {
      return targetItem.type === "weapon";
    }

    if (runeCategory === "armor") {
      return targetItem.type === "armor";
    }

    return true;
  }
}
