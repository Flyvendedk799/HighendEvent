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
import { DeliveryType } from "@prisma/client";
import { Type } from "class-transformer";
import {
  IsArray,
  IsEmail,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";
import { BookingsService } from "./bookings.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";

class BookingItemDto {
  @IsString() productId!: string;
  @Type(() => Number) @IsInt() @Min(1) quantity!: number;
}

class CreateBookingDto {
  @IsIn(["ONLINE", "MANUAL"]) source!: "ONLINE" | "MANUAL";
  @IsString() @MinLength(1) customerName!: string;
  @IsEmail() email!: string;
  @IsString() phone!: string;
  @IsString() address!: string;
  @IsString() zipCode!: string;
  @IsString() city!: string;
  @IsOptional() @IsString() country?: string;
  @IsString() startDate!: string;
  @IsString() endDate!: string;
  @IsOptional() @IsEnum(DeliveryType) deliveryType?: DeliveryType;
  @IsOptional() @Type(() => Number) @IsInt() deliveryFeeMinor?: number;
  @IsOptional() @IsString() customerId?: string;
  @IsOptional() @IsString() notes?: string;
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BookingItemDto)
  items!: BookingItemDto[];
}

class TransitionDto {
  @IsString() statusKey!: string;
}

class SoftDeleteDto {
  @IsOptional() @IsString() reason?: string;
}

@Controller("bookings")
export class BookingsController {
  constructor(private readonly bookings: BookingsService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("staff", "platform")
  list(
    @Query("statusKey") statusKey?: string,
    @Query("includeDeleted") includeDeleted?: string,
  ) {
    return this.bookings.list({
      statusKey,
      includeDeleted: includeDeleted === "true",
    });
  }

  @Get(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("staff", "platform", "customer")
  get(@Param("id") id: string) {
    return this.bookings.get(id);
  }

  @Post()
  create(@Body() body: CreateBookingDto) {
    return this.bookings.create(body);
  }

  @Post("manual")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("staff", "platform")
  createManual(@Body() body: CreateBookingDto) {
    return this.bookings.create({ ...body, source: "MANUAL" });
  }

  @Patch(":id/status")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("staff", "platform")
  transition(@Param("id") id: string, @Body() body: TransitionDto) {
    return this.bookings.transition(id, body.statusKey);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("staff", "platform")
  softDelete(@Param("id") id: string, @Body() body: SoftDeleteDto) {
    return this.bookings.softDelete(id, body.reason);
  }
}
