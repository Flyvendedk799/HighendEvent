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
import { IsBoolean, IsOptional, IsString, MinLength } from "class-validator";
import { CmsService } from "./cms.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";

class PageDto {
  @IsString() @MinLength(1) slug!: string;
  @IsString() @MinLength(1) title!: string;
  @IsOptional() @IsString() locale?: string;
  @IsOptional() sections?: unknown;
  @IsOptional() @IsString() seoTitle?: string;
  @IsOptional() @IsString() seoDescription?: string;
  @IsOptional() @IsBoolean() isPublished?: boolean;
}

@Controller("cms")
export class CmsController {
  constructor(private readonly cms: CmsService) {}

  @Get("pages")
  list(@Query("locale") locale?: string) {
    return this.cms.list(locale);
  }

  @Get("pages/by-slug/:slug")
  bySlug(@Param("slug") slug: string, @Query("locale") locale?: string) {
    return this.cms.getBySlug(slug, locale ?? "en");
  }

  @Get("pages/:id")
  get(@Param("id") id: string) {
    return this.cms.get(id);
  }

  @Post("pages")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("staff", "platform")
  create(@Body() body: PageDto) {
    return this.cms.create(body);
  }

  @Patch("pages/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("staff", "platform")
  update(@Param("id") id: string, @Body() body: Partial<PageDto>) {
    return this.cms.update(id, body);
  }

  @Delete("pages/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("staff", "platform")
  remove(@Param("id") id: string) {
    return this.cms.remove(id);
  }
}
