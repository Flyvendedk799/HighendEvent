import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { requireTenantId } from "../common/tenant.util";

export type CategoryInput = {
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  sortOrder?: number;
  isActive?: boolean;
};

export type ProductInput = {
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
  attributes?: Record<string, unknown>;
  isActive?: boolean;
};

export type UpsellInput = {
  name: string;
  slug: string;
  priceMinor: number;
  description?: string;
  categoryId?: string;
  currency?: string;
  stockQty?: number;
  imageUrl?: string;
  isActive?: boolean;
};

export type ProductListFilters = {
  q?: string;
  categoryId?: string;
  categorySlug?: string;
  /** Only staff callers pass this; the storefront never sees archived inventory. */
  includeInactive?: boolean;
};

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------- Categories

  listCategories(options: { includeInactive?: boolean } = {}, tenantId?: string) {
    const tid = requireTenantId(tenantId);
    return this.prisma.category.findMany({
      where: { tenantId: tid, isActive: options.includeInactive ? undefined : true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: { _count: { select: { products: true } } },
    });
  }

  async createCategory(data: CategoryInput) {
    const tenantId = requireTenantId();
    await this.assertUniqueCategorySlug(tenantId, data.slug);
    return this.prisma.category.create({ data: { tenantId, ...data } });
  }

  async updateCategory(id: string, data: Partial<CategoryInput>) {
    const tenantId = requireTenantId();
    await this.ensureCategory(tenantId, id);
    if (typeof data.slug === "string") {
      await this.assertUniqueCategorySlug(tenantId, data.slug, id);
    }
    return this.prisma.category.update({ where: { id }, data });
  }

  async reorderCategories(ids: string[]) {
    const tenantId = requireTenantId();
    const owned = await this.prisma.category.findMany({
      where: { tenantId, id: { in: ids } },
      select: { id: true },
    });
    if (owned.length !== ids.length) {
      throw new BadRequestException("One or more categories do not belong to this tenant");
    }
    await this.prisma.$transaction(
      ids.map((id, sortOrder) =>
        this.prisma.category.update({ where: { id }, data: { sortOrder } }),
      ),
    );
    return this.listCategories({ includeInactive: true });
  }

  async deleteCategory(id: string) {
    const tenantId = requireTenantId();
    await this.ensureCategory(tenantId, id);

    const productCount = await this.prisma.product.count({ where: { categoryId: id } });
    if (productCount > 0) {
      throw new ConflictException(
        `Move or delete the ${productCount} product(s) in this category first`,
      );
    }
    return this.prisma.category.delete({ where: { id } });
  }

  // ------------------------------------------------------------------ Products

  async listProducts(filters: ProductListFilters = {}, tenantId?: string) {
    const tid = requireTenantId(tenantId);

    const where: Prisma.ProductWhereInput = {
      tenantId: tid,
      isActive: filters.includeInactive ? undefined : true,
      categoryId: filters.categoryId,
      category: filters.categorySlug ? { slug: filters.categorySlug } : undefined,
    };

    if (filters.q?.trim()) {
      const q = filters.q.trim();
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { slug: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
      ];
    }

    return this.prisma.product.findMany({
      where,
      include: { category: true, images: { orderBy: { sortOrder: "asc" } } },
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
    });
  }

  async getProduct(id: string) {
    const tenantId = requireTenantId();
    const product = await this.prisma.product.findFirst({
      where: { id, tenantId },
      include: this.productDetailInclude(),
    });
    if (!product) throw new NotFoundException("Product not found");
    return product;
  }

  async getProductBySlug(slug: string) {
    const tenantId = requireTenantId();
    const product = await this.prisma.product.findFirst({
      where: { slug, tenantId },
      include: this.productDetailInclude(),
    });
    if (!product) throw new NotFoundException("Product not found");
    return product;
  }

  async createProduct(data: ProductInput) {
    const tenantId = requireTenantId();
    await this.ensureCategory(tenantId, data.categoryId);
    await this.assertUniqueProductSlug(tenantId, data.slug);

    const { attributes, ...rest } = data;
    return this.prisma.product.create({
      data: {
        ...rest,
        tenantId,
        ...(attributes ? { attributes: attributes as Prisma.InputJsonObject } : {}),
      },
    });
  }

  async updateProduct(id: string, data: Partial<ProductInput>) {
    const tenantId = requireTenantId();
    await this.getProduct(id);

    if (typeof data.categoryId === "string") {
      await this.ensureCategory(tenantId, data.categoryId);
    }
    if (typeof data.slug === "string") {
      await this.assertUniqueProductSlug(tenantId, data.slug, id);
    }

    const { attributes, ...rest } = data;
    return this.prisma.product.update({
      where: { id },
      data: {
        ...rest,
        ...(attributes ? { attributes: attributes as Prisma.InputJsonObject } : {}),
      },
    });
  }

  /** Copies a product and its images so a tenant can build a variant without retyping it. */
  async duplicateProduct(id: string) {
    const tenantId = requireTenantId();
    const source = await this.getProduct(id);

    const slug = await this.nextAvailableSlug(tenantId, source.slug);

    return this.prisma.product.create({
      data: {
        tenantId,
        categoryId: source.categoryId,
        name: `${source.name} (copy)`,
        slug,
        description: source.description,
        dailyPriceMinor: source.dailyPriceMinor,
        weekendPriceMinor: source.weekendPriceMinor,
        weekendPackageMinor: source.weekendPackageMinor,
        depositMinor: source.depositMinor,
        currency: source.currency,
        stockQty: source.stockQty,
        prepBufferDays: source.prepBufferDays,
        cleanupBufferDays: source.cleanupBufferDays,
        minRentalDays: source.minRentalDays,
        maxRentalDays: source.maxRentalDays,
        heroImageUrl: source.heroImageUrl,
        attributes: source.attributes as Prisma.InputJsonValue,
        // A copy starts unpublished so it cannot appear on the storefront half-edited.
        isActive: false,
        images: {
          create: source.images.map((image) => ({
            url: image.url,
            alt: image.alt,
            sortOrder: image.sortOrder,
          })),
        },
      },
      include: { images: true },
    });
  }

  /**
   * Products referenced by a booking are archived rather than deleted, because deleting one
   * would destroy the history of what a customer actually rented.
   */
  async deleteProduct(id: string) {
    await this.getProduct(id);

    const bookingItems = await this.prisma.bookingItem.count({ where: { productId: id } });
    if (bookingItems > 0) {
      return this.prisma.product.update({
        where: { id },
        data: { isActive: false },
      });
    }

    return this.prisma.product.delete({ where: { id } });
  }

  // -------------------------------------------------------------------- Images

  async addImage(productId: string, data: { url: string; alt: string; sortOrder?: number }) {
    const product = await this.getProduct(productId);

    const image = await this.prisma.productImage.create({
      data: {
        productId,
        ...data,
        sortOrder: data.sortOrder ?? product.images.length,
      },
    });

    // The first image uploaded becomes the hero, so a product is never listed without art.
    if (!product.heroImageUrl) {
      await this.prisma.product.update({
        where: { id: productId },
        data: { heroImageUrl: image.url },
      });
    }

    return image;
  }

  async updateImage(
    productId: string,
    imageId: string,
    data: { alt?: string; sortOrder?: number },
  ) {
    await this.getProduct(productId);
    const image = await this.prisma.productImage.findFirst({
      where: { id: imageId, productId },
    });
    if (!image) throw new NotFoundException("Image not found");
    return this.prisma.productImage.update({ where: { id: imageId }, data });
  }

  async setPrimaryImage(productId: string, imageId: string) {
    await this.getProduct(productId);
    const image = await this.prisma.productImage.findFirst({
      where: { id: imageId, productId },
    });
    if (!image) throw new NotFoundException("Image not found");

    const others = await this.prisma.productImage.findMany({
      where: { productId, id: { not: imageId } },
      orderBy: { sortOrder: "asc" },
    });

    await this.prisma.$transaction([
      this.prisma.productImage.update({ where: { id: imageId }, data: { sortOrder: 0 } }),
      ...others.map((other, i) =>
        this.prisma.productImage.update({ where: { id: other.id }, data: { sortOrder: i + 1 } }),
      ),
      this.prisma.product.update({
        where: { id: productId },
        data: { heroImageUrl: image.url },
      }),
    ]);

    return this.getProduct(productId);
  }

  async deleteImage(productId: string, imageId: string) {
    const product = await this.getProduct(productId);
    const image = await this.prisma.productImage.findFirst({
      where: { id: imageId, productId },
    });
    if (!image) throw new NotFoundException("Image not found");

    await this.prisma.productImage.delete({ where: { id: imageId } });

    if (product.heroImageUrl === image.url) {
      const next = await this.prisma.productImage.findFirst({
        where: { productId },
        orderBy: { sortOrder: "asc" },
      });
      await this.prisma.product.update({
        where: { id: productId },
        data: { heroImageUrl: next?.url ?? null },
      });
    }

    return { ok: true };
  }

  // ------------------------------------------------------------------- Upsells

  listUpsells() {
    const tenantId = requireTenantId();
    return this.prisma.upsellProduct.findMany({
      where: { tenantId },
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
    });
  }

  async createUpsell(data: UpsellInput) {
    const tenantId = requireTenantId();
    const existing = await this.prisma.upsellProduct.findUnique({
      where: { tenantId_slug: { tenantId, slug: data.slug } },
    });
    if (existing) throw new ConflictException(`An upsell with slug ${data.slug} already exists`);
    return this.prisma.upsellProduct.create({
      data: { ...data, tenantId },
    });
  }

  async updateUpsell(id: string, data: Partial<UpsellInput>) {
    const tenantId = requireTenantId();
    const upsell = await this.prisma.upsellProduct.findFirst({ where: { id, tenantId } });
    if (!upsell) throw new NotFoundException("Upsell not found");
    return this.prisma.upsellProduct.update({ where: { id }, data });
  }

  async deleteUpsell(id: string) {
    const tenantId = requireTenantId();
    const upsell = await this.prisma.upsellProduct.findFirst({ where: { id, tenantId } });
    if (!upsell) throw new NotFoundException("Upsell not found");

    const used = await this.prisma.bookingUpsellItem.count({ where: { upsellProductId: id } });
    if (used > 0) {
      return this.prisma.upsellProduct.update({ where: { id }, data: { isActive: false } });
    }
    return this.prisma.upsellProduct.delete({ where: { id } });
  }

  async linkUpsell(productId: string, upsellProductId: string) {
    await this.getProduct(productId);
    const tenantId = requireTenantId();
    const upsell = await this.prisma.upsellProduct.findFirst({
      where: { id: upsellProductId, tenantId },
    });
    if (!upsell) throw new NotFoundException("Upsell not found");

    const count = await this.prisma.productUpsell.count({ where: { productId } });

    return this.prisma.productUpsell.upsert({
      where: { productId_upsellProductId: { productId, upsellProductId } },
      update: {},
      create: { productId, upsellProductId, sortOrder: count },
    });
  }

  async unlinkUpsell(productId: string, upsellProductId: string) {
    await this.getProduct(productId);
    await this.prisma.productUpsell.deleteMany({ where: { productId, upsellProductId } });
    return { ok: true };
  }

  // ----------------------------------------------------------------- Blackouts

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

  // ------------------------------------------------------------------ Internals

  private productDetailInclude() {
    return {
      category: true,
      images: { orderBy: { sortOrder: "asc" } },
      blackouts: { orderBy: { startDate: "asc" } },
      upsells: { include: { upsellProduct: true }, orderBy: { sortOrder: "asc" } },
    } satisfies Prisma.ProductInclude;
  }

  private async ensureCategory(tenantId: string, id: string) {
    const cat = await this.prisma.category.findFirst({ where: { id, tenantId } });
    if (!cat) throw new NotFoundException("Category not found");
    return cat;
  }

  private async assertUniqueCategorySlug(tenantId: string, slug: string, exceptId?: string) {
    const existing = await this.prisma.category.findUnique({
      where: { tenantId_slug: { tenantId, slug } },
    });
    if (existing && existing.id !== exceptId) {
      throw new ConflictException(`A category with slug ${slug} already exists`);
    }
  }

  private async assertUniqueProductSlug(tenantId: string, slug: string, exceptId?: string) {
    const existing = await this.prisma.product.findUnique({
      where: { tenantId_slug: { tenantId, slug } },
    });
    if (existing && existing.id !== exceptId) {
      throw new ConflictException(`A product with slug ${slug} already exists`);
    }
  }

  private async nextAvailableSlug(tenantId: string, base: string): Promise<string> {
    for (let i = 2; i < 100; i += 1) {
      const candidate = `${base}-${i}`;
      const clash = await this.prisma.product.findUnique({
        where: { tenantId_slug: { tenantId, slug: candidate } },
      });
      if (!clash) return candidate;
    }
    return `${base}-${Date.now()}`;
  }
}
