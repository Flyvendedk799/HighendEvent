import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { IsInt, IsOptional, IsString, Min } from "class-validator";
import { Type } from "class-transformer";
import { AvailabilityService } from "./availability.service";

class AvailabilityDto {
  @IsString() productId!: string;
  @IsString() startDate!: string;
  @IsString() endDate!: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) quantity?: number;
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
}
