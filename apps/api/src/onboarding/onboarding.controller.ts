import { Body, Controller, Post } from "@nestjs/common";
import { IsEmail, IsEnum, IsOptional, IsString, Matches, MinLength } from "class-validator";
import { PlanTier } from "@prisma/client";
import { OnboardingService } from "./onboarding.service";

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
}
