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

type RuneTargetType = "weapon" | "armor" | "shield";

type RuneNameDefinition = {
  targetTypes: RuneTargetType[];
  propertySlug?: string;
  fundamental?: {
    potency?: number;
    striking?: string;
    resilient?: string;
    reinforcing?: string;
  };
};

const RUNE_NAME_MAP: Record<string, RuneNameDefinition> = {
  "Flaming Rune": { targetTypes: ["weapon"], propertySlug: "flaming" },
  "Frost Rune": { targetTypes: ["weapon"], propertySlug: "frost" },
  "Shock Rune": { targetTypes: ["weapon"], propertySlug: "shock" },
  "Thundering Rune": { targetTypes: ["weapon"], propertySlug: "thundering" },
  "Corrosive Rune": { targetTypes: ["weapon"], propertySlug: "corrosive" },
  "Ghost Touch Rune": { targetTypes: ["weapon"], propertySlug: "ghostTouch" },
  "Returning Rune": { targetTypes: ["weapon"], propertySlug: "returning" },
  "Shifting Rune": { targetTypes: ["weapon"], propertySlug: "shifting" },
  "Speed Rune": { targetTypes: ["weapon"], propertySlug: "speed" },
  "Vorpal Rune": { targetTypes: ["weapon"], propertySlug: "vorpal" },
  "Wounding Rune": { targetTypes: ["weapon"], propertySlug: "wounding" },
  "Anarchic Rune": { targetTypes: ["weapon"], propertySlug: "anarchic" },
  "Axiomatic Rune": { targetTypes: ["weapon"], propertySlug: "axiomatic" },
  "Holy Rune": { targetTypes: ["weapon"], propertySlug: "holy" },
  "Unholy Rune": { targetTypes: ["weapon"], propertySlug: "unholy" },
  "Disrupting Rune": { targetTypes: ["weapon"], propertySlug: "disrupting" },
  "Grievous Rune": { targetTypes: ["weapon"], propertySlug: "grievous" },
  "Keen Rune": { targetTypes: ["weapon"], propertySlug: "keen" },
  "Brilliant Rune": { targetTypes: ["weapon"], propertySlug: "brilliant" },
  "Merciful Rune": { targetTypes: ["weapon"], propertySlug: "merciful" },
  "Fanged Rune": { targetTypes: ["weapon"], propertySlug: "fanged" },
  "Anchoring Rune": { targetTypes: ["weapon"], propertySlug: "anchoring" },
  "Impactful Rune": { targetTypes: ["weapon"], propertySlug: "impactful" },
  "Dancing Rune": { targetTypes: ["weapon"], propertySlug: "dancing" },
  "Spell Storing Rune": { targetTypes: ["weapon"], propertySlug: "spellStoring" },
  "Spell-Storing Rune": { targetTypes: ["weapon"], propertySlug: "spellStoring" },
  "Flammenrune": { targetTypes: ["weapon"], propertySlug: "flaming" },
  "Frostrune": { targetTypes: ["weapon"], propertySlug: "frost" },
  "Schockrune": { targetTypes: ["weapon"], propertySlug: "shock" },
  "Donnernde Rune": { targetTypes: ["weapon"], propertySlug: "thundering" },
  "Geisterberührungsrune": { targetTypes: ["weapon"], propertySlug: "ghostTouch" },
  "Rückkehrrune": { targetTypes: ["weapon"], propertySlug: "returning" },
  "Verwandlungsrune": { targetTypes: ["weapon"], propertySlug: "shifting" },
  "Geschwindigkeitsrune": { targetTypes: ["weapon"], propertySlug: "speed" },
  "Vorpalrune": { targetTypes: ["weapon"], propertySlug: "vorpal" },
  "Wundrune": { targetTypes: ["weapon"], propertySlug: "wounding" },
  "Heilige Rune": { targetTypes: ["weapon"], propertySlug: "holy" },
  "Unheilige Rune": { targetTypes: ["weapon"], propertySlug: "unholy" },
  "Störende Rune": { targetTypes: ["weapon"], propertySlug: "disrupting" },
  "Grausame Rune": { targetTypes: ["weapon"], propertySlug: "grievous" },
  "Scharfe Rune": { targetTypes: ["weapon"], propertySlug: "keen" },
  "Brillante Rune": { targetTypes: ["weapon"], propertySlug: "brilliant" },
  "Barmherzige Rune": { targetTypes: ["weapon"], propertySlug: "merciful" },
  "Fangrune": { targetTypes: ["weapon"], propertySlug: "fanged" },
  "Weapon Potency Rune (+1)": { targetTypes: ["weapon"], fundamental: { potency: 1 } },
  "Weapon Potency Rune (+2)": { targetTypes: ["weapon"], fundamental: { potency: 2 } },
  "Weapon Potency Rune (+3)": { targetTypes: ["weapon"], fundamental: { potency: 3 } },
  "Armor Potency Rune (+1)": { targetTypes: ["armor"], fundamental: { potency: 1 } },
  "Armor Potency Rune (+2)": { targetTypes: ["armor"], fundamental: { potency: 2 } },
  "Armor Potency Rune (+3)": { targetTypes: ["armor"], fundamental: { potency: 3 } },
  "Potency Rune (+1)": { targetTypes: ["weapon", "armor"], fundamental: { potency: 1 } },
  "Potency Rune (+2)": { targetTypes: ["weapon", "armor"], fundamental: { potency: 2 } },
  "Potency Rune (+3)": { targetTypes: ["weapon", "armor"], fundamental: { potency: 3 } },
  "Waffen-Potenzrune +1": { targetTypes: ["weapon"], fundamental: { potency: 1 } },
  "Waffen-Potenzrune +2": { targetTypes: ["weapon"], fundamental: { potency: 2 } },
  "Waffen-Potenzrune +3": { targetTypes: ["weapon"], fundamental: { potency: 3 } },
  "Rüstungs-Potenzrune +1": { targetTypes: ["armor"], fundamental: { potency: 1 } },
  "Rüstungs-Potenzrune +2": { targetTypes: ["armor"], fundamental: { potency: 2 } },
  "Rüstungs-Potenzrune +3": { targetTypes: ["armor"], fundamental: { potency: 3 } },
  "Potenzrune +1": { targetTypes: ["weapon", "armor"], fundamental: { potency: 1 } },
  "Potenzrune +2": { targetTypes: ["weapon", "armor"], fundamental: { potency: 2 } },
  "Potenzrune +3": { targetTypes: ["weapon", "armor"], fundamental: { potency: 3 } },
  "Striking Rune": { targetTypes: ["weapon"], fundamental: { striking: "striking" } },
  "Greater Striking Rune": {
    targetTypes: ["weapon"],
    fundamental: { striking: "greaterStriking" },
  },
  "Major Striking Rune": {
    targetTypes: ["weapon"],
    fundamental: { striking: "majorStriking" },
  },
  "Resilient Rune": { targetTypes: ["armor"], fundamental: { resilient: "resilient" } },
  "Greater Resilient Rune": {
    targetTypes: ["armor"],
    fundamental: { resilient: "greaterResilient" },
  },
  "Major Resilient Rune": {
    targetTypes: ["armor"],
    fundamental: { resilient: "majorResilient" },
  },
  "Reinforcing Rune": { targetTypes: ["shield"], fundamental: { reinforcing: "reinforcing" } },
  "Greater Reinforcing Rune": {
    targetTypes: ["shield"],
    fundamental: { reinforcing: "greaterReinforcing" },
  },
  "Major Reinforcing Rune": {
    targetTypes: ["shield"],
    fundamental: { reinforcing: "majorReinforcing" },
  },
  "Striking-Rune": { targetTypes: ["weapon"], fundamental: { striking: "striking" } },
  "Greater Striking-Rune": {
    targetTypes: ["weapon"],
    fundamental: { striking: "greaterStriking" },
  },
  "Major Striking-Rune": {
    targetTypes: ["weapon"],
    fundamental: { striking: "majorStriking" },
  },
  "Resiliente Rune": { targetTypes: ["armor"], fundamental: { resilient: "resilient" } },
  "Greater Resiliente Rune": {
    targetTypes: ["armor"],
    fundamental: { resilient: "greaterResilient" },
  },
  "Major Resiliente Rune": {
    targetTypes: ["armor"],
    fundamental: { resilient: "majorResilient" },
  },
  "Verstärkende Rune": { targetTypes: ["shield"], fundamental: { reinforcing: "reinforcing" } },
  "Greater Verstärkende Rune": {
    targetTypes: ["shield"],
    fundamental: { reinforcing: "greaterReinforcing" },
  },
  "Major Verstärkende Rune": {
    targetTypes: ["shield"],
    fundamental: { reinforcing: "majorReinforcing" },
  },
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
    const runeDefinition = this.getRuneDefinition(runeItem.name);
    if (!runeDefinition) {
      return [];
    }
    return this.actor.items.filter((item) => {
      if (!this.isEquipmentItem(item)) {
        return false;
      }

      if (!this.isRuneCompatibleWithTarget(runeItem.name, item)) {
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
      ui.notifications?.error(
        "Runen können nur an Waffen, Rüstungen oder Schilden angebracht werden."
      );
      return false;
    }

    if (!this.isRuneCompatibleWithTarget(runeItem.name, targetItem)) {
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

  private isEquipmentItem(item: RuneManagerItem): boolean {
    return this.getItemRuneTargetType(item) !== null;
  }

  private getItemRuneTargetType(item: RuneManagerItem): RuneTargetType | null {
    if (item.type === "weapon") {
      return "weapon";
    }

    if (item.type === "shield") {
      return "shield";
    }

    if (item.type === "armor") {
      const category = (item.system as { category?: string })?.category;
      return category === "shield" ? "shield" : "armor";
    }

    return null;
  }

  private getRuneDefinition(runeName: string): RuneNameDefinition | null {
    return RUNE_NAME_MAP[runeName] ?? null;
  }

  private isRuneCompatibleWithTarget(runeName: string, targetItem: RuneManagerItem): boolean {
    const runeDefinition = this.getRuneDefinition(runeName);
    if (!runeDefinition) {
      return false;
    }

    const targetType = this.getItemRuneTargetType(targetItem);
    if (!targetType) {
      return false;
    }

    return runeDefinition.targetTypes.includes(targetType);
  }

  private getPropertyRuneSlug(runeName: string): string | null {
    return this.getRuneDefinition(runeName)?.propertySlug ?? null;
  }

  private getFundamentalRuneUpdate(
    runeName: string
  ): {
    potency?: number;
    striking?: string;
    resilient?: string;
    reinforcing?: string;
  } | null {
    return this.getRuneDefinition(runeName)?.fundamental ?? null;
  }
}
