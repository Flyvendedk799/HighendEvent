import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { IsString, MinLength } from "class-validator";
import { DeveloperService } from "./developer.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";

class CreateKeyDto {
  @IsString()
  @MinLength(1)
  name!: string;
}

@Controller("developer")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("staff", "platform")
export class DeveloperController {
  constructor(private readonly developer: DeveloperService) {}

  @Get("api-keys")
  listKeys() {
    return this.developer.listKeys();
  }

  @Post("api-keys")
  createKey(@Body() body: CreateKeyDto) {
    return this.developer.createKey(body.name);
  }

  @Delete("api-keys/:id")
  revokeKey(@Param("id") id: string) {
    return this.developer.revokeKey(id);
  }
}
