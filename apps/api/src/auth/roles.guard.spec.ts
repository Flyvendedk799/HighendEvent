import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { RolesGuard } from "./roles.guard";
import { ROLES_KEY, STAFF_ROLES_KEY } from "./roles.decorator";
import { hashPassword, needsRehash, verifyPassword } from "./password";
import { tenantStorage } from "../tenant/tenant.context";
import type { JwtPayload } from "./password";

function contextFor(user: JwtPayload | undefined, method = "GET"): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user, method }) }),
    getHandler: () => () => undefined,
    getClass: () => class {},
  } as unknown as ExecutionContext;
}

function reflectorWith(meta: Record<string, unknown>): Reflector {
  return {
    getAllAndOverride: (key: string) => meta[key],
  } as unknown as Reflector;
}

const staffA: JwtPayload = {
  sub: "staff-a",
  email: "a@example.com",
  role: "staff",
  tenantId: "tenant-a",
  tenantSlug: "alpha",
  staffRole: "OWNER",
};

describe("RolesGuard", () => {
  it("rejects a principal whose kind is not allowed", () => {
    const guard = new RolesGuard(reflectorWith({ [ROLES_KEY]: ["platform"] }));
    expect(() => guard.canActivate(contextFor(staffA))).toThrow(ForbiddenException);
  });

  it("allows an authorised principal", () => {
    const guard = new RolesGuard(reflectorWith({ [ROLES_KEY]: ["staff", "platform"] }));
    expect(guard.canActivate(contextFor(staffA))).toBe(true);
  });

  it("refuses a tenant-A token on a request resolved to tenant B", () => {
    const guard = new RolesGuard(reflectorWith({ [ROLES_KEY]: ["staff"] }));
    tenantStorage.run({ tenantId: "tenant-b", tenantSlug: "beta" }, () => {
      expect(() => guard.canActivate(contextFor(staffA))).toThrow(
        /does not belong to the requested tenant/,
      );
    });
  });

  it("accepts a tenant-A token on a request resolved to tenant A", () => {
    const guard = new RolesGuard(reflectorWith({ [ROLES_KEY]: ["staff"] }));
    tenantStorage.run({ tenantId: "tenant-a", tenantSlug: "alpha" }, () => {
      expect(guard.canActivate(contextFor(staffA))).toBe(true);
    });
  });

  it("lets READONLY staff read but not write", () => {
    const guard = new RolesGuard(reflectorWith({ [ROLES_KEY]: ["staff"] }));
    const readonly: JwtPayload = { ...staffA, staffRole: "READONLY" };

    expect(guard.canActivate(contextFor(readonly, "GET"))).toBe(true);
    expect(() => guard.canActivate(contextFor(readonly, "POST"))).toThrow(
      /Read-only staff cannot modify data/,
    );
    expect(() => guard.canActivate(contextFor(readonly, "DELETE"))).toThrow(ForbiddenException);
  });

  it("enforces explicit staff seniority", () => {
    const guard = new RolesGuard(
      reflectorWith({ [ROLES_KEY]: ["staff"], [STAFF_ROLES_KEY]: ["OWNER"] }),
    );
    expect(guard.canActivate(contextFor(staffA, "POST"))).toBe(true);
    expect(() =>
      guard.canActivate(contextFor({ ...staffA, staffRole: "MANAGER" }, "POST")),
    ).toThrow(/Requires one of: OWNER/);
  });

  it("does not subject platform operators to staff seniority rules", () => {
    const guard = new RolesGuard(
      reflectorWith({ [ROLES_KEY]: ["platform"], [STAFF_ROLES_KEY]: ["OWNER"] }),
    );
    const platform: JwtPayload = { sub: "p1", email: "ops@rentora.app", role: "platform" };
    expect(guard.canActivate(contextFor(platform, "POST"))).toBe(true);
  });
});

describe("password hashing", () => {
  it("round-trips a scrypt hash", () => {
    const stored = hashPassword("correct horse battery staple");
    expect(stored.startsWith("scrypt$")).toBe(true);
    expect(verifyPassword("correct horse battery staple", stored)).toBe(true);
    expect(verifyPassword("wrong", stored)).toBe(false);
    expect(needsRehash(stored)).toBe(false);
  });

  it("still verifies legacy sha256 hashes and flags them for upgrade", () => {
    // Written by the original seed script: unsalted sha256 of the password.
    const legacy = require("node:crypto")
      .createHash("sha256")
      .update("demo1234")
      .digest("hex");
    expect(verifyPassword("demo1234", legacy)).toBe(true);
    expect(verifyPassword("nope", legacy)).toBe(false);
    expect(needsRehash(legacy)).toBe(true);
  });

  it("rejects an empty stored hash", () => {
    expect(verifyPassword("anything", null)).toBe(false);
    expect(verifyPassword("anything", "")).toBe(false);
  });
});
