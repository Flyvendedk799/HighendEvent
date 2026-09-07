import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { AnalyticsService } from "./analytics.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";

function clamp(value: string | undefined, fallback: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(Math.round(parsed), max);
}

@Controller("analytics")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("staff", "platform")
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get("kpis")
  kpis() {
    return this.analytics.kpis();
  }

  @Get("revenue")
  revenue(@Query("months") months?: string) {
    return this.analytics.revenueSeries(clamp(months, 12, 36));
  }

  @Get("utilisation")
  utilisation(@Query("days") days?: string) {
    return this.analytics.utilisation(clamp(days, 90, 365));
  }

  @Get("conversion")
  conversion(@Query("days") days?: string) {
    return this.analytics.conversion(clamp(days, 30, 365));
  }

  @Get("pairs")
  pairs(@Query("limit") limit?: string) {
    return this.analytics.topPairs(clamp(limit, 5, 20));
  }

  @Get("weekday-load")
  weekdayLoad(@Query("days") days?: string) {
    return this.analytics.weekdayLoad(clamp(days, 90, 365));
  }
}
