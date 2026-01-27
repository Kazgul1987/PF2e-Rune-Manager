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

    const propertyRuneSlug = this.getPropertyRuneSlug(runeItem.name);
    const fundamentalUpdate = this.getFundamentalRuneUpdate(runeItem.name);
    if (!propertyRuneSlug && !fundamentalUpdate) {
      ui.notifications?.error("Diese Rune wird aktuell nicht unterstützt.");
      return false;
    }

    const updateData: Record<string, unknown> = {};

    if (propertyRuneSlug) {
      const currentRunes = this.getAttachedPropertyRunes(targetItem);
      const updatedRunes = currentRunes.includes(propertyRuneSlug)
        ? currentRunes
        : [...currentRunes, propertyRuneSlug];
      updateData["system.runes.property"] = updatedRunes;
    }

    if (fundamentalUpdate) {
      if (typeof fundamentalUpdate.potency === "number") {
        updateData["system.runes.potency"] = fundamentalUpdate.potency;
      }
      if (fundamentalUpdate.striking) {
        updateData["system.runes.striking"] = fundamentalUpdate.striking;
      }
      if (fundamentalUpdate.resilient) {
        updateData["system.runes.resilient"] = fundamentalUpdate.resilient;
      }
      if (fundamentalUpdate.reinforcing) {
        updateData["system.runes.reinforcing"] = fundamentalUpdate.reinforcing;
      }
    }

    await targetItem.update(updateData);
    ui.notifications?.info(`Rune ${runeItem.name} wurde an ${targetItem.name} angebracht.`);
    return true;
  }

  private getAttachedPropertyRunes(targetItem: RuneManagerItem): string[] {
    const runes = (targetItem.system as { runes?: { property?: string[] } })?.runes
      ?.property;
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

  private getPropertyRuneSlug(runeName: string): string | null {
    const lookup: Record<string, string> = {
      "Flaming Rune": "flaming",
      "Frost Rune": "frost",
      "Shock Rune": "shock",
      "Thundering Rune": "thundering",
      "Corrosive Rune": "corrosive",
      "Ghost Touch Rune": "ghostTouch",
      "Returning Rune": "returning",
      "Shifting Rune": "shifting",
      "Speed Rune": "speed",
      "Vorpal Rune": "vorpal",
      "Wounding Rune": "wounding",
      "Anarchic Rune": "anarchic",
      "Axiomatic Rune": "axiomatic",
      "Holy Rune": "holy",
      "Unholy Rune": "unholy",
      "Disrupting Rune": "disrupting",
      "Grievous Rune": "grievous",
      "Keen Rune": "keen",
      "Brilliant Rune": "brilliant",
      "Merciful Rune": "merciful",
      "Fanged Rune": "fanged",
      "Anchoring Rune": "anchoring",
      "Impactful Rune": "impactful",
      "Dancing Rune": "dancing",
      "Spell Storing Rune": "spellStoring",
      "Spell-Storing Rune": "spellStoring",
      "Flammenrune": "flaming",
      "Frostrune": "frost",
      "Schockrune": "shock",
      "Donnernde Rune": "thundering",
      "Geisterberührungsrune": "ghostTouch",
      "Rückkehrrune": "returning",
      "Verwandlungsrune": "shifting",
      "Geschwindigkeitsrune": "speed",
      "Vorpalrune": "vorpal",
      "Wundrune": "wounding",
      "Heilige Rune": "holy",
      "Unheilige Rune": "unholy",
      "Störende Rune": "disrupting",
      "Grausame Rune": "grievous",
      "Scharfe Rune": "keen",
      "Brillante Rune": "brilliant",
      "Barmherzige Rune": "merciful",
      "Fangrune": "fanged",
    };

    return lookup[runeName] ?? null;
  }

  private getFundamentalRuneUpdate(
    runeName: string
  ): {
    potency?: number;
    striking?: string;
    resilient?: string;
    reinforcing?: string;
  } | null {
    const lookup: Record<
      string,
      { potency?: number; striking?: string; resilient?: string; reinforcing?: string }
    > = {
      "Weapon Potency Rune (+1)": { potency: 1 },
      "Weapon Potency Rune (+2)": { potency: 2 },
      "Weapon Potency Rune (+3)": { potency: 3 },
      "Armor Potency Rune (+1)": { potency: 1 },
      "Armor Potency Rune (+2)": { potency: 2 },
      "Armor Potency Rune (+3)": { potency: 3 },
      "Potency Rune (+1)": { potency: 1 },
      "Potency Rune (+2)": { potency: 2 },
      "Potency Rune (+3)": { potency: 3 },
      "Waffen-Potenzrune +1": { potency: 1 },
      "Waffen-Potenzrune +2": { potency: 2 },
      "Waffen-Potenzrune +3": { potency: 3 },
      "Rüstungs-Potenzrune +1": { potency: 1 },
      "Rüstungs-Potenzrune +2": { potency: 2 },
      "Rüstungs-Potenzrune +3": { potency: 3 },
      "Potenzrune +1": { potency: 1 },
      "Potenzrune +2": { potency: 2 },
      "Potenzrune +3": { potency: 3 },
      "Striking Rune": { striking: "striking" },
      "Greater Striking Rune": { striking: "greaterStriking" },
      "Major Striking Rune": { striking: "majorStriking" },
      "Resilient Rune": { resilient: "resilient" },
      "Greater Resilient Rune": { resilient: "greaterResilient" },
      "Major Resilient Rune": { resilient: "majorResilient" },
      "Reinforcing Rune": { reinforcing: "reinforcing" },
      "Greater Reinforcing Rune": { reinforcing: "greaterReinforcing" },
      "Major Reinforcing Rune": { reinforcing: "majorReinforcing" },
      "Striking-Rune": { striking: "striking" },
      "Greater Striking-Rune": { striking: "greaterStriking" },
      "Major Striking-Rune": { striking: "majorStriking" },
      "Resiliente Rune": { resilient: "resilient" },
      "Greater Resiliente Rune": { resilient: "greaterResilient" },
      "Major Resiliente Rune": { resilient: "majorResilient" },
      "Verstärkende Rune": { reinforcing: "reinforcing" },
      "Greater Verstärkende Rune": { reinforcing: "greaterReinforcing" },
      "Major Verstärkende Rune": { reinforcing: "majorReinforcing" },
    };

    return lookup[runeName] ?? null;
  }
}
