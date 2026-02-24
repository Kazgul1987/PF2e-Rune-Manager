type RuneManagerItem = {
  id: string;
  name: string;
  type: string;
  system?: Record<string, unknown>;
  update?: (data: Record<string, unknown>) => Promise<unknown>;
};

type RuneManagerActor = {
  id?: string;
  name?: string;
  type?: string;
  isOwner?: boolean;
  ownership?: Record<string, number>;
  testUserPermission?: (user: unknown, permission: string) => boolean;
  items: {
    get: (id: string) => RuneManagerItem | undefined;
    filter: (predicate: (item: RuneManagerItem) => boolean) => RuneManagerItem[];
  };
  deleteEmbeddedDocuments?: (
    embeddedName: string,
    ids: string[]
  ) => Promise<unknown>;
  sheet?: {
    render: (force?: boolean) => void;
  };
};

type RuneTargetSelection = {
  actorId: string;
  actorName: string;
  itemId: string;
  itemName: string;
};

type RuneManagerUser = {
  id?: string;
  isGM?: boolean;
};

type RuneManagerGame = {
  user?: RuneManagerUser;
  settings?: {
    get: (moduleId: string, key: string) => unknown;
  };
  actors?: {
    get: (id: string) => RuneManagerActor | undefined;
    filter: (predicate: (actor: RuneManagerActor) => boolean) => RuneManagerActor[];
  };
};

const MODULE_ID = "pf2e-rune-manager";

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

const WEAPON_PROPERTY_RUNE_FALLBACKS: Record<string, string> = {
  ancestral-echoing: "ancestralEchoing",
  anchoring: "anchoring",
  anarchic: "anarchic",
  ashen: "ashen",
  astral: "astral",
  authorized: "authorized",
  axiomatic: "axiomatic",
  bane: "bane",
  bloodbane: "bloodbane",
  bloodthirsty: "bloodthirsty",
  bolkas-blessing: "bolkasBlessing",
  brilliant: "brilliant",
  called: "called",
  coating: "coating",
  conducting: "conducting",
  corrosive: "corrosive",
  crushing: "crushing",
  cunning: "cunning",
  dancing: "dancing",
  decaying: "decaying",
  deathdrinking: "deathdrinking",
  demolishing: "demolishing",
  disrupting: "disrupting",
  earthbinding: "earthbinding",
  energizing: "energizing",
  extending: "extending",
  fanged: "fanged",
  fearsome: "fearsome",
  flaming: "flaming",
  flickering: "flickering",
  flurrying: "flurrying",
  frost: "frost",
  "ghost-touch": "ghostTouch",
  giant-killing: "giantKilling",
  greater-anchoring: "greaterAnchoring",
  greater-ashen: "greaterAshen",
  greater-astral: "greaterAstral",
  greater-bloodbane: "greaterBloodbane",
  greater-bolkas-blessing: "greaterBolkasBlessing",
  greater-brilliant: "greaterBrilliant",
  greater-corrosive: "greaterCorrosive",
  greater-crushing: "greaterCrushing",
  greater-decaying: "greaterDecaying",
  greater-disrupting: "greaterDisrupting",
  greater-extending: "greaterExtending",
  greater-fanged: "greaterFanged",
  greater-fearsome: "greaterFearsome",
  greater-flaming: "greaterFlaming",
  greater-frost: "greaterFrost",
  greater-giant-killing: "greaterGiantKilling",
  greater-hauling: "greaterHauling",
  greater-impactful: "greaterImpactful",
  greater-kolss-oath: "greaterKolssOath",
  greater-rooting: "greaterRooting",
  greater-shock: "greaterShock",
  greater-thundering: "greaterThundering",
  greater-trudds-strength: "greaterTruddsStrength",
  grievous: "grievous",
  hauling: "hauling",
  holy: "holy",
  hopeful: "hopeful",
  hooked: "hooked",
  impactful: "impactful",
  impossible: "impossible",
  keen: "keen",
  kin-warding: "kinWarding",
  kolss-oath: "kolssOath",
  major-fanged: "majorFanged",
  major-rooting: "majorRooting",
  merciful: "merciful",
  nightmare: "nightmare",
  pacifying: "pacifying",
  returning: "returning",
  rooting: "rooting",
  serrating: "serrating",
  shifting: "shifting",
  shock: "shock",
  shockwave: "shockwave",
  speed: "speed",
  "spell-storing": "spellStoring",
  swarming: "swarming",
  thundering: "thundering",
  trudds-strength: "truddsStrength",
  true-rooting: "trueRooting",
  underwater: "underwater",
  unholy: "unholy",
  vorpal: "vorpal",
  wounding: "wounding",
};

