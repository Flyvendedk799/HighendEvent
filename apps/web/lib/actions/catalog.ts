"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { serverDelete, serverPatch, serverPost } from "../server-api";
import type { Category, Product, UpsellProduct } from "../types";
import {
  assertCanWrite,
  bool,
  int,
  moneyMinor,
  optionalInt,
  optionalMoneyMinor,
  optionalStr,
  slugify,
  str,
  toActionState,
  type ActionState,
} from "./action-state";

function revalidateCatalog(productId?: string) {
  revalidatePath("/admin/products");
  revalidatePath("/admin/categories");
  revalidatePath("/catalog");
  revalidatePath("/home");
  if (productId) revalidatePath(`/admin/products/${productId}`);
}

// ------------------------------------------------------------------- Products

function productPayload(formData: FormData) {
  const name = str(formData, "name");
  return {
    name,
    slug: slugify(optionalStr(formData, "slug") ?? name),
    categoryId: str(formData, "categoryId"),
    description: optionalStr(formData, "description"),
    dailyPriceMinor: moneyMinor(formData, "dailyPrice"),
    weekendPriceMinor: optionalMoneyMinor(formData, "weekendPrice"),
    weekendPackageMinor: optionalMoneyMinor(formData, "weekendPackage"),
    depositMinor: moneyMinor(formData, "deposit"),
    stockQty: int(formData, "stockQty", 1),
    prepBufferDays: int(formData, "prepBufferDays", 0),
    cleanupBufferDays: int(formData, "cleanupBufferDays", 0),
    minRentalDays: int(formData, "minRentalDays", 1),
    maxRentalDays: optionalInt(formData, "maxRentalDays"),
    isActive: bool(formData, "isActive"),
  };
}

function validateProduct(payload: ReturnType<typeof productPayload>): Record<string, string> {
  const fieldErrors: Record<string, string> = {};

  if (!payload.name) fieldErrors.name = "Give the product a name.";
  if (!payload.slug) fieldErrors.slug = "The URL slug cannot be empty.";
  if (!payload.categoryId) fieldErrors.categoryId = "Choose a category.";
  if (payload.dailyPriceMinor <= 0) fieldErrors.dailyPrice = "Set a daily price above zero.";
  if (payload.stockQty < 1) fieldErrors.stockQty = "Stock must be at least 1.";
  if (payload.minRentalDays < 1) fieldErrors.minRentalDays = "Minimum rental is at least 1 day.";
  if (
    payload.maxRentalDays !== undefined &&
    payload.maxRentalDays < payload.minRentalDays
  ) {
    fieldErrors.maxRentalDays = "Maximum must be at least the minimum.";
  }

  return fieldErrors;
}

export async function createProductAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const denied = await assertCanWrite();
  if (denied) return denied;

  const payload = productPayload(formData);
  const fieldErrors = validateProduct(payload);
  if (Object.keys(fieldErrors).length) {
    return { error: "Fix the highlighted fields.", fieldErrors };
  }

  let product: Product;
  try {
    product = await serverPost<Product>("/catalog/products", payload);
  } catch (err) {
    return toActionState(err);
  }

  revalidateCatalog();
  redirect(`/admin/products/${product.id}?created=1`);
}

export async function updateProductAction(
  productId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const denied = await assertCanWrite();
  if (denied) return denied;

  const payload = productPayload(formData);
  const fieldErrors = validateProduct(payload);
  if (Object.keys(fieldErrors).length) {
    return { error: "Fix the highlighted fields.", fieldErrors };
  }

  try {
    await serverPatch(`/catalog/products/${productId}`, payload);
  } catch (err) {
    return toActionState(err);
  }

  revalidateCatalog(productId);
  return { ok: true };
}

export async function setProductActiveAction(
  productId: string,
  isActive: boolean,
): Promise<ActionState> {
  const denied = await assertCanWrite();
  if (denied) return denied;

  try {
    await serverPatch(`/catalog/products/${productId}`, { isActive });
  } catch (err) {
    return toActionState(err);
  }

  revalidateCatalog(productId);
  return { ok: true };
}

export async function duplicateProductAction(productId: string): Promise<ActionState> {
  const denied = await assertCanWrite();
  if (denied) return denied;

  let copy: Product;
  try {
    copy = await serverPost<Product>(`/catalog/products/${productId}/duplicate`);
  } catch (err) {
    return toActionState(err);
  }

  revalidateCatalog();
  redirect(`/admin/products/${copy.id}`);
}

export async function deleteProductAction(productId: string): Promise<ActionState> {
  const denied = await assertCanWrite();
  if (denied) return denied;

  try {
    await serverDelete(`/catalog/products/${productId}`);
  } catch (err) {
    return toActionState(err);
  }

  revalidateCatalog();
  redirect("/admin/products");
}

// ----------------------------------------------------------------- Categories

export async function saveCategoryAction(
  categoryId: string | null,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const denied = await assertCanWrite();
  if (denied) return denied;

  const name = str(formData, "name");
  if (!name) return { error: "Give the category a name.", fieldErrors: { name: "Required" } };

  const payload = {
    name,
    slug: slugify(optionalStr(formData, "slug") ?? name),
    description: optionalStr(formData, "description"),
    imageUrl: optionalStr(formData, "imageUrl"),
    isActive: bool(formData, "isActive"),
  };

  try {
    if (categoryId) {
      await serverPatch(`/catalog/categories/${categoryId}`, payload);
    } else {
      await serverPost<Category>("/catalog/categories", payload);
    }
  } catch (err) {
    return toActionState(err);
  }

  revalidateCatalog();
  return { ok: true };
}

