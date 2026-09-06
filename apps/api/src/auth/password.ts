import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export type AuthRole = "platform" | "staff" | "customer";

export type JwtPayload = {
  sub: string;
  email: string;
  role: AuthRole;
  tenantId?: string;
  staffRole?: string;
};

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = createHash("sha256").update(`${salt}:${password}`).digest("hex");
  return `sha256$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored?: string | null): boolean {
  if (!stored) return false;
  if (stored.startsWith("sha256$")) {
    const [, salt, hash] = stored.split("$");
    const candidate = createHash("sha256").update(`${salt}:${password}`).digest("hex");
    try {
      return timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(candidate, "hex"));
    } catch {
      return false;
    }
  }
  // seed compatibility: plain sha256
  const legacy = createHash("sha256").update(password).digest("hex");
  return legacy === stored;
}
