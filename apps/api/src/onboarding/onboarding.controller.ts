import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { IsEmail, IsEnum, IsOptional, IsString, Matches, MinLength } from "class-validator";
import { PlanTier } from "@prisma/client";
import { OnboardingService } from "./onboarding.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";

class OnboardDto {
  @IsString()
  @MinLength(2)
  tenantName!: string;

  @IsString()
  @Matches(/^[a-z0-9-]+$/)
  slug!: string;

  @IsString()
  @MinLength(2)
  storeName!: string;

  @IsEmail()
  ownerEmail!: string;

  @IsString()
  ownerName!: string;

  @IsString()
  @MinLength(6)
  ownerPassword!: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsEnum(PlanTier)
  plan?: PlanTier;
}

@Controller("onboarding")
export class OnboardingController {
  constructor(private readonly onboarding: OnboardingService) {}

  @Post()
  create(@Body() body: OnboardDto) {
    return this.onboarding.onboard(body);
  }

  @Get("go-live")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("staff", "platform")
  goLive() {
    return this.onboarding.goLiveChecklist();
  }
}
