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
import { OptionalJwtAuthGuard } from "../auth/optional-jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { CurrentUser } from "../auth/current-user.decorator";
import type { JwtPayload } from "../auth/password";

class PageDto {
  @IsString() @MinLength(1) slug!: string;
  @IsString() @MinLength(1) title!: string;
  @IsOptional() @IsString() locale?: string;
  @IsOptional() sections?: unknown;
  @IsOptional() @IsString() seoTitle?: string;
  @IsOptional() @IsString() seoDescription?: string;
  @IsOptional() @IsBoolean() isPublished?: boolean;
}

class UpdatePageDto {
  @IsOptional() @IsString() @MinLength(1) slug?: string;
  @IsOptional() @IsString() @MinLength(1) title?: string;
  @IsOptional() @IsString() locale?: string;
  @IsOptional() sections?: unknown;
  @IsOptional() @IsString() seoTitle?: string;
  @IsOptional() @IsString() seoDescription?: string;
  @IsOptional() @IsBoolean() isPublished?: boolean;
}

/** Staff see drafts; the public only ever sees published pages. */
function canSeeDrafts(user: JwtPayload | undefined): boolean {
  return user?.role === "staff" || user?.role === "platform";
}

@Controller("cms")
export class CmsController {
  constructor(private readonly cms: CmsService) {}

  @Get("pages")
  @UseGuards(OptionalJwtAuthGuard)
  list(@CurrentUser() user: JwtPayload | undefined, @Query("locale") locale?: string) {
    return this.cms.list({ locale, includeDrafts: canSeeDrafts(user) });
  }

  @Get("pages/by-slug/:slug")
  @UseGuards(OptionalJwtAuthGuard)
  getBySlug(
    @CurrentUser() user: JwtPayload | undefined,
    @Param("slug") slug: string,
    @Query("locale") locale?: string,
  ) {
    return this.cms.getBySlug(slug, { locale, includeDrafts: canSeeDrafts(user) });
  }

  @Get("pages/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("staff", "platform")
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
  update(@Param("id") id: string, @Body() body: UpdatePageDto) {
    return this.cms.update(id, body);
  }

  @Delete("pages/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("staff", "platform")
  remove(@Param("id") id: string) {
    return this.cms.remove(id);
  }
}