export async function deleteCategoryAction(categoryId: string): Promise<ActionState> {
  const denied = await assertCanWrite();
  if (denied) return denied;

  try {
    await serverDelete(`/catalog/categories/${categoryId}`);
  } catch (err) {
    return toActionState(err);
  }

  revalidateCatalog();
  return { ok: true };
}

export async function reorderCategoriesAction(ids: string[]): Promise<ActionState> {
  const denied = await assertCanWrite();
  if (denied) return denied;

  try {
    await serverPatch("/catalog/categories/reorder", { ids });
  } catch (err) {
    return toActionState(err);
  }

  revalidateCatalog();
  return { ok: true };
}

// --------------------------------------------------------------------- Images

export async function addProductImageAction(
  productId: string,
  image: { url: string; alt: string },
): Promise<ActionState> {
  const denied = await assertCanWrite();
  if (denied) return denied;

  try {
    await serverPost(`/catalog/products/${productId}/images`, image);
  } catch (err) {
    return toActionState(err);
  }

  revalidateCatalog(productId);
  return { ok: true };
}

export async function updateProductImageAction(
  productId: string,
  imageId: string,
  data: { alt?: string; sortOrder?: number },
): Promise<ActionState> {
  const denied = await assertCanWrite();
  if (denied) return denied;

  try {
    await serverPatch(`/catalog/products/${productId}/images/${imageId}`, data);
  } catch (err) {
    return toActionState(err);
  }

  revalidateCatalog(productId);
  return { ok: true };
}

export async function setPrimaryImageAction(
  productId: string,
  imageId: string,
): Promise<ActionState> {
  const denied = await assertCanWrite();
  if (denied) return denied;

  try {
    await serverPost(`/catalog/products/${productId}/images/${imageId}/primary`);
  } catch (err) {
    return toActionState(err);
  }

  revalidateCatalog(productId);
  return { ok: true };
}

export async function deleteProductImageAction(
  productId: string,
  imageId: string,
): Promise<ActionState> {
  const denied = await assertCanWrite();
  if (denied) return denied;

  try {
    await serverDelete(`/catalog/products/${productId}/images/${imageId}`);
  } catch (err) {
    return toActionState(err);
  }

  revalidateCatalog(productId);
  return { ok: true };
}

// ------------------------------------------------------------------ Blackouts

export async function createBlackoutAction(
  productId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const denied = await assertCanWrite();
  if (denied) return denied;

  const startDate = str(formData, "startDate");
  const endDate = str(formData, "endDate");

  if (!startDate || !endDate) {
    return { error: "Pick a start and end date." };
  }
  if (endDate < startDate) {
    return { error: "The end date must be on or after the start date." };
  }

  try {
    await serverPost(`/catalog/products/${productId}/blackouts`, {
      startDate,
      endDate,
      reason: optionalStr(formData, "reason"),
    });
  } catch (err) {
    return toActionState(err);
  }

  revalidateCatalog(productId);
  return { ok: true };
}

export async function deleteBlackoutAction(
  productId: string,
  blackoutId: string,
): Promise<ActionState> {
  const denied = await assertCanWrite();
  if (denied) return denied;

  try {
    await serverDelete(`/catalog/products/${productId}/blackouts/${blackoutId}`);
  } catch (err) {
    return toActionState(err);
  }

  revalidateCatalog(productId);
  return { ok: true };
}

// -------------------------------------------------------------------- Upsells

export async function saveUpsellAction(
  upsellId: string | null,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const denied = await assertCanWrite();
  if (denied) return denied;

  const name = str(formData, "name");
  if (!name) return { error: "Give the upsell a name.", fieldErrors: { name: "Required" } };

  const payload = {
    name,
    slug: slugify(optionalStr(formData, "slug") ?? name),
    description: optionalStr(formData, "description"),
    priceMinor: moneyMinor(formData, "price"),
    stockQty: optionalInt(formData, "stockQty"),
    imageUrl: optionalStr(formData, "imageUrl"),
    isActive: bool(formData, "isActive"),
  };

  try {
    if (upsellId) {
      await serverPatch(`/catalog/upsells/${upsellId}`, payload);
    } else {
      await serverPost<UpsellProduct>("/catalog/upsells", payload);
    }
  } catch (err) {
    return toActionState(err);
  }

  revalidatePath("/admin/upsells");
  return { ok: true };
}

export async function deleteUpsellAction(upsellId: string): Promise<ActionState> {
  const denied = await assertCanWrite();
  if (denied) return denied;

  try {
    await serverDelete(`/catalog/upsells/${upsellId}`);
  } catch (err) {
    return toActionState(err);
  }

  revalidatePath("/admin/upsells");
  return { ok: true };
}

export async function linkUpsellAction(
  productId: string,
  upsellId: string,
): Promise<ActionState> {
  const denied = await assertCanWrite();
  if (denied) return denied;

  try {
    await serverPost(`/catalog/products/${productId}/upsells/${upsellId}`);
  } catch (err) {
    return toActionState(err);
  }

  revalidateCatalog(productId);
  return { ok: true };
}

export async function unlinkUpsellAction(
  productId: string,
  upsellId: string,
): Promise<ActionState> {
  const denied = await assertCanWrite();
  if (denied) return denied;

  try {
    await serverDelete(`/catalog/products/${productId}/upsells/${upsellId}`);
  } catch (err) {
    return toActionState(err);
  }

  revalidateCatalog(productId);
  return { ok: true };
}
