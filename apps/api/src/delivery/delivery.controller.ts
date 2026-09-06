import { Body, Controller, Post } from "@nestjs/common";
import { IsNumber, IsOptional, IsString, MinLength } from "class-validator";
import { Type } from "class-transformer";
import { DeliveryService } from "./delivery.service";

class DeliveryQuoteDto {
  @IsString() @MinLength(1) address!: string;
  @IsOptional() @IsString() zipCode?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() country?: string;
  @IsOptional() @Type(() => Number) @IsNumber() latitude?: number;
  @IsOptional() @Type(() => Number) @IsNumber() longitude?: number;
}

@Controller("delivery")
export class DeliveryController {
  constructor(private readonly delivery: DeliveryService) {}

  @Post("quote")
  quote(@Body() body: DeliveryQuoteDto) {
    return this.delivery.quote(body);
  }
}
