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
import {
  IsBoolean,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from "class-validator";
import { Type } from "class-transformer";
import { CatalogService } from "./catalog.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";

class CategoryDto {
  @IsString() @MinLength(1) name!: string;
  @IsString() @MinLength(1) slug!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() imageUrl?: string;
  @IsOptional() @Type(() => Number) @IsInt() sortOrder?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

/**
 * PATCH bodies need their own DTO: `Partial<CategoryDto>` only relaxes the TypeScript type, not
 * the class-validator decorators, so a partial update against the create DTO is rejected.
 */
class UpdateCategoryDto {
  @IsOptional() @IsString() @MinLength(1) name?: string;
  @IsOptional() @IsString() @MinLength(1) slug?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() imageUrl?: string;
  @IsOptional() @Type(() => Number) @IsInt() sortOrder?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

class ProductDto {
  @IsString() categoryId!: string;
  @IsString() @MinLength(1) name!: string;
  @IsString() @MinLength(1) slug!: string;
  @IsOptional() @IsString() description?: string;
  @Type(() => Number) @IsInt() @Min(0) dailyPriceMinor!: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) weekendPriceMinor?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) weekendPackageMinor?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) depositMinor?: number;
  @IsOptional() @IsString() currency?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) stockQty?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) prepBufferDays?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) cleanupBufferDays?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) minRentalDays?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) maxRentalDays?: number;
  @IsOptional() @IsString() heroImageUrl?: string;
  @IsOptional() @IsObject() attributes?: Record<string, unknown>;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

class UpdateProductDto {
  @IsOptional() @IsString() categoryId?: string;
  @IsOptional() @IsString() @MinLength(1) name?: string;
  @IsOptional() @IsString() @MinLength(1) slug?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) dailyPriceMinor?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) weekendPriceMinor?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) weekendPackageMinor?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) depositMinor?: number;
  @IsOptional() @IsString() currency?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) stockQty?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) prepBufferDays?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) cleanupBufferDays?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) minRentalDays?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) maxRentalDays?: number;
  @IsOptional() @IsString() heroImageUrl?: string;
  @IsOptional() @IsObject() attributes?: Record<string, unknown>;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

class ImageDto {
  @IsString() url!: string;
  @IsString() alt!: string;
  @IsOptional() @Type(() => Number) @IsInt() sortOrder?: number;
}

class UpdateImageDto {
  @IsOptional() @IsString() alt?: string;
  @IsOptional() @Type(() => Number) @IsInt() sortOrder?: number;
}

class UpsellDto {
  @IsString() @MinLength(1) name!: string;
  @IsString() @MinLength(1) slug!: string;
  @Type(() => Number) @IsInt() @Min(0) priceMinor!: number;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() categoryId?: string;
  @IsOptional() @IsString() currency?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) stockQty?: number;
  @IsOptional() @IsString() imageUrl?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

class UpdateUpsellDto {
  @IsOptional() @IsString() @MinLength(1) name?: string;
  @IsOptional() @IsString() @MinLength(1) slug?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) priceMinor?: number;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() categoryId?: string;
  @IsOptional() @IsString() currency?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) stockQty?: number;
  @IsOptional() @IsString() imageUrl?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

class BlackoutDto {
  @IsString() startDate!: string;
  @IsString() endDate!: string;
  @IsOptional() @IsString() reason?: string;
}

class ProductQueryDto {
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsString() categoryId?: string;
  @IsOptional() @IsString() categorySlug?: string;
  /** Staff-only. Public storefront reads never see archived inventory. */
  @IsOptional() @IsString() includeInactive?: string;
}

