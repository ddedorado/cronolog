import { onCall } from "firebase-functions/v2/https";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

initializeApp();
const db = getFirestore();

interface InviteResult {
  valid: boolean;
  reason?: "invalid" | "exhausted" | "expired";
  remaining?: number;
}

/**
 * Validate an invite code (read-only, for live feedback while typing).
 */
export const validateInviteCode = onCall<{ code: string }>(async (request) => {
  const code = request.data?.code?.trim();
  if (!code) {
    return { valid: false, reason: "invalid" } as InviteResult;
  }

  const snapshot = await db
    .collection("invite_codes")
    .where("code", "==", code)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return { valid: false, reason: "invalid" } as InviteResult;
  }

  const doc = snapshot.docs[0];
  const data = doc.data();

  // Check expiration
  if (data.expiresAt && data.expiresAt.toDate() < new Date()) {
    return { valid: false, reason: "expired" } as InviteResult;
  }

  // Check uses remaining
  const remaining = data.maxUses - data.usedCount;
  if (remaining <= 0) {
    return { valid: false, reason: "exhausted" } as InviteResult;
  }

  return { valid: true, remaining } as InviteResult;
});

/**
 * Redeem an invite code atomically (call on registration submit).
 * Uses a Firestore transaction to prevent race conditions.
 */
export const redeemInviteCode = onCall<{ code: string }>(async (request) => {
  const code = request.data?.code?.trim();
  if (!code) {
    return { valid: false, reason: "invalid" } as InviteResult;
  }

  const snapshot = await db
    .collection("invite_codes")
    .where("code", "==", code)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return { valid: false, reason: "invalid" } as InviteResult;
  }

  const docRef = snapshot.docs[0].ref;

  // Use transaction for atomicity
  const result = await db.runTransaction(async (transaction) => {
    const doc = await transaction.get(docRef);
    if (!doc.exists) {
      return { valid: false, reason: "invalid" } as InviteResult;
    }

    const data = doc.data()!;

    // Check expiration
    if (data.expiresAt && data.expiresAt.toDate() < new Date()) {
      return { valid: false, reason: "expired" } as InviteResult;
    }

    // Check uses remaining
    const remaining = data.maxUses - data.usedCount;
    if (remaining <= 0) {
      return { valid: false, reason: "exhausted" } as InviteResult;
    }

    // Increment used count
    transaction.update(docRef, {
      usedCount: FieldValue.increment(1),
    });

    return { valid: true, remaining: remaining - 1 } as InviteResult;
  });

  return result;
});
