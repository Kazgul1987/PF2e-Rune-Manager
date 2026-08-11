import { DEFAULT_TRANSFER_COST_PERCENT, MODULE_ID } from "../constants.js";

export function getTransferCostPercent() {
  let configured = DEFAULT_TRANSFER_COST_PERCENT;
  try {
    configured = Number(game.settings?.get?.(MODULE_ID, "transferCostPercent"));
  } catch {
    // Use the documented default if settings are not ready.
  }
  return Number.isFinite(configured) && configured >= 0 && configured <= 100
    ? configured
    : DEFAULT_TRANSFER_COST_PERCENT;
}

export function getRuneTransferCost(priceGP) {
  const price = Number(priceGP);
  if (!Number.isFinite(price) || price < 0) return null;
  return price * (getTransferCostPercent() / 100);
}

export function getRuneTransferCostCP(priceGP) {
  const gp = getRuneTransferCost(priceGP);
  return gp === null ? null : Math.round(gp * 100);
}

export function getRuneSwapCost(sourcePrice, targetPrice) {
  const source = Number(sourcePrice);
  const target = Number(targetPrice);
  if (![source, target].every((price) => Number.isFinite(price) && price >= 0)) return null;
  return getRuneTransferCost(Math.max(source, target));
}