@Controller("catalog")
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get("categories")
  listCategories(@Query("includeInactive") includeInactive?: string) {
    return this.catalog.listCategories({ includeInactive: includeInactive === "true" });
  }

  @Post("categories")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("staff", "platform")
  createCategory(@Body() body: CategoryDto) {
    return this.catalog.createCategory(body);
  }

  @Patch("categories/reorder")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("staff", "platform")
  reorderCategories(@Body() body: { ids: string[] }) {
    return this.catalog.reorderCategories(body.ids ?? []);
  }

  @Patch("categories/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("staff", "platform")
  updateCategory(@Param("id") id: string, @Body() body: UpdateCategoryDto) {
    return this.catalog.updateCategory(id, body);
  }

  @Delete("categories/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("staff", "platform")
  deleteCategory(@Param("id") id: string) {
    return this.catalog.deleteCategory(id);
  }

  @Get("products")
  listProducts(@Query() query: ProductQueryDto) {
    return this.catalog.listProducts({
      q: query.q,
      categoryId: query.categoryId,
      categorySlug: query.categorySlug,
      includeInactive: query.includeInactive === "true",
    });
  }

  @Get("products/by-slug/:slug")
  getProductBySlug(@Param("slug") slug: string) {
    return this.catalog.getProductBySlug(slug);
  }

  @Get("products/:id")
  getProduct(@Param("id") id: string) {
    return this.catalog.getProduct(id);
  }

  @Post("products")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("staff", "platform")
  createProduct(@Body() body: ProductDto) {
    return this.catalog.createProduct(body);
  }

  @Post("products/:id/duplicate")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("staff", "platform")
  duplicateProduct(@Param("id") id: string) {
    return this.catalog.duplicateProduct(id);
  }

  @Patch("products/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("staff", "platform")
  updateProduct(@Param("id") id: string, @Body() body: UpdateProductDto) {
    return this.catalog.updateProduct(id, body);
  }

  @Delete("products/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("staff", "platform")
  deleteProduct(@Param("id") id: string) {
    return this.catalog.deleteProduct(id);
  }

  @Post("products/:id/images")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("staff", "platform")
  addImage(@Param("id") id: string, @Body() body: ImageDto) {
    return this.catalog.addImage(id, body);
  }

  @Patch("products/:productId/images/:imageId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("staff", "platform")
  updateImage(
    @Param("productId") productId: string,
    @Param("imageId") imageId: string,
    @Body() body: UpdateImageDto,
  ) {
    return this.catalog.updateImage(productId, imageId, body);
  }

  @Post("products/:productId/images/:imageId/primary")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("staff", "platform")
  setPrimaryImage(@Param("productId") productId: string, @Param("imageId") imageId: string) {
    return this.catalog.setPrimaryImage(productId, imageId);
  }

  @Delete("products/:productId/images/:imageId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("staff", "platform")
  deleteImage(@Param("productId") productId: string, @Param("imageId") imageId: string) {
    return this.catalog.deleteImage(productId, imageId);
  }

  @Get("upsells")
  listUpsells() {
    return this.catalog.listUpsells();
  }

  @Post("upsells")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("staff", "platform")
  createUpsell(@Body() body: UpsellDto) {
    return this.catalog.createUpsell(body);
  }

  @Patch("upsells/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("staff", "platform")
  updateUpsell(@Param("id") id: string, @Body() body: UpdateUpsellDto) {
    return this.catalog.updateUpsell(id, body);
  }

  @Delete("upsells/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("staff", "platform")
  deleteUpsell(@Param("id") id: string) {
    return this.catalog.deleteUpsell(id);
  }

  @Post("products/:id/upsells/:upsellId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("staff", "platform")
  linkUpsell(@Param("id") id: string, @Param("upsellId") upsellId: string) {
    return this.catalog.linkUpsell(id, upsellId);
  }

  @Delete("products/:id/upsells/:upsellId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("staff", "platform")
  unlinkUpsell(@Param("id") id: string, @Param("upsellId") upsellId: string) {
    return this.catalog.unlinkUpsell(id, upsellId);
  }

  @Get("products/:id/blackouts")
  listBlackouts(@Param("id") id: string) {
    return this.catalog.listBlackouts(id);
  }

  @Post("products/:id/blackouts")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("staff", "platform")
  createBlackout(@Param("id") id: string, @Body() body: BlackoutDto) {
    return this.catalog.createBlackout(id, body);
  }

  @Delete("products/:productId/blackouts/:blackoutId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("staff", "platform")
  deleteBlackout(
    @Param("productId") productId: string,
    @Param("blackoutId") blackoutId: string,
  ) {
    return this.catalog.deleteBlackout(productId, blackoutId);
  }
}
