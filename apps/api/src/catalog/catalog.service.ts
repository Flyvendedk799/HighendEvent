import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { requireTenantId } from "../common/tenant.util";
import { assertProductLimit } from "../common/plan-limits";

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  // Categories
  listCategories(tenantId?: string) {
    const tid = requireTenantId(tenantId);
    return this.prisma.category.findMany({
      where: { tenantId: tid },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
  }

  createCategory(data: {
    name: string;
    slug: string;
    description?: string;
    imageUrl?: string;
    sortOrder?: number;
  }) {
    const tenantId = requireTenantId();
    return this.prisma.category.create({ data: { tenantId, ...data } });
  }

  async updateCategory(id: string, data: Record<string, unknown>) {
    const tenantId = requireTenantId();
    await this.ensureCategory(tenantId, id);
    return this.prisma.category.update({ where: { id }, data });
  }

  async deleteCategory(id: string) {
    const tenantId = requireTenantId();
    await this.ensureCategory(tenantId, id);
    return this.prisma.category.delete({ where: { id } });
  }

  // Products
  listProducts(tenantId?: string) {
    const tid = requireTenantId(tenantId);
    return this.prisma.product.findMany({
      where: { tenantId: tid },
      include: { category: true, images: { orderBy: { sortOrder: "asc" } } },
      orderBy: { name: "asc" },
    });
  }

  async getProduct(id: string) {
    const tenantId = requireTenantId();
    const product = await this.prisma.product.findFirst({
      where: { id, tenantId },
      include: {
        category: true,
        images: { orderBy: { sortOrder: "asc" } },
        blackouts: true,
        upsells: { include: { upsellProduct: true } },
      },
    });
    if (!product) throw new NotFoundException("Product not found");
    return product;
  }

  async getProductBySlug(slug: string) {
    const tenantId = requireTenantId();
    const product = await this.prisma.product.findFirst({
      where: { slug, tenantId },
      include: {
        category: true,
        images: { orderBy: { sortOrder: "asc" } },
        blackouts: true,
        upsells: { include: { upsellProduct: true } },
      },
    });
    if (!product) throw new NotFoundException("Product not found");
    return product;
  }

  async createProduct(data: {
    categoryId: string;
    name: string;
    slug: string;
    description?: string;
    dailyPriceMinor: number;
    weekendPriceMinor?: number;
    weekendPackageMinor?: number;
    depositMinor?: number;
    currency?: string;
    stockQty?: number;
    prepBufferDays?: number;
    cleanupBufferDays?: number;
    minRentalDays?: number;
    maxRentalDays?: number;
    heroImageUrl?: string;
  }) {
    const tenantId = requireTenantId();
    await assertProductLimit(this.prisma, tenantId);
    return this.prisma.product.create({ data: { tenantId, ...data } });
  }

  async updateProduct(id: string, data: Record<string, unknown>) {
    await this.getProduct(id);
    return this.prisma.product.update({ where: { id }, data });
  }

  async deleteProduct(id: string) {
    await this.getProduct(id);
    return this.prisma.product.delete({ where: { id } });
  }

  // Images
  async addImage(productId: string, data: { url: string; alt: string; sortOrder?: number }) {
    await this.getProduct(productId);
    return this.prisma.productImage.create({ data: { productId, ...data } });
  }

  async deleteImage(productId: string, imageId: string) {
    await this.getProduct(productId);
    const image = await this.prisma.productImage.findFirst({
      where: { id: imageId, productId },
    });
    if (!image) throw new NotFoundException("Image not found");
    return this.prisma.productImage.delete({ where: { id: imageId } });
  }

  // Upsells
  listUpsells() {
    const tenantId = requireTenantId();
    return this.prisma.upsellProduct.findMany({
      where: { tenantId },
      orderBy: { name: "asc" },
    });
  }

  createUpsell(data: {
    name: string;
    slug: string;
    priceMinor: number;
    description?: string;
    categoryId?: string;
    currency?: string;
    stockQty?: number;
    imageUrl?: string;
  }) {
    const tenantId = requireTenantId();
    return this.prisma.upsellProduct.create({ data: { tenantId, ...data } });
  }

  async updateUpsell(id: string, data: Record<string, unknown>) {
    const tenantId = requireTenantId();
    const upsell = await this.prisma.upsellProduct.findFirst({ where: { id, tenantId } });
    if (!upsell) throw new NotFoundException("Upsell not found");
    return this.prisma.upsellProduct.update({ where: { id }, data });
  }

  async deleteUpsell(id: string) {
    const tenantId = requireTenantId();
    const upsell = await this.prisma.upsellProduct.findFirst({ where: { id, tenantId } });
    if (!upsell) throw new NotFoundException("Upsell not found");
    return this.prisma.upsellProduct.delete({ where: { id } });
  }

  async linkUpsell(productId: string, upsellProductId: string, sortOrder = 0) {
    await this.getProduct(productId);
    const tenantId = requireTenantId();
    const upsell = await this.prisma.upsellProduct.findFirst({
      where: { id: upsellProductId, tenantId },
    });
    if (!upsell) throw new NotFoundException("Upsell not found");
    return this.prisma.productUpsell.create({
      data: { productId, upsellProductId, sortOrder },
    });
  }

  // Blackouts
  async listBlackouts(productId: string) {
    await this.getProduct(productId);
    return this.prisma.blackoutDate.findMany({
      where: { productId },
      orderBy: { startDate: "asc" },
    });
  }

  async createBlackout(
    productId: string,
    data: { startDate: string; endDate: string; reason?: string },
  ) {
    await this.getProduct(productId);
    if (data.endDate < data.startDate) {
      throw new BadRequestException("endDate must be on or after startDate");
    }
    return this.prisma.blackoutDate.create({
      data: {
        productId,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        reason: data.reason,
      },
    });
  }

  async deleteBlackout(productId: string, blackoutId: string) {
    await this.getProduct(productId);
    const blackout = await this.prisma.blackoutDate.findFirst({
      where: { id: blackoutId, productId },
    });
    if (!blackout) throw new NotFoundException("Blackout not found");
    return this.prisma.blackoutDate.delete({ where: { id: blackoutId } });
  }

  private async ensureCategory(tenantId: string, id: string) {
    const cat = await this.prisma.category.findFirst({ where: { id, tenantId } });
    if (!cat) throw new NotFoundException("Category not found");
    return cat;
  }
}
