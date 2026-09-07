import { SetMetadata } from "@nestjs/common";
import type { AuthRole } from "./password";

export const ROLES_KEY = "roles";
export const STAFF_ROLES_KEY = "staffRoles";

/** Principal kind required for the route (platform / staff / customer). */
export const Roles = (...roles: AuthRole[]) => SetMetadata(ROLES_KEY, roles);

/**
 * Tenant staff seniority required for the route. READONLY staff pass `Roles("staff")`
 * but must not pass a mutating route, so mutations declare the roles that may write.
 */
export type StaffRoleName = "OWNER" | "MANAGER" | "STAFF" | "READONLY";

export const StaffRoles = (...roles: StaffRoleName[]) => SetMetadata(STAFF_ROLES_KEY, roles);

/** Everyone who is allowed to change tenant data. */
export const WRITE_STAFF_ROLES: StaffRoleName[] = ["OWNER", "MANAGER", "STAFF"];

/** Tenant-owner-only operations (billing, danger zone, staff management). */
export const ADMIN_STAFF_ROLES: StaffRoleName[] = ["OWNER", "MANAGER"];
