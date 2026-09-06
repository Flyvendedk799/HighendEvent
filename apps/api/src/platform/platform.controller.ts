import { Controller, Get, Param, Patch, Body, UseGuards } from "@nestjs/common";
import { IsBoolean, IsOptional } from "class-validator";
import { PlatformService } from "./platform.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";

class SuspendDto {
  @IsOptional()
  @IsBoolean()
  suspended?: boolean;
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

  @Patch("tenants/:id/suspend")
  suspend(@Param("id") id: string, @Body() body: SuspendDto) {
    return this.platform.suspendTenant(id, body.suspended ?? true);
  }

  @Get("metrics")
  metrics() {
    return this.platform.metrics();
  }
}
