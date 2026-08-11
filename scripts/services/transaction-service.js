import { logger } from "../utils/logging.js";

/** Best-effort compensation around Foundry document mutations; this is not a transaction. */
export async function runCompensatedMutation({ applyPayment, applyMutation, restoreMutation }) {
  let payment = null;
  try {
    payment = await applyPayment();
    if (!payment?.success) return { success: false, phase: "payment" };
    const changed = await applyMutation();
    if (!changed) throw new Error("Item mutation reported no change");
    return { success: true, payment };
  } catch (error) {
    logger.error("Rune operation failed; starting best-effort compensation", error);
    let itemsRestored = false;
    let paymentRefunded = !payment?.charged;
    try {
      await restoreMutation?.();
      itemsRestored = true;
      logger.warn("Original rune item state restored after failure");
    } catch (restoreError) {
      logger.error("Failed to restore original rune item state", restoreError);
    }
    if (payment?.charged && typeof payment.refund === "function") {
      try {
        paymentRefunded = (await payment.refund()) !== false;
        logger.warn(paymentRefunded ? "Rune payment refunded after failure" : "Rune payment refund returned failure");
      } catch (refundError) {
        logger.error("Failed to refund rune payment", refundError);
      }
    }
    return { success: false, phase: "mutation", error, itemsRestored, paymentRefunded };
  }
}
