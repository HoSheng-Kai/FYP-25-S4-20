import crypto from "crypto";
import type { AuthPayload } from "./auth";

type PendingOtp = {
  user: AuthPayload;
  otpHash: string;
  expiresAt: number; // ms timestamp
};

const pending = new Map<string, PendingOtp>();

const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes

function hashOtp(otp: string) {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

export function createPendingOtp(user: AuthPayload, otp: string) {
  const tempAuthId = crypto.randomUUID();
  pending.set(tempAuthId, {
    user,
    otpHash: hashOtp(otp),
    expiresAt: Date.now() + OTP_TTL_MS,
  });
  return tempAuthId;
}

export function consumePendingOtp(tempAuthId: string, otp: string): AuthPayload | null {
  const entry = pending.get(tempAuthId);
  if (!entry) return null;

  if (Date.now() > entry.expiresAt) {
    pending.delete(tempAuthId);
    return null;
  }

  if (entry.otpHash !== hashOtp(otp)) return null;

  pending.delete(tempAuthId);
  return entry.user;
}
