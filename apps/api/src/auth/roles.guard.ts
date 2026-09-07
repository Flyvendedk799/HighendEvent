import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY, STAFF_ROLES_KEY, type StaffRoleName } from "./roles.decorator";
import type { AuthRole, JwtPayload } from "./password";
import { tryGetTenantContext } from "../tenant/tenant.context";

const READ_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ user?: JwtPayload; method?: string }>();
    const user = request.user;

    const roles = this.reflector.getAllAndOverride<AuthRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (roles?.length && (!user || !roles.includes(user.role))) {
      throw new ForbiddenException("Insufficient role");
    }

    const staffRoles = this.reflector.getAllAndOverride<StaffRoleName[]>(STAFF_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Platform operators are not tenant staff and are not subject to StaffRole seniority.
    if (user?.role === "staff") {
      const staffRole = (user.staffRole ?? "READONLY") as StaffRoleName;

      if (staffRoles?.length) {
        if (!staffRoles.includes(staffRole)) {
          throw new ForbiddenException(`Requires one of: ${staffRoles.join(", ")}`);
        }
      } else if (
        staffRole === "READONLY" &&
        !READ_METHODS.has((request.method ?? "GET").toUpperCase())
      ) {
        // READONLY means read-only everywhere, including routes added later that forget to
        // declare @StaffRoles. Routes that genuinely want READONLY writes must opt in.
        throw new ForbiddenException("Read-only staff cannot modify data");
      }
    }

    // A staff or customer token is bound to one tenant. The tenant context comes from the
    // request host / X-Tenant-Slug header, which the caller controls — so a token for tenant A
    // must never be honoured on a request resolved to tenant B.
    if (user && (user.role === "staff" || user.role === "customer") && user.tenantId) {
      const ctx = tryGetTenantContext();
      if (ctx?.tenantId && ctx.tenantId !== user.tenantId) {
        throw new ForbiddenException("Token does not belong to the requested tenant");
      }
    }

    return true;
  }
}