const ARMOR_PROPERTY_RUNE_FALLBACKS: Record<string, string> = {
  acid-resistant: "acidResistant",
  advancing: "advancing",
  aim-aiding: "aimAiding",
  antimagic: "antimagic",
  assisting: "assisting",
  bitter: "bitter",
  cold-resistant: "coldResistant",
  deathless: "deathless",
  electricity-resistant: "electricityResistant",
  energy-adaptive: "energyAdaptive",
  ethereal: "ethereal",
  fire-resistant: "fireResistant",
  fortification: "fortification",
  glamered: "glamered",
  gliding: "gliding",
  greater-acid-resistant: "greaterAcidResistant",
  greater-advancing: "greaterAdvancing",
  greater-cold-resistant: "greaterColdResistant",
  greater-dread: "greaterDread",
  greater-electricity-resistant: "greaterElectricityResistant",
  greater-fire-resistant: "greaterFireResistant",
  greater-fortification: "greaterFortification",
  greater-invisibility: "greaterInvisibility",
  greater-ready: "greaterReady",
  greater-shadow: "greaterShadow",
  greater-slick: "greaterSlick",
  greater-stanching: "greaterStanching",
  greater-quenching: "greaterQuenching",
  greater-swallow-spike: "greaterSwallowSpike",
  greater-winged: "greaterWinged",
  immovable: "immovable",
  implacable: "implacable",
  invisibility: "invisibility",
  lesser-dread: "lesserDread",
  magnetizing: "magnetizing",
  major-quenching: "majorQuenching",
  major-shadow: "majorShadow",
  major-slick: "majorSlick",
  major-stanching: "majorStanching",
  major-swallow-spike: "majorSwallowSpike",
  malleable: "malleable",
  misleading: "misleading",
  moderate-dread: "moderateDread",
  portable: "portable",
  quenching: "quenching",
  raiment: "raiment",
  ready: "ready",
  rock-braced: "rockBraced",
  shadow: "shadow",
  sinister-knight: "sinisterKnight",
  size-changing: "sizeChanging",
  slick: "slick",
  soaring: "soaring",
  spellwatch: "spellwatch",
  stanching: "stanching",
  swallow-spike: "swallowSpike",
  true-quenching: "trueQuenching",
  true-stanching: "trueStanching",
  winged: "winged",
};

const FUNDAMENTAL_RUNE_FALLBACKS: Record<
  string,
  {
    potency?: number;
    striking?: string;
    resilient?: string;
    reinforcing?: string;
  }
> = {
  striking: { striking: "striking" },
  "greater-striking": { striking: "greaterStriking" },
  "major-striking": { striking: "majorStriking" },
  resilient: { resilient: "resilient" },
  "greater-resilient": { resilient: "greaterResilient" },
  "major-resilient": { resilient: "majorResilient" },
  reinforcing: { reinforcing: "reinforcing" },
  "greater-reinforcing": { reinforcing: "greaterReinforcing" },
  "major-reinforcing": { reinforcing: "majorReinforcing" },
};

export class CharacterActor {
  constructor(private readonly actor: RuneManagerActor) {}

