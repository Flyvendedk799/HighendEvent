import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from "class-validator";
import { CouponsService } from "./coupons.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";

class CreateCouponDto {
  @IsString()
  @MinLength(2)
  code!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  percentOffBps?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  amountOffMinor?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxRedemptions?: number;

  @IsOptional()
  @IsString()
  startsAt?: string;

  @IsOptional()
  @IsString()
  endsAt?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

class UpdateCouponDto {
  @IsOptional()
  @IsInt()
  percentOffBps?: number | null;

  @IsOptional()
  @IsInt()
  amountOffMinor?: number | null;

  @IsOptional()
  @IsString()
  currency?: string | null;

  @IsOptional()
  @IsInt()
  maxRedemptions?: number | null;

  @IsOptional()
  @IsString()
  startsAt?: string | null;

  @IsOptional()
  @IsString()
  endsAt?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

class ValidateCouponDto {
  @IsString()
  @MinLength(2)
  code!: string;

  @IsInt()
  @Min(0)
  subtotalMinor!: number;
}

@Controller("coupons")
export class CouponsController {
  constructor(private readonly coupons: CouponsService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("staff", "platform")
  list() {
    return this.coupons.list();
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("staff", "platform")
  create(@Body() body: CreateCouponDto) {
    return this.coupons.create(body);
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("staff", "platform")
  update(@Param("id") id: string, @Body() body: UpdateCouponDto) {
    return this.coupons.update(id, body);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("staff", "platform")
  remove(@Param("id") id: string) {
    return this.coupons.remove(id);
  }

  @Post("validate")
  validate(@Body() body: ValidateCouponDto) {
    return this.coupons.validate(body.code, body.subtotalMinor);
  }

  @Get("preview")
  preview(@Query("code") code: string, @Query("subtotalMinor") subtotalMinor: string) {
    return this.coupons.validate(code, Number(subtotalMinor) || 0);
  }
}
