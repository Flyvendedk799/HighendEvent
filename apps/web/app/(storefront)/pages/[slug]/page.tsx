import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PageSections, type Section } from "@/components/storefront/page-sections";
import { serverGet } from "@/lib/server-api";
import { isApiError } from "@/lib/api";
import { getBootstrap } from "@/lib/tenant";

export const dynamic = "force-dynamic";

type CmsPage = {
  id: string;
  slug: string;
  title: string;
  locale: string;
  sections: Section[];
  seoTitle: string | null;
  seoDescription: string | null;
  isPublished: boolean;
  updatedAt: string;
};

async function loadPage(slug: string, locale: string): Promise<CmsPage | null> {
  try {
    return await serverGet<CmsPage>(
      `/cms/pages/by-slug/${encodeURIComponent(slug)}?locale=${encodeURIComponent(locale)}`,
      { anonymous: true, next: { revalidate: 60 } },
    );
  } catch (err) {
    if (isApiError(err) && err.status === 404) return null;
    throw err;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const bootstrap = await getBootstrap();
  const page = await loadPage(slug, bootstrap?.store.localeDefault ?? "en");

  if (!page) return { title: "Not found" };

  return {
    title: page.seoTitle ?? page.title,
    description: page.seoDescription ?? undefined,
  };
}

export default async function CmsPageRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const bootstrap = await getBootstrap();
  const page = await loadPage(slug, bootstrap?.store.localeDefault ?? "en");

  if (!page) notFound();

  return (
    <article className="mx-auto max-w-3xl">
      <h1 className="text-[clamp(30px,4.4vw,50px)] font-semibold leading-[0.98] tracking-[-0.04em]">
        {page.title}
      </h1>
      <div className="mt-8">
        <PageSections sections={Array.isArray(page.sections) ? page.sections : []} />
      </div>
    </article>
  );
}
