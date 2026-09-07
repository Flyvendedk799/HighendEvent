"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { serverDelete, serverGet, serverPatch, serverPost } from "../server-api";
import {
  assertCanWrite,
  optionalStr,
  slugify,
  toActionState,
  type ActionState,
} from "./action-state";
import type { Section } from "@/components/storefront/page-sections";

export type CmsPage = {
  id: string;
  slug: string;
  title: string;
  locale: string;
  sections: Section[];
  seoTitle: string | null;
  seoDescription: string | null;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
};

function revalidateCms(slug?: string) {
  revalidateTag("storefront-bootstrap");
  revalidatePath("/admin/cms");
  revalidatePath("/", "layout");
  if (slug) revalidatePath(`/pages/${slug}`);
}

export async function getCmsPages(): Promise<CmsPage[]> {
  return serverGet<CmsPage[]>("/cms/pages", { cache: "no-store" }).catch(() => []);
}

export async function saveCmsPageAction(input: {
  id: string | null;
  title: string;
  slug: string;
  locale: string;
  sections: Section[];
  seoTitle?: string;
  seoDescription?: string;
  isPublished: boolean;
}): Promise<{ id?: string } & ActionState> {
  const denied = await assertCanWrite();
  if (denied) return denied;

  const title = input.title.trim();
  if (!title) {
    return { error: "Give the page a title.", fieldErrors: { title: "Required" } };
  }

  const payload = {
    title,
    slug: slugify(input.slug || title),
    locale: input.locale || "en",
    sections: input.sections,
    seoTitle: input.seoTitle?.trim() || undefined,
    seoDescription: input.seoDescription?.trim() || undefined,
    isPublished: input.isPublished,
  };

  try {
    const page = input.id
      ? await serverPatch<CmsPage>(`/cms/pages/${input.id}`, payload)
      : await serverPost<CmsPage>("/cms/pages", payload);

    revalidateCms(page.slug);
    return { ok: true, id: page.id };
  } catch (err) {
    return toActionState(err);
  }
}

export async function deleteCmsPageAction(id: string, slug: string): Promise<ActionState> {
  const denied = await assertCanWrite();
  if (denied) return denied;

  try {
    await serverDelete(`/cms/pages/${id}`);
  } catch (err) {
    return toActionState(err);
  }

  revalidateCms(slug);
  return { ok: true };
}

/** Used by the editor form, which posts plain fields alongside JSON-encoded sections. */
export async function saveCmsPageFormAction(
  pageId: string | null,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let sections: Section[] = [];
  try {
    sections = JSON.parse(String(formData.get("sections") ?? "[]")) as Section[];
  } catch {
    return { error: "The page content could not be read. Reload and try again." };
  }

  return saveCmsPageAction({
    id: pageId,
    title: String(formData.get("title") ?? ""),
    slug: String(formData.get("slug") ?? ""),
    locale: String(formData.get("locale") ?? "en"),
    sections,
    seoTitle: optionalStr(formData, "seoTitle"),
    seoDescription: optionalStr(formData, "seoDescription"),
    isPublished: formData.get("isPublished") === "on",
  });
}
