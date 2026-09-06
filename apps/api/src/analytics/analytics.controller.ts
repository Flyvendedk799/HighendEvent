import { Controller, Get, UseGuards } from "@nestjs/common";
import { AnalyticsService } from "./analytics.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";

@Controller("analytics")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("staff", "platform")
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get("kpis")
  kpis() {
    return this.analytics.kpis();
  }
}
