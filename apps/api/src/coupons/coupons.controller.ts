import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { Type } from "class-transformer";
import { IsBoolean, IsInt, IsOptional, IsString, Min, MinLength } from "class-validator";
import { CouponsService } from "./coupons.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { OptionalJwtAuthGuard } from "../auth/optional-jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";

class CouponDto {
  @IsString() @MinLength(3) code!: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) percentOffBps?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) amountOffMinor?: number;
  @IsOptional() @IsString() currency?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) maxRedemptions?: number;
  @IsOptional() @IsString() startsAt?: string;
  @IsOptional() @IsString() endsAt?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

class UpdateCouponDto {
  @IsOptional() @IsString() @MinLength(3) code?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) percentOffBps?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) amountOffMinor?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) maxRedemptions?: number;
  @IsOptional() @IsString() startsAt?: string;
  @IsOptional() @IsString() endsAt?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

class QuoteDto {
  @IsString() code!: string;
  @Type(() => Number) @IsInt() @Min(0) subtotalMinor!: number;
  @IsString() currency!: string;
}

@Controller("coupons")
export class CouponsController {
  constructor(private readonly coupons: CouponsService) {}

  /** Shoppers check a code from the cart, so this one is open to guests. */
  @Post("quote")
  @UseGuards(OptionalJwtAuthGuard)
  quote(@Body() body: QuoteDto) {
    return this.coupons.quote(body.code, body.subtotalMinor, body.currency);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("staff", "platform")
  list() {
    return this.coupons.list();
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("staff", "platform")
  create(@Body() body: CouponDto) {
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
}
