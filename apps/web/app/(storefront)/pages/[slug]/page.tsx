import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { api } from "@/lib/api";
import { getTenantSlug } from "@/lib/tenant";

type CmsSection = {
  type?: string;
  heading?: string;
  body?: string;
  html?: string;
};

type CmsPage = {
  id: string;
  slug: string;
  title: string;
  sections: CmsSection[] | unknown;
  seoTitle?: string | null;
  seoDescription?: string | null;
  isPublished: boolean;
};

async function loadPage(slug: string, tenantSlug: string) {
  try {
    return await api.get<CmsPage>(`/cms/pages/by-slug/${encodeURIComponent(slug)}?locale=en`, {
      tenantSlug,
      cache: "no-store",
    });
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tenantSlug = (await getTenantSlug()) ?? "demo";
  const page = await loadPage(slug, tenantSlug);
  if (!page || !page.isPublished) return { title: "Page" };
  return {
    title: page.seoTitle || page.title,
    description: page.seoDescription || undefined,
  };
}

export default async function PublicCmsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tenantSlug = (await getTenantSlug()) ?? "demo";
  const page = await loadPage(slug, tenantSlug);
  if (!page || !page.isPublished) notFound();

  const sections = Array.isArray(page.sections) ? (page.sections as CmsSection[]) : [];

  return (
    <main className="prose prose-slate mx-auto max-w-3xl">
      <h1 className="font-display text-4xl font-semibold tracking-tight text-foreground">
        {page.title}
      </h1>
      <div className="mt-8 space-y-8 not-prose">
        {sections.length === 0 ? (
          <p className="text-muted-foreground">This page has no content yet.</p>
        ) : (
          sections.map((section, idx) => (
            <section key={idx} className="space-y-2">
              {section.heading ? (
                <h2 className="font-display text-2xl font-semibold">{section.heading}</h2>
              ) : null}
              {section.html ? (
                <div
                  className="text-muted-foreground leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: section.html }}
                />
              ) : section.body ? (
                <p className="whitespace-pre-wrap text-muted-foreground leading-relaxed">
                  {section.body}
                </p>
              ) : null}
            </section>
          ))
        )}
      </div>
    </main>
  );
}
