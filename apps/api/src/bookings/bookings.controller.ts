import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
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
import { CurrentUser } from "../auth/current-user.decorator";
import type { JwtPayload } from "../auth/password";

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

class NotesDto {
  @IsOptional() @IsString() notes?: string | null;
  @IsOptional() @IsString() internalNotes?: string | null;
}

@Controller("bookings")
export class BookingsController {
  constructor(private readonly bookings: BookingsService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("staff", "platform")
  list(
    @Query("statusKey") statusKey?: string,
    @Query("customerId") customerId?: string,
    @Query("includeDeleted") includeDeleted?: string,
  ) {
    return this.bookings.list({
      statusKey,
      customerId,
      includeDeleted: includeDeleted === "true",
    });
  }

  @Get("calendar.ics")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("staff", "platform")
  @Header("Content-Type", "text/calendar; charset=utf-8")
  @Header("Content-Disposition", 'inline; filename="rentora-bookings.ics"')
  calendarIcs(@Query("statusKey") statusKey?: string) {
    return this.bookings.toIcs({ statusKey });
  }

  @Get("mine")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("customer")
  mine(@CurrentUser() user: JwtPayload) {
    return this.bookings.list({ customerId: user.sub });
  }

  @Get(":id/calendar.ics")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("staff", "platform")
  @Header("Content-Type", "text/calendar; charset=utf-8")
  @Header("Content-Disposition", 'inline; filename="booking.ics"')
  bookingIcs(@Param("id") id: string) {
    return this.bookings.toIcsOne(id);
  }

  @Get(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("staff", "platform", "customer")
  get(@Param("id") id: string, @CurrentUser() user: JwtPayload) {
    return this.bookings.getWithOps(id, user);
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

  @Patch(":id/notes")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("staff", "platform")
  updateNotes(@Param("id") id: string, @Body() body: NotesDto) {
    return this.bookings.updateNotes(id, body);
  }

  @Post(":id/resend-confirmation")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("staff", "platform")
  resend(@Param("id") id: string) {
    return this.bookings.resendConfirmation(id);
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