  async openRuneAttachDialog(itemId: string): Promise<void> {
    const runeItem = this.actor.items.get(itemId);
    if (!runeItem) {
      ui.notifications?.warn("Die Rune konnte nicht gefunden werden.");
      return;
    }

    const eligibleTargets = this.getEligibleRuneTargetsAcrossActors(runeItem);
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
            const selectedActorId = (html as JQuery)
              .find('select[name="rune-target-actor"]')
              .val() as string | undefined;
            const selectedItemId = (html as JQuery)
              .find('select[name="rune-target-item"]')
              .val() as string | undefined;

            if (!selectedActorId) {
              ui.notifications?.warn("Bitte wähle einen Ziel-Actor aus.");
              return;
            }

            if (!selectedItemId) {
              ui.notifications?.warn("Bitte wähle ein Ziel-Item aus.");
              return;
            }

            const targetActor = (game as RuneManagerGame).actors?.get(
              selectedActorId
            );
            if (!targetActor) {
              ui.notifications?.error(
                `Der Ziel-Actor mit ID ${selectedActorId} wurde nicht gefunden.`
              );
              return;
            }

            const targetItem = targetActor.items.get(selectedItemId);
            if (!targetItem) {
              ui.notifications?.error(
                `Das Ziel-Item mit ID ${selectedItemId} wurde auf ${targetActor.name ?? "dem Actor"} nicht gefunden.`
              );
              return;
            }

            const success = await this.attachRuneToItem(
              runeItem,
              targetItem,
              this.actor,
              targetActor
            );
            if (success) {
              this.actor.sheet?.render(true);
              targetActor.sheet?.render(true);
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
    this.bindRuneTargetActorSelect(dialog, eligibleTargets);
  }

  private getCandidateTargetActors(): RuneManagerActor[] {
    const gameData = game as RuneManagerGame;
    const actors = gameData.actors;
    if (!actors) {
      return [];
    }

    return actors.filter((actor) => {
      if (actor.type !== "character") {
        return false;
      }

      return this.userCanManageActor(actor, gameData.user);
    });
  }

  private getEligibleRuneTargetsAcrossActors(
    runeItem: RuneManagerItem
  ): RuneTargetSelection[] {
    const runeDefinition = this.getRuneDefinition(
      runeItem.name,
      this.getRuneItemSlug(runeItem)
    );
    if (!runeDefinition) {
      return [];
    }

    return this.getCandidateTargetActors().flatMap((actor) =>
      actor.items
        .filter((item) => {
          if (!this.isEquipmentItem(item)) {
            return false;
          }

          if (!this.isRuneCompatibleWithTarget(runeItem.name, item, runeItem)) {
            return false;
          }

          return this.hasAvailableRuneSlot(item);
        })
        .map((item) => ({
          actorId: actor.id ?? "",
          actorName: actor.name ?? "Unbekannter Charakter",
          itemId: item.id,
          itemName: item.name,
        }))
        .filter((target) => target.actorId.length > 0)
    );
  }

  private userCanManageActor(
    actor: RuneManagerActor,
    user?: RuneManagerUser
  ): boolean {
    if (typeof actor.testUserPermission === "function") {
      return actor.testUserPermission(user, "OWNER");
    }

    if (actor.isOwner) {
      return true;
    }

    if (user?.isGM) {
      return true;
    }

    const userId = user?.id;
    if (!userId || !actor.ownership) {
      return false;
    }

    const ownershipLevel = actor.ownership[userId];
    return typeof ownershipLevel === "number" && ownershipLevel >= 3;
  }

  private renderRuneTargetDialog(items: RuneTargetSelection[]): string {
    const groupedItems = this.groupRuneTargetsByActor(items);
    const actorOptions = groupedItems
      .map(({ actorId, actorName }) => `<option value="${actorId}">${actorName}</option>`)
      .join("");

    const firstActorId = groupedItems[0]?.actorId ?? "";
    const itemOptions = this.getRuneTargetItemOptionsForActor(groupedItems, firstActorId)
      .map((item) => `<option value="${item.itemId}">${item.itemName}</option>`)
      .join("");

    return `
      <form>
        <div class="form-group">
          <label>Ziel-Actor</label>
          <select name="rune-target-actor">
            ${actorOptions}
          </select>
        </div>
        <div class="form-group">
          <label>Ziel-Item</label>
          <select name="rune-target-item">
            ${itemOptions}
          </select>
        </div>
      </form>
    `;
  }

  private groupRuneTargetsByActor(
    items: RuneTargetSelection[]
  ): Array<{ actorId: string; actorName: string; items: RuneTargetSelection[] }> {
    const groupedItems = items.reduce<
      Map<string, { actorId: string; actorName: string; items: RuneTargetSelection[] }>
    >((groups, item) => {
      const current = groups.get(item.actorId) ?? {
        actorId: item.actorId,
        actorName: item.actorName,
        items: [],
      };
      current.items.push(item);
      groups.set(item.actorId, current);
      return groups;
    }, new Map());

    return Array.from(groupedItems.values());
  }

  private getRuneTargetItemOptionsForActor(
    groupedItems: Array<{ actorId: string; actorName: string; items: RuneTargetSelection[] }>,
    actorId: string
  ): RuneTargetSelection[] {
    return groupedItems.find((entry) => entry.actorId === actorId)?.items ?? [];
  }

  private bindRuneTargetActorSelect(
    dialog: Dialog,
    items: RuneTargetSelection[]
  ): void {
    const groupedItems = this.groupRuneTargetsByActor(items);
    const dialogElement = dialog.element;
    if (!dialogElement || !dialogElement.length) {
      return;
    }

    const actorSelect = dialogElement.find('select[name="rune-target-actor"]');
    const itemSelect = dialogElement.find('select[name="rune-target-item"]');
    if (!actorSelect.length || !itemSelect.length) {
      return;
    }

    const updateItemOptions = () => {
      const selectedActorId = actorSelect.val() as string | undefined;
      const availableItems = this.getRuneTargetItemOptionsForActor(
        groupedItems,
        selectedActorId ?? ""
      );

      itemSelect.empty();
      availableItems.forEach((targetItem) => {
        itemSelect.append(
          `<option value="${targetItem.itemId}">${targetItem.itemName}</option>`
        );
      });
    };

    actorSelect.off("change.pf2eRuneManagerAttach").on(
      "change.pf2eRuneManagerAttach",
      updateItemOptions
    );
    updateItemOptions();
  }

  private buildRunedItemName(
    targetItem: RuneManagerItem,
    runesState: {
      potency?: number;
      striking?: string;
      resilient?: string;
      reinforcing?: string;
      property?: string[];
    }
  ): string {
    const baseName = this.getBaseItemName(targetItem);
    const cleanedBaseName = this.stripExistingRunePrefixes(baseName, runesState);
    const prefixes: string[] = [];

    if (typeof runesState.potency === "number") {
      prefixes.push(`+${runesState.potency}`);
    }

    const fundamentalPrefix = this.getFundamentalPrefix(targetItem, runesState);
    if (fundamentalPrefix) {
      prefixes.push(fundamentalPrefix);
    }

    const propertyPrefixes = this.getPropertyRunePrefixes(runesState);
    if (propertyPrefixes.length > 0) {
      prefixes.push(...propertyPrefixes);
    }

    if (prefixes.length === 0) {
      return cleanedBaseName;
    }

    return `${prefixes.join(" ")} ${cleanedBaseName}`.trim();
  }

  private async attachRuneToItem(
    runeItem: RuneManagerItem,
    targetItem: RuneManagerItem,
    sourceActor: RuneManagerActor,
    targetActor: RuneManagerActor
  ): Promise<boolean> {
    const gameData = game as RuneManagerGame;
    if (!this.userCanManageActor(sourceActor, gameData.user)) {
      ui.notifications?.error("Du hast keine Berechtigung, diese Rune zu verwenden.");
      return false;
    }

    if (!this.userCanManageActor(targetActor, gameData.user)) {
      ui.notifications?.error("Du hast keine Berechtigung, dieses Ziel-Item zu verändern.");
      return false;
    }

    if (!this.isEquipmentItem(targetItem)) {
      ui.notifications?.error(
        "Runen können nur an Waffen, Rüstungen oder Schilden angebracht werden."
      );
      return false;
    }

    if (!this.isRuneCompatibleWithTarget(runeItem.name, targetItem, runeItem)) {
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

    const fundamentalUpdate = this.getFundamentalRuneUpdate(
      runeItem.name,
      runeItem
    );
    const propertyRuneSlug = fundamentalUpdate ? null : this.normalizeRuneSlug(runeItem.name);
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

    const currentRunesState = (targetItem.system as {
      runes?: {
        potency?: number;
        striking?: string;
        resilient?: string;
        reinforcing?: string;
        property?: string[];
      };
    })?.runes;
    const currentPropertyRunes = this.getAttachedPropertyRunes(targetItem);
    const updatedPropertyRunes =
      propertyRuneSlug && !currentPropertyRunes.includes(propertyRuneSlug)
        ? [...currentPropertyRunes, propertyRuneSlug]
        : currentPropertyRunes;
    const runesState = {
      potency: currentRunesState?.potency,
      striking: currentRunesState?.striking,
      resilient: currentRunesState?.resilient,
      reinforcing: currentRunesState?.reinforcing,
      property: updatedPropertyRunes,
    };

    if (fundamentalUpdate) {
      if (typeof fundamentalUpdate.potency === "number") {
        runesState.potency = fundamentalUpdate.potency;
      }
      if (fundamentalUpdate.striking) {
        runesState.striking = fundamentalUpdate.striking;
      }
      if (fundamentalUpdate.resilient) {
        runesState.resilient = fundamentalUpdate.resilient;
      }
      if (fundamentalUpdate.reinforcing) {
        runesState.reinforcing = fundamentalUpdate.reinforcing;
      }
    }

    const newName = this.buildRunedItemName(targetItem, runesState);
    updateData["name"] = newName;

    await targetItem.update(updateData);

    if (this.shouldConsumeRuneOnApply()) {
      if (!runeItem.id) {
        ui.notifications?.error("Die Rune konnte nicht aus dem Quellinventar entfernt werden.");
        return false;
      }

      if (typeof sourceActor.deleteEmbeddedDocuments !== "function") {
        ui.notifications?.error("Das Quellinventar kann nicht aktualisiert werden.");
        return false;
      }

      await sourceActor.deleteEmbeddedDocuments("Item", [runeItem.id]);
    }

    ui.notifications?.info(
      `Rune ${runeItem.name} wurde an ${targetItem.name} von Actor ${targetActor.name ?? "Unbekannter Charakter"} angebracht.`
    );
    return true;
  }

  private shouldConsumeRuneOnApply(): boolean {
    const consumeSetting = (game as RuneManagerGame).settings?.get(
      MODULE_ID,
      "consumeRuneOnApply"
    );
    return consumeSetting === true;
  }

  private getBaseItemName(targetItem: RuneManagerItem): string {
    const baseItem = (targetItem.system as { baseItem?: unknown } | undefined)
      ?.baseItem;
    if (typeof baseItem === "string" && baseItem.trim().length > 0) {
      return baseItem;
    }

    return targetItem.name;
  }

  private stripExistingRunePrefixes(
    name: string,
    runesState: {
      potency?: number;
      striking?: string;
      resilient?: string;
      reinforcing?: string;
      property?: string[];
    }
  ): string {
    const propertyPrefixes = this.getPropertyRunePrefixes(runesState).map((prefix) =>
      prefix.toLowerCase()
    );
    const knownPrefixes = [
      "+\\d",
      "striking",
      "greater striking",
      "major striking",
      "resilient",
      "greater resilient",
      "major resilient",
      "reinforcing",
      "greater reinforcing",
      "major reinforcing",
      ...propertyPrefixes,
    ];

    if (knownPrefixes.length === 0) {
      return name.trim();
    }

    const escapedPrefixes = knownPrefixes.map((prefix) =>
      prefix === "+\\d" ? "\\+\\d" : this.escapeRegex(prefix)
    );
    const prefixRegex = new RegExp(
      `^\\s*(?:${escapedPrefixes.join("|")})\\s+`,
      "i"
    );

    let cleanedName = name.trim();
    let iterations = 0;
    while (prefixRegex.test(cleanedName) && iterations < 10) {
      cleanedName = cleanedName.replace(prefixRegex, "").trim();
      iterations += 1;
    }

    return cleanedName;
  }

  private getFundamentalPrefix(
    targetItem: RuneManagerItem,
    runesState: {
      striking?: string;
      resilient?: string;
      reinforcing?: string;
    }
  ): string | null {
    const targetType = this.getItemRuneTargetType(targetItem);
    const prefixMap: Record<string, string> = {
      striking: "striking",
      greaterStriking: "greater striking",
      majorStriking: "major striking",
      resilient: "resilient",
      greaterResilient: "greater resilient",
      majorResilient: "major resilient",
      reinforcing: "reinforcing",
      greaterReinforcing: "greater reinforcing",
      majorReinforcing: "major reinforcing",
    };

    if (targetType === "weapon") {
      return runesState.striking ? prefixMap[runesState.striking] ?? null : null;
    }
    if (targetType === "armor") {
      return runesState.resilient ? prefixMap[runesState.resilient] ?? null : null;
    }
    if (targetType === "shield") {
      return runesState.reinforcing
        ? prefixMap[runesState.reinforcing] ?? null
        : null;
    }

    return null;
  }

  private getPropertyRunePrefixes(runesState: { property?: string[] }): string[] {
    if (!Array.isArray(runesState.property)) {
      return [];
    }

    return runesState.property
      .map((slug) => this.formatPropertyRuneName(slug))
      .filter((name) => name.length > 0);
  }

  private formatPropertyRuneName(runeSlug: string): string {
    if (!runeSlug) {
      return "";
    }

    const normalized = this.normalizeRuneSlug(runeSlug);
    return normalized.replace(/-/g, " ").toLowerCase();
  }

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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

  private getRuneDefinition(
    runeName: string,
    runeSlug?: string | null
  ): RuneNameDefinition | null {
    return (
      RUNE_NAME_MAP[runeName] ??
      this.getFallbackFundamentalRuneDefinition(runeName, runeSlug) ??
      this.getFallbackPropertyRuneDefinition(runeName)
    );
  }

  private getFallbackPropertyRuneDefinition(
    runeName: string
  ): RuneNameDefinition | null {
    const normalizedSlug = this.normalizeRuneSlug(runeName);
    if (!normalizedSlug) {
      return null;
    }

    const weaponSlug = WEAPON_PROPERTY_RUNE_FALLBACKS[normalizedSlug];
    if (weaponSlug) {
      return {
        targetTypes: ["weapon"],
        propertySlug: weaponSlug,
      };
    }

    const armorSlug = ARMOR_PROPERTY_RUNE_FALLBACKS[normalizedSlug];
    if (armorSlug) {
      return {
        targetTypes: ["armor"],
        propertySlug: armorSlug,
      };
    }

    return null;
  }

  private getFallbackFundamentalRuneDefinition(
    runeName: string,
    runeSlug?: string | null
  ): RuneNameDefinition | null {
    const normalizedSlug = this.getNormalizedRuneSlug(runeName, runeSlug);
    if (!normalizedSlug) {
      return null;
    }

    const fundamental = FUNDAMENTAL_RUNE_FALLBACKS[normalizedSlug];
    if (!fundamental) {
      return null;
    }

    const targetTypes: RuneTargetType[] = [];
    if (fundamental.striking) {
      targetTypes.push("weapon");
    }
    if (fundamental.resilient) {
      targetTypes.push("armor");
    }
    if (fundamental.reinforcing) {
      targetTypes.push("shield");
    }
    if (typeof fundamental.potency === "number") {
      targetTypes.push("weapon", "armor");
    }

    if (targetTypes.length === 0) {
      return null;
    }

    return {
      targetTypes,
      fundamental,
    };
  }

  private getFallbackPropertyRuneSlug(runeName: string): string | null {
    const normalizedSlug = this.normalizeRuneSlug(runeName);
    if (!normalizedSlug) {
      return null;
    }

    return (
      WEAPON_PROPERTY_RUNE_FALLBACKS[normalizedSlug] ??
      ARMOR_PROPERTY_RUNE_FALLBACKS[normalizedSlug] ??
      null
    );
  }

  private normalizeRuneSlug(runeName: string): string {
    const expandedName = runeName.replace(/([a-z])([A-Z])/g, "$1 $2");
    const trimmed = expandedName.trim().replace(/\s*rune$/i, "");
    return trimmed
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  private getRuneItemSlug(runeItem?: RuneManagerItem | null): string | null {
    const slug = (runeItem?.system as { slug?: unknown } | undefined)?.slug;
    return typeof slug === "string" ? slug : null;
  }

  private getNormalizedRuneSlug(
    runeName: string,
    runeSlug?: string | null
  ): string {
    return this.normalizeRuneSlug(runeSlug ?? runeName);
  }

  private isRuneCompatibleWithTarget(
    runeName: string,
    targetItem: RuneManagerItem,
    runeItem?: RuneManagerItem | null
  ): boolean {
    const runeDefinition = this.getRuneDefinition(
      runeName,
      this.getRuneItemSlug(runeItem)
    );
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
    runeName: string,
    runeItem?: RuneManagerItem | null
  ): {
    potency?: number;
    striking?: string;
    resilient?: string;
    reinforcing?: string;
  } | null {
    const runeDefinition = this.getRuneDefinition(
      runeName,
      this.getRuneItemSlug(runeItem)
    );
    if (runeDefinition?.fundamental) {
      return runeDefinition.fundamental;
    }

    if (runeDefinition && !runeDefinition.fundamental) {
      // Manual examples for debugging:
      // "Striking Rune", "Greater Striking Rune", "Striking-Rune",
      // localized names with hyphens (e.g. "Waffen-Potenzrune +1").
      const normalizedName = this.normalizeRuneSlug(runeName);
      const fallbackFundamental = FUNDAMENTAL_RUNE_FALLBACKS[normalizedName];
      if (fallbackFundamental) {
        return fallbackFundamental;
      }
    }

    const normalizedSlug = this.getNormalizedRuneSlug(
      runeName,
      this.getRuneItemSlug(runeItem)
    );
    return FUNDAMENTAL_RUNE_FALLBACKS[normalizedSlug] ?? null;
  }
}
