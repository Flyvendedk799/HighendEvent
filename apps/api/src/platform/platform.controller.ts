import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { PlanTier } from "@prisma/client";
import { JwtService } from "@nestjs/jwt";
import { IsBoolean, IsEnum, IsObject, IsOptional, IsString } from "class-validator";
import { PlatformService } from "./platform.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { CurrentUser } from "../auth/current-user.decorator";
import type { JwtPayload } from "../auth/password";

class SuspendDto {
  @IsBoolean() suspended!: boolean;
  @IsOptional() @IsString() reason?: string;
}

class PlanDto {
  @IsEnum(PlanTier) plan!: PlanTier;
}

class FlagsDto {
  @IsObject() flags!: Record<string, boolean>;
}

@Controller("platform")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("platform")
export class PlatformController {
  constructor(
    private readonly platform: PlatformService,
    private readonly jwt: JwtService,
  ) {}

  @Get("metrics")
  metrics() {
    return this.platform.metrics();
  }

  @Get("tenants")
  listTenants(
    @Query("q") q?: string,
    @Query("plan") plan?: PlanTier,
    @Query("suspended") suspended?: string,
  ) {
    return this.platform.listTenants({
      q,
      plan,
      suspended: suspended === "true" ? true : suspended === "false" ? false : undefined,
    });
  }

  @Get("tenants/:slug")
  getTenant(@Param("slug") slug: string) {
    return this.platform.getTenant(slug);
  }

  @Patch("tenants/:id/suspend")
  suspend(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Body() body: SuspendDto,
  ) {
    return this.platform.suspendTenant(user.sub, id, body.suspended, body.reason);
  }

  @Patch("tenants/:id/plan")
  changePlan(@CurrentUser() user: JwtPayload, @Param("id") id: string, @Body() body: PlanDto) {
    return this.platform.changePlan(user.sub, id, body.plan);
  }

  @Patch("tenants/:id/flags")
  setFlags(@CurrentUser() user: JwtPayload, @Param("id") id: string, @Body() body: FlagsDto) {
    return this.platform.setFeatureFlags(user.sub, id, body.flags);
  }

  @Get("audit-log")
  auditLog(@Query("tenantId") tenantId?: string, @Query("limit") limit?: string) {
    return this.platform.auditLog(tenantId, limit ? Number(limit) : undefined);
  }

  /**
   * Support impersonation. Returns a short-lived staff token rather than the tenant owner's
   * real credentials, and the access is written to the audit log before the token is issued.
   */
  @Post("tenants/:id/view-as")
  async viewAs(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    const payload = await this.platform.impersonationTarget(user.sub, id);

    return {
      accessToken: this.jwt.sign(
        { ...payload, impersonatedBy: user.sub },
        { expiresIn: "30m" },
      ),
      expiresInSeconds: 30 * 60,
      tenantSlug: payload.tenantSlug,
    };
  }
}
