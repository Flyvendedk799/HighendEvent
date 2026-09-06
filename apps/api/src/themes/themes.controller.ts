import { Body, Controller, Get, Param, Patch, UseGuards } from "@nestjs/common";
import { IsOptional, IsString } from "class-validator";
import { ThemesService } from "./themes.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";

class UpdateThemeDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() tokens?: unknown;
}

@Controller("themes")
export class ThemesController {
  constructor(private readonly themes: ThemesService) {}

  @Get()
  list() {
    return this.themes.list();
  }

  @Get("current")
  current() {
    return this.themes.getCurrent();
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("staff", "platform")
  update(@Param("id") id: string, @Body() body: UpdateThemeDto) {
    return this.themes.update(id, body);
  }
}
