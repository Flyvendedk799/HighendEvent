import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { DeliveryType } from "@prisma/client";
import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsString, Min } from "class-validator";
import { CartService } from "./cart.service";

class AddItemDto {
  @IsOptional() @IsString() sessionId?: string;
  @IsOptional() @IsString() customerId?: string;
  @IsString() productId!: string;
  @Type(() => Number) @IsInt() @Min(1) quantity!: number;
  @IsOptional() @IsString() startDate?: string;
  @IsOptional() @IsString() endDate?: string;
  @IsOptional() @IsEnum(DeliveryType) deliveryType?: DeliveryType;
}

class UpdateItemDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) quantity?: number;
  @IsOptional() @IsString() startDate?: string;
  @IsOptional() @IsString() endDate?: string;
  @IsOptional() @IsEnum(DeliveryType) deliveryType?: DeliveryType;
}

@Controller("cart")
export class CartController {
  constructor(private readonly cart: CartService) {}

  @Get()
  get(@Query("sessionId") sessionId?: string, @Query("customerId") customerId?: string) {
    return this.cart.getOrCreate({ sessionId, customerId });
  }

  @Post("items")
  addItem(@Body() body: AddItemDto) {
    return this.cart.addItem(body);
  }

  @Patch("items/:id")
  updateItem(@Param("id") id: string, @Body() body: UpdateItemDto) {
    return this.cart.updateItem(id, body);
  }

  @Delete("items/:id")
  removeItem(@Param("id") id: string) {
    return this.cart.removeItem(id);
  }

  @Delete()
  clear(@Query("sessionId") sessionId?: string, @Query("customerId") customerId?: string) {
    return this.cart.clear({ sessionId, customerId });
  }
}
