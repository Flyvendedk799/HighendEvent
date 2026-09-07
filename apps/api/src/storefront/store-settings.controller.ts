import { Body, Controller, Get, Patch, UseGuards } from "@nestjs/common";
import { PaymentModel, TaxMode } from "@prisma/client";
import { Type } from "class-transformer";
import {
  IsArray,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from "class-validator";
import { StoreSettingsService } from "./store-settings.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles, StaffRoles, ADMIN_STAFF_ROLES } from "../auth/roles.decorator";

class StoreSettingsDto {
  @IsOptional() @IsString() @MinLength(1) name?: string;
  @IsOptional() @IsString() tagline?: string;
  @IsOptional() @IsString() localeDefault?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) locales?: string[];
  @IsOptional() @IsString() currency?: string;
  @IsOptional() @IsString() timezone?: string;
  @IsOptional() @IsString() country?: string;
  @IsOptional() @IsEnum(TaxMode) taxMode?: TaxMode;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(10_000) taxPercentBps?: number;
  @IsOptional() @IsEnum(PaymentModel) paymentModel?: PaymentModel;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(10_000) depositPercentBps?: number;
  @IsOptional() @IsString() logoUrl?: string;
  @IsOptional() @IsString() faviconUrl?: string;
  @IsOptional() @IsObject() brandColors?: Record<string, string>;
  @IsOptional() @IsObject() fonts?: Record<string, string>;
  @IsOptional() @IsString() supportEmail?: string;
  @IsOptional() @IsString() supportPhone?: string;
  @IsOptional() @IsString() seoTitle?: string;
  @IsOptional() @IsString() seoDescription?: string;
}

class ThemeDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsObject() tokens?: Record<string, string>;
}

@Controller("store")
export class StoreSettingsController {
  constructor(private readonly settings: StoreSettingsService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("staff", "platform")
  get() {
    return this.settings.get();
  }

  @Get("go-live")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("staff", "platform")
  goLive() {
    return this.settings.goLiveChecklist();
  }

  @Patch()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("staff", "platform")
  @StaffRoles(...ADMIN_STAFF_ROLES)
  update(@Body() body: StoreSettingsDto) {
    return this.settings.update(body);
  }

  @Patch("theme")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("staff", "platform")
  updateTheme(@Body() body: ThemeDto) {
    return this.settings.updateTheme(body);
  }
}
