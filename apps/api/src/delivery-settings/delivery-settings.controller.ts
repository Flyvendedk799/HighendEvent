import { Body, Controller, Delete, Get, Param, Put, Post, UseGuards } from "@nestjs/common";
import { DeliveryType } from "@prisma/client";
import { Type } from "class-transformer";
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from "class-validator";
import { DeliverySettingsService } from "./delivery-settings.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";

class SettingDto {
  @IsEnum(DeliveryType) type!: DeliveryType;
  @Type(() => Number) @IsInt() @Min(0) baseFeeMinor!: number;
  @IsOptional() @Type(() => Number) @IsInt() perKmFeeMinor?: number;
  @IsOptional() @Type(() => Number) @IsInt() freeDeliveryKm?: number;
  @IsOptional() @Type(() => Number) @IsInt() maxDeliveryKm?: number | null;
  @IsOptional() @IsString() currency?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

class ZoneDto {
  @IsString() @MinLength(1) name!: string;
  @Type(() => Number) @IsInt() @Min(0) feeMinor!: number;
  @IsOptional() @IsString() currency?: string;
  @IsOptional() polygonGeoJson?: unknown;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

@Controller("delivery-settings")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("staff", "platform")
export class DeliverySettingsController {
  constructor(private readonly settings: DeliverySettingsService) {}

  @Get()
  list() {
    return this.settings.list();
  }

  @Put()
  upsert(@Body() body: SettingDto) {
    return this.settings.upsert(body);
  }

  @Get("zones")
  listZones() {
    return this.settings.listZones();
  }

  @Post("zones")
  createZone(@Body() body: ZoneDto) {
    return this.settings.createZone(body);
  }

  @Delete("zones/:id")
  deleteZone(@Param("id") id: string) {
    return this.settings.deleteZone(id);
  }
}
