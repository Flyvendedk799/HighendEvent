import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export type AuthRole = "platform" | "staff" | "customer";

export type JwtPayload = {
  sub: string;
  email: string;
  role: AuthRole;
  name?: string;
  tenantId?: string;
  tenantSlug?: string;
  staffRole?: string;
};

/**
 * scrypt parameters. N=16384 keeps hashing ~50-100ms on commodity hardware,
 * which is the right cost for an interactive login.
 */
const SCRYPT_N = 16_384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LEN = 64;
const MAXMEM = 64 * 1024 * 1024;

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const derived = scryptSync(password, salt, KEY_LEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: MAXMEM,
  });
  return [
    "scrypt",
    SCRYPT_N,
    SCRYPT_R,
    SCRYPT_P,
    salt.toString("hex"),
    derived.toString("hex"),
  ].join("$");
}

function safeEqualHex(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a, "hex");
    const bufB = Buffer.from(b, "hex");
    if (bufA.length !== bufB.length || bufA.length === 0) return false;
    return timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

export function verifyPassword(password: string, stored?: string | null): boolean {
  if (!stored) return false;

  if (stored.startsWith("scrypt$")) {
    const [, n, r, p, salt, hash] = stored.split("$");
    if (!n || !r || !p || !salt || !hash) return false;
    try {
      const derived = scryptSync(password, Buffer.from(salt, "hex"), hash.length / 2, {
        N: Number(n),
        r: Number(r),
        p: Number(p),
        maxmem: MAXMEM,
      });
      return safeEqualHex(hash, derived.toString("hex"));
    } catch {
      return false;
    }
  }

  // Legacy salted sha256 written by earlier builds.
  if (stored.startsWith("sha256$")) {
    const [, salt, hash] = stored.split("$");
    if (!salt || !hash) return false;
    const candidate = createHash("sha256").update(`${salt}:${password}`).digest("hex");
    return safeEqualHex(hash, candidate);
  }

  // Legacy unsalted sha256 written by the original seed script.
  return safeEqualHex(stored, createHash("sha256").update(password).digest("hex"));
}

/** True when the stored hash uses a weaker scheme and should be upgraded on next login. */
export function needsRehash(stored?: string | null): boolean {
  if (!stored) return false;
  return !stored.startsWith("scrypt$");
}
