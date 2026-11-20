import { createHmac } from "node:crypto";

export function encodeSupervisorPin(pin: string): string {
  const secret = process.env.SUPERVISOR_PIN_SECRET || process.env.SESSION_SECRET;
  if (!secret || Buffer.byteLength(secret) < 32) {
    throw new Error("Falta la clave de protección de PIN.");
  }
  return "hmac:" + createHmac("sha256", secret).update("supervisor-pin:").update(pin).digest("hex");
}
