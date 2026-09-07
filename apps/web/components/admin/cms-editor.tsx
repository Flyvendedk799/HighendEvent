"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Badge,
  Banner,
  Button,
  Card,
  CardHeader,
  Checkbox,
  ConfirmDialog,
  EmptyState,
  Input,
  Select,
  Textarea,
  useToast,
} from "@rentora/ui";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { deleteCmsPageAction, saveCmsPageAction, type CmsPage } from "@/lib/actions/cms";
import type { Section } from "@/components/storefront/page-sections";

const BLANK: Record<Section["type"], Section> = {
  richText: { type: "richText", heading: "", body: "" },
  faq: { type: "faq", heading: "", items: [{ q: "", a: "" }] },
  callout: { type: "callout", heading: "", body: "", ctaLabel: "", ctaHref: "" },
  list: { type: "list", heading: "", items: [""] },
};

const TYPE_LABELS: Record<Section["type"], string> = {
  richText: "Text",
  faq: "Questions and answers",
  callout: "Callout with a button",
  list: "Bulleted list",
};

export function CmsEditor({ pages }: { pages: CmsPage[] }) {
  const [selectedId, setSelectedId] = useState<string | "new" | null>(pages[0]?.id ?? null);

  const selected = selectedId === "new" ? null : pages.find((p) => p.id === selectedId) ?? null;

  return (
    <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
      <div>
        <Button className="mb-3 w-full" onClick={() => setSelectedId("new")}>
          New page
        </Button>

        {pages.length === 0 ? (
          <p className="text-[13.5px] text-paper-mute">No pages yet.</p>
        ) : (
          <ul className="space-y-1">
            {pages.map((page) => (
              <li key={page.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(page.id)}
                  className={
                    selectedId === page.id
                      ? "w-full bg-ink-hover px-3 py-2 text-left text-[13.5px] font-medium"
                      : "w-full px-3 py-2 text-left text-[13.5px] hover:bg-ink-hover"
                  }
                >
                  <span className="block truncate">{page.title}</span>
                  <span className="mt-0.5 flex items-center gap-1.5 font-mono text-[11px] text-paper-faint">
                    /pages/{page.slug}
                    {!page.isPublished ? (
                      <Badge tone="neutral" className="text-[10px]">
                        Draft
                      </Badge>
                    ) : null}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {selectedId === null ? (
        <Card>
          <EmptyState
            title="No page selected"
            description="Create a page for your terms, FAQ, or anything else customers ask about."
            action={<Button onClick={() => setSelectedId("new")}>New page</Button>}
          />
        </Card>
      ) : (
        <PageForm
          key={selected?.id ?? "new"}
          page={selected}
          onSaved={(id) => setSelectedId(id)}
          onDeleted={() => setSelectedId(pages.find((p) => p.id !== selected?.id)?.id ?? null)}
        />
      )}
    </div>
  );
}

function PageForm({
  page,
  onSaved,
  onDeleted,
}: {
  page: CmsPage | null;
  onSaved: (id: string) => void;
  onDeleted: () => void;
}) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  const [title, setTitle] = useState(page?.title ?? "");
  const [slug, setSlug] = useState(page?.slug ?? "");
  const [locale, setLocale] = useState(page?.locale ?? "en");
  const [seoTitle, setSeoTitle] = useState(page?.seoTitle ?? "");
  const [seoDescription, setSeoDescription] = useState(page?.seoDescription ?? "");
  const [isPublished, setIsPublished] = useState(page?.isPublished ?? false);
  const [sections, setSections] = useState<Section[]>(
    Array.isArray(page?.sections) ? page!.sections : [],
  );
  const [error, setError] = useState<string | null>(null);

  function update(index: number, next: Section) {
    setSections((current) => current.map((s, i) => (i === index ? next : s)));
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= sections.length) return;
    setSections((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target]!, next[index]!];
      return next;
    });
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await saveCmsPageAction({
        id: page?.id ?? null,
        title,
        slug,
        locale,
        sections,
        seoTitle,
        seoDescription,
        isPublished,
      });

      if (result.error) {
        setError(result.error);
        toast({ title: "Could not save", description: result.error, tone: "error" });
        return;
      }

      toast({ title: isPublished ? "Page published" : "Draft saved" });
      if (result.id) onSaved(result.id);
    });
  }

  return (
    <div className="space-y-6">
      {error ? <Banner tone="danger">{error}</Banner> : null}

      <Card>
        <CardHeader
          title={page ? "Edit page" : "New page"}
          action={
            page ? (
              <Link
                href={`/pages/${page.slug}`}
                className="text-[13.5px] font-medium text-signal hover:underline"
              >
                View →
              </Link>
            ) : null
          }
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Input
              label="Title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Rental terms"
            />
          </div>
          <Input
            label="URL slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            hint="Leave blank to build it from the title."
          />
          <Select
            label="Language"
            value={locale}
            onChange={(e) => setLocale(e.target.value)}
            options={[
              { value: "en", label: "English" },
              { value: "da", label: "Dansk" },
            ]}
          />
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Content"
          description="Blocks stack down the page. Reorder them with the arrows."
        />

        {sections.length === 0 ? (
          <p className="py-3 text-[13.5px] text-paper-mute">
            No content yet. Add a block below.
          </p>
        ) : (
          <ul className="space-y-4">
            {sections.map((section, index) => (
              <li
                key={index}
                className="border border-line p-4"
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <Badge tone="neutral">{TYPE_LABELS[section.type]}</Badge>
                  <div className="flex gap-0.5">
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Move up"
                      disabled={index === 0}
                      onClick={() => move(index, -1)}
                      className="h-7 w-7"
                    >
                      <ChevronUp size={14} />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Move down"
                      disabled={index === sections.length - 1}
                      onClick={() => move(index, 1)}
                      className="h-7 w-7"
                    >
                      <ChevronDown size={14} />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Remove block"
                      className="h-7 w-7 text-danger"
                      onClick={() =>
                        setSections((current) => current.filter((_, i) => i !== index))
                      }
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>

                <SectionFields
                  section={section}
                  onChange={(next) => update(index, next)}
                />
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {(Object.keys(BLANK) as Array<Section["type"]>).map((type) => (
            <Button
              key={type}
              size="sm"
              variant="secondary"
              onClick={() =>
                setSections((current) => [
                  ...current,
                  JSON.parse(JSON.stringify(BLANK[type])) as Section,
                ])
              }
            >
              Add {TYPE_LABELS[type].toLowerCase()}
            </Button>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader title="Search engines" />
        <div className="space-y-4">
          <Input
            label="Meta title"
            value={seoTitle}
            onChange={(e) => setSeoTitle(e.target.value)}
            maxLength={70}
          />
          <Textarea
            label="Meta description"
            rows={2}
            value={seoDescription}
            onChange={(e) => setSeoDescription(e.target.value)}
            maxLength={180}
          />
        </div>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Checkbox
          checked={isPublished}
          onChange={(e) => setIsPublished(e.target.checked)}
          label="Published"
          description="Unpublished pages are only visible to you."
        />
        <div className="flex gap-2">
          {page ? (
            <ConfirmDialog
              trigger={
                <Button variant="ghost" className="text-danger">
                  Delete
                </Button>
              }
              title={`Delete ${page.title}?`}
              description="The page and its link stop working straight away."
              confirmLabel="Delete page"
              destructive
              onConfirm={() =>
                startTransition(async () => {
                  const result = await deleteCmsPageAction(page.id, page.slug);
                  if (result.error) {
                    toast({ title: "Could not delete", description: result.error, tone: "error" });
                  } else {
                    toast({ title: "Page deleted" });
                    onDeleted();
                  }
                })
              }
            />
          ) : null}
          <Button onClick={save} loading={pending}>
            {isPublished ? "Save and publish" : "Save draft"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function SectionFields({
  section,
  onChange,
}: {
  section: Section;
  onChange: (next: Section) => void;
}) {
  if (section.type === "richText" || section.type === "callout") {
    return (
      <div className="space-y-3">
        <Input
          label="Heading"
          value={section.heading ?? ""}
          onChange={(e) => onChange({ ...section, heading: e.target.value })}
        />
        <Textarea
          label="Text"
          rows={4}
          value={section.body}
          onChange={(e) => onChange({ ...section, body: e.target.value })}
          hint="Leave a blank line between paragraphs."
        />
        {section.type === "callout" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Button label"
              value={section.ctaLabel ?? ""}
              onChange={(e) => onChange({ ...section, ctaLabel: e.target.value })}
            />
            <Input
              label="Button link"
              value={section.ctaHref ?? ""}
              onChange={(e) => onChange({ ...section, ctaHref: e.target.value })}
              hint="A path on your store, e.g. /catalog"
            />
          </div>
        ) : null}
      </div>
    );
  }

  if (section.type === "faq") {
    return (
      <div className="space-y-3">
        <Input
          label="Heading"
          value={section.heading ?? ""}
          onChange={(e) => onChange({ ...section, heading: e.target.value })}
        />
        {section.items.map((item, i) => (
          <div key={i} className="bg-ink-hover p-3">
            <Input
              label="Question"
              value={item.q}
              onChange={(e) =>
                onChange({
                  ...section,
                  items: section.items.map((it, j) =>
                    j === i ? { ...it, q: e.target.value } : it,
                  ),
                })
              }
            />
            <div className="mt-2">
              <Textarea
                label="Answer"
                rows={2}
                value={item.a}
                onChange={(e) =>
                  onChange({
                    ...section,
                    items: section.items.map((it, j) =>
                      j === i ? { ...it, a: e.target.value } : it,
                    ),
                  })
                }
              />
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="mt-1 text-danger"
              onClick={() =>
                onChange({ ...section, items: section.items.filter((_, j) => j !== i) })
              }
            >
              Remove
            </Button>
          </div>
        ))}
        <Button
          size="sm"
          variant="secondary"
          onClick={() => onChange({ ...section, items: [...section.items, { q: "", a: "" }] })}
        >
          Add a question
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Input
        label="Heading"
        value={section.heading ?? ""}
        onChange={(e) => onChange({ ...section, heading: e.target.value })}
      />
      {section.items.map((item, i) => (
        <div key={i} className="flex items-end gap-2">
          <div className="flex-1">
            <Input
              aria-label={`List item ${i + 1}`}
              value={item}
              onChange={(e) =>
                onChange({
                  ...section,
                  items: section.items.map((it, j) => (j === i ? e.target.value : it)),
                })
              }
            />
          </div>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Remove item"
            className="text-danger"
            onClick={() =>
              onChange({ ...section, items: section.items.filter((_, j) => j !== i) })
            }
          >
            <Trash2 size={14} />
          </Button>
        </div>
      ))}
      <Button
        size="sm"
        variant="secondary"
        onClick={() => onChange({ ...section, items: [...section.items, ""] })}
      >
        Add an item
      </Button>
    </div>
  );
}
