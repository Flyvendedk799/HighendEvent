import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { IsInt, IsOptional, IsString, Min } from "class-validator";
import { Type } from "class-transformer";
import { AvailabilityService } from "./availability.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";

class AvailabilityDto {
  @IsString() productId!: string;
  @IsString() startDate!: string;
  @IsString() endDate!: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) quantity?: number;
  /** Set when rescheduling, so a booking does not block itself. */
  @IsOptional() @IsString() excludeBookingId?: string;
}

@Controller("availability")
export class AvailabilityController {
  constructor(private readonly availability: AvailabilityService) {}

  @Post("check")
  check(@Body() body: AvailabilityDto) {
    return this.availability.check(body);
  }

  @Get("calendar")
  calendar(
    @Query("productId") productId: string,
    @Query("startDate") startDate: string,
    @Query("endDate") endDate: string,
  ) {
    return this.availability.calendar({ productId, startDate, endDate });
  }

  @Get("overview")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("staff", "platform")
  overview(
    @Query("startDate") startDate: string,
    @Query("endDate") endDate: string,
    @Query("productIds") productIds?: string,
  ) {
    return this.availability.overview({
      startDate,
      endDate,
      productIds: productIds ? productIds.split(",").filter(Boolean) : undefined,
    });
  }
}
