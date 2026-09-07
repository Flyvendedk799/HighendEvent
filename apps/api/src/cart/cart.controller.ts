import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { DeliveryType } from "@prisma/client";
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from "class-validator";
import { CartService, type CartOwner } from "./cart.service";
import { OptionalJwtAuthGuard } from "../auth/optional-jwt-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import type { JwtPayload } from "../auth/password";
import { UseGuards } from "@nestjs/common";

class AddItemDto {
  @IsOptional() @IsString() @MinLength(8) sessionId?: string;
  @IsString() productId!: string;
  @Type(() => Number) @IsInt() @Min(1) @Max(999) quantity!: number;
  @IsOptional() @IsString() startDate?: string;
  @IsOptional() @IsString() endDate?: string;
  @IsOptional() @IsEnum(DeliveryType) deliveryType?: DeliveryType;
  @IsOptional() @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) upsellIds?: string[];
}

class UpdateItemDto {
  @IsOptional() @IsString() @MinLength(8) sessionId?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(999) quantity?: number;
  @IsOptional() @IsString() startDate?: string;
  @IsOptional() @IsString() endDate?: string;
  @IsOptional() @IsEnum(DeliveryType) deliveryType?: DeliveryType;
}

class SetUpsellsDto {
  @IsOptional() @IsString() @MinLength(8) sessionId?: string;
  @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) upsellIds!: string[];
}

class OwnerDto {
  @IsOptional() @IsString() @MinLength(8) sessionId?: string;
}

/**
 * Cart ownership is derived here, never accepted from the client: a signed-in customer is
 * identified by their token, and a guest by an opaque session id in their own cookie.
 */
@Controller("cart")
@UseGuards(OptionalJwtAuthGuard)
export class CartController {
  constructor(private readonly cart: CartService) {}

  @Get()
  get(@CurrentUser() user: JwtPayload | undefined, @Query("sessionId") sessionId?: string) {
    return this.cart.summary(owner(user, sessionId));
  }

  @Get("summary")
  summary(
    @CurrentUser() user: JwtPayload | undefined,
    @Query("sessionId") sessionId?: string,
    @Query("deliveryFeeMinor") deliveryFeeMinor?: string,
  ) {
    return this.cart.summary(owner(user, sessionId), {
      deliveryFeeMinor: deliveryFeeMinor ? Number(deliveryFeeMinor) : undefined,
    });
  }

  @Post("items")
  addItem(@CurrentUser() user: JwtPayload | undefined, @Body() body: AddItemDto) {
    const { sessionId, ...input } = body;
    return this.cart.addItem(owner(user, sessionId), input);
  }

  @Patch("items/:id")
  updateItem(
    @CurrentUser() user: JwtPayload | undefined,
    @Param("id") id: string,
    @Body() body: UpdateItemDto,
  ) {
    const { sessionId, ...data } = body;
    return this.cart.updateItem(owner(user, sessionId), id, data);
  }

  @Patch("items/:id/upsells")
  setUpsells(
    @CurrentUser() user: JwtPayload | undefined,
    @Param("id") id: string,
    @Body() body: SetUpsellsDto,
  ) {
    return this.cart.setItemUpsells(owner(user, body.sessionId), id, body.upsellIds);
  }

  @Delete("items/:id")
  removeItem(
    @CurrentUser() user: JwtPayload | undefined,
    @Param("id") id: string,
    @Query("sessionId") sessionId?: string,
  ) {
    return this.cart.removeItem(owner(user, sessionId), id);
  }

  @Post("merge")
  merge(@CurrentUser() user: JwtPayload | undefined, @Body() body: OwnerDto) {
    if (user?.role !== "customer") {
      throw new BadRequestException("Sign in before merging a guest cart");
    }
    if (!body.sessionId) {
      throw new BadRequestException("sessionId is required");
    }
    return this.cart.merge({ sessionId: body.sessionId, customerId: user.sub });
  }

  @Delete()
  clear(@CurrentUser() user: JwtPayload | undefined, @Query("sessionId") sessionId?: string) {
    return this.cart.clear(owner(user, sessionId));
  }
}

function owner(user: JwtPayload | undefined, sessionId?: string): CartOwner {
  if (user?.role === "customer") return { customerId: user.sub };
  if (!sessionId) throw new BadRequestException("sessionId is required for guest carts");
  return { sessionId };
}
