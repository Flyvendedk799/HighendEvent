import {
  BadRequestException,
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
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";
import { BookingsService } from "./bookings.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { OptionalJwtAuthGuard } from "../auth/optional-jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { CurrentUser } from "../auth/current-user.decorator";
import type { JwtPayload } from "../auth/password";

class BookingUpsellDto {
  @IsString() upsellProductId!: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) quantity?: number;
}

class BookingItemDto {
  @IsString() productId!: string;
  @Type(() => Number) @IsInt() @Min(1) quantity!: number;
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BookingUpsellDto)
  upsells?: BookingUpsellDto[];
}

class CreateBookingDto {
  @IsString() @MinLength(1) customerName!: string;
  @IsEmail() email!: string;
  @IsString() @MinLength(1) phone!: string;
  @IsString() address!: string;
  @IsString() zipCode!: string;
  @IsString() city!: string;
  @IsOptional() @IsString() country?: string;
  @IsString() startDate!: string;
  @IsString() endDate!: string;
  @IsOptional() @IsEnum(DeliveryType) deliveryType?: DeliveryType;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) deliveryFeeMinor?: number;
  @IsOptional() @IsString() customerId?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() internalNotes?: string;
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BookingItemDto)
  items!: BookingItemDto[];
}

class StatusDto {
  @IsString() @MinLength(1) statusKey!: string;
}

class NotesDto {
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() internalNotes?: string;
}

class ReturnDto {
  @IsOptional() @IsString() returnCondition?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) damageFeeMinor?: number;
  @IsOptional() @IsString() internalNotes?: string;
}

class RescheduleDto {
  @IsString() startDate!: string;
  @IsString() endDate!: string;
}

class DeleteDto {
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
    @Query("q") q?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("productId") productId?: string,
    @Query("deliveryType") deliveryType?: DeliveryType,
    @Query("includeDeleted") includeDeleted?: string,
    @Query("take") take?: string,
    @Query("skip") skip?: string,
  ) {
    return this.bookings.list({
      statusKey,
      q,
      from,
      to,
      productId,
      deliveryType,
      includeDeleted: includeDeleted === "true",
      take: take ? Number(take) : undefined,
      skip: skip ? Number(skip) : undefined,
    });
  }

  /** The signed-in shopper's own bookings. Scoped by token, never by a query parameter. */
  @Get("mine")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("customer")
  mine(@CurrentUser() user: JwtPayload) {
    return this.bookings.listForCustomer(user.sub);
  }

  @Get("mine/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("customer")
  mineOne(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.bookings.getForCustomer(id, user.sub);
  }

  @Get("calendar.ics")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("staff", "platform")
  @Header("Content-Type", "text/calendar; charset=utf-8")
  @Header("Content-Disposition", 'attachment; filename="rentora-bookings.ics"')
  ics(@Query("statusKey") statusKey?: string) {
    return this.bookings.toIcs({ statusKey });
  }

  @Get(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("staff", "platform")
  get(@Param("id") id: string) {
    return this.bookings.get(id);
  }

  @Get(":id/transitions")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("staff", "platform")
  transitions(@Param("id") id: string) {
    return this.bookings.allowedTransitions(id);
  }

  /**
   * Direct booking creation is staff-only. Storefront bookings go through /checkout, which
   * derives the cart and the customer from the caller rather than trusting the body.
   */
  @Post()
  @UseGuards(OptionalJwtAuthGuard)
  create(@CurrentUser() user: JwtPayload | undefined, @Body() body: CreateBookingDto) {
    if (user?.role !== "staff" && user?.role !== "platform") {
      throw new BadRequestException("Use /checkout/session to book from the storefront");
    }
    return this.bookings.create({ ...body, source: "MANUAL" });
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
  transition(@Param("id") id: string, @Body() body: StatusDto) {
    return this.bookings.transition(id, body.statusKey);
  }

  @Patch(":id/notes")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("staff", "platform")
  updateNotes(@Param("id") id: string, @Body() body: NotesDto) {
    return this.bookings.updateNotes(id, body);
  }

  @Patch(":id/return")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("staff", "platform")
  recordReturn(@Param("id") id: string, @Body() body: ReturnDto) {
    return this.bookings.recordReturn(id, body);
  }

  @Patch(":id/reschedule")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("staff", "platform")
  reschedule(@Param("id") id: string, @Body() body: RescheduleDto) {
    return this.bookings.reschedule(id, body.startDate, body.endDate);
  }

  @Post(":id/restore")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("staff", "platform")
  restore(@Param("id") id: string) {
    return this.bookings.restore(id);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("staff", "platform")
  remove(@Param("id") id: string, @Body() body: DeleteDto) {
    return this.bookings.softDelete(id, body?.reason);
  }
}
