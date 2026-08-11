import { MODULE_ID } from "../constants.js";

export const logger = {
  debug(...args) {
    let enabled = false;
    try {
      enabled = game.settings?.get?.(MODULE_ID, "debug") === true;
    } catch {
      // Settings are unavailable before Foundry's init hook.
    }
    if (enabled) console.debug(`[${MODULE_ID}]`, ...args);
  },
  warn(...args) {
    console.warn(`[${MODULE_ID}]`, ...args);
  },
  error(...args) {
    console.error(`[${MODULE_ID}]`, ...args);
  },
};

