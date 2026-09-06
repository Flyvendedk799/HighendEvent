import { Body, Controller, Get, Param, Patch, UseGuards } from "@nestjs/common";
import { PlanTier } from "@prisma/client";
import { IsBoolean, IsEnum, IsInt, IsObject, IsOptional, Min } from "class-validator";
import { PlatformService } from "./platform.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";

class SuspendDto {
  @IsOptional()
  @IsBoolean()
  suspended?: boolean;
}

class UpdateTenantDto {
  @IsOptional()
  @IsEnum(PlanTier)
  plan?: PlanTier;

  @IsOptional()
  @IsObject()
  featureFlags?: Record<string, unknown>;

  @IsOptional()
  @IsInt()
  @Min(0)
  applicationFeeBps?: number;
}

@Controller("platform")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("platform")
export class PlatformController {
  constructor(private readonly platform: PlatformService) {}

  @Get("tenants")
  listTenants() {
    return this.platform.listTenants();
  }

  @Get("tenants/:slug")
  getTenant(@Param("slug") slug: string) {
    return this.platform.getTenantBySlug(slug);
  }

  @Patch("tenants/:id")
  update(@Param("id") id: string, @Body() body: UpdateTenantDto) {
    return this.platform.updateTenant(id, body);
  }

  @Patch("tenants/:id/suspend")
  suspend(@Param("id") id: string, @Body() body: SuspendDto) {
    return this.platform.suspendTenant(id, body.suspended ?? true);
  }

  @Get("metrics")
  metrics() {
    return this.platform.metrics();
  }
}
