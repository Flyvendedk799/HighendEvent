import { Body, Controller, Post } from "@nestjs/common";
import { Type } from "class-transformer";
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from "class-validator";
import { PricingService } from "./pricing.service";

class PricingItemDto {
  @IsString() productId!: string;
  @Type(() => Number) @IsInt() @Min(1) quantity!: number;
  @IsString() startDate!: string;
  @IsString() endDate!: string;
}

class QuoteDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PricingItemDto)
  items!: PricingItemDto[];

  @IsOptional() @Type(() => Number) @IsInt() deliveryFeeMinor?: number;
  @IsOptional() @Type(() => Number) @IsInt() discountMinor?: number;
}

@Controller("pricing")
export class PricingController {
  constructor(private readonly pricing: PricingService) {}

  @Post("quote")
  quote(@Body() body: QuoteDto) {
    return this.pricing.quote(body);
  }
}
