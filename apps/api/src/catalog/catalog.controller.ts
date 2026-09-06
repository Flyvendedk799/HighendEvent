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
import {
  IsInt,
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
}

class ProductDto {
  @IsString() categoryId!: string;
  @IsString() @MinLength(1) name!: string;
  @IsString() @MinLength(1) slug!: string;
  @IsOptional() @IsString() description?: string;
  @Type(() => Number) @IsInt() @Min(0) dailyPriceMinor!: number;
  @IsOptional() @Type(() => Number) @IsInt() weekendPriceMinor?: number;
  @IsOptional() @Type(() => Number) @IsInt() weekendPackageMinor?: number;
  @IsOptional() @Type(() => Number) @IsInt() depositMinor?: number;
  @IsOptional() @IsString() currency?: string;
  @IsOptional() @Type(() => Number) @IsInt() stockQty?: number;
  @IsOptional() @Type(() => Number) @IsInt() prepBufferDays?: number;
  @IsOptional() @Type(() => Number) @IsInt() cleanupBufferDays?: number;
  @IsOptional() @Type(() => Number) @IsInt() minRentalDays?: number;
  @IsOptional() @Type(() => Number) @IsInt() maxRentalDays?: number;
  @IsOptional() @IsString() heroImageUrl?: string;
}

class ImageDto {
  @IsString() url!: string;
  @IsString() alt!: string;
  @IsOptional() @Type(() => Number) @IsInt() sortOrder?: number;
}

class UpsellDto {
  @IsString() name!: string;
  @IsString() slug!: string;
  @Type(() => Number) @IsInt() @Min(0) priceMinor!: number;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() categoryId?: string;
  @IsOptional() @IsString() currency?: string;
  @IsOptional() @Type(() => Number) @IsInt() stockQty?: number;
  @IsOptional() @IsString() imageUrl?: string;
}

class BlackoutDto {
  @IsString() startDate!: string;
  @IsString() endDate!: string;
  @IsOptional() @IsString() reason?: string;
}

@Controller("catalog")
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get("categories")
  listCategories() {
    return this.catalog.listCategories();
  }

  @Post("categories")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("staff", "platform")
  createCategory(@Body() body: CategoryDto) {
    return this.catalog.createCategory(body);
  }

  @Patch("categories/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("staff", "platform")
  updateCategory(@Param("id") id: string, @Body() body: Partial<CategoryDto>) {
    return this.catalog.updateCategory(id, body);
  }

  @Delete("categories/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("staff", "platform")
  deleteCategory(@Param("id") id: string) {
    return this.catalog.deleteCategory(id);
  }

  @Get("products")
  listProducts() {
    return this.catalog.listProducts();
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

  @Patch("products/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("staff", "platform")
  updateProduct(@Param("id") id: string, @Body() body: Partial<ProductDto>) {
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
  updateUpsell(@Param("id") id: string, @Body() body: Partial<UpsellDto>) {
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
