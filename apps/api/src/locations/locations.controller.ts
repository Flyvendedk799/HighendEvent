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
import { IsBoolean, IsNumber, IsOptional, IsString, MinLength } from "class-validator";
import { Type } from "class-transformer";
import { LocationsService } from "./locations.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";

class LocationDto {
  @IsString() @MinLength(1) name!: string;
  @IsString() address!: string;
  @IsString() zipCode!: string;
  @IsString() city!: string;
  @IsOptional() @IsString() country?: string;
  @IsOptional() @Type(() => Number) @IsNumber() latitude?: number;
  @IsOptional() @Type(() => Number) @IsNumber() longitude?: number;
  @IsOptional() @IsBoolean() isPrimary?: boolean;
}

@Controller("locations")
export class LocationsController {
  constructor(private readonly locations: LocationsService) {}

  @Get()
  list() {
    return this.locations.list();
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.locations.get(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("staff", "platform")
  create(@Body() body: LocationDto) {
    return this.locations.create(body);
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("staff", "platform")
  update(@Param("id") id: string, @Body() body: Partial<LocationDto>) {
    return this.locations.update(id, body);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("staff", "platform")
  remove(@Param("id") id: string) {
    return this.locations.remove(id);
  }
}
