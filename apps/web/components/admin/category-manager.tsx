"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import {
  Badge,
  Banner,
  Button,
  Checkbox,
  ConfirmDialog,
  EmptyState,
  Input,
  Modal,
  ModalClose,
  Table,
  TableContainer,
  TBody,
  Td,
  Textarea,
  Th,
  THead,
  Tr,
  useToast,
} from "@rentora/ui";
import { ChevronDown, ChevronUp } from "lucide-react";
import {
  deleteCategoryAction,
  reorderCategoriesAction,
  saveCategoryAction,
} from "@/lib/actions/catalog";
import type { Category } from "@/lib/types";

export type CategoryRow = Category & { _count?: { products: number } };

export function CategoryManager({ categories }: { categories: CategoryRow[] }) {
  const { toast } = useToast();
  const [editing, setEditing] = useState<CategoryRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [pending, startTransition] = useTransition();

  function move(index: number, direction: -1 | 1) {
    const next = [...categories];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target]!, next[index]!];

    startTransition(async () => {
      const result = await reorderCategoriesAction(next.map((c) => c.id));
      if (result.error) {
        toast({ title: "Could not reorder", description: result.error, tone: "error" });
      }
    });
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setCreating(true)}>Add category</Button>
      </div>

      <TableContainer>
        <Table>
          <THead>
            <Tr>
              <Th className="w-20">Order</Th>
              <Th>Category</Th>
              <Th align="right">Products</Th>
              <Th>Status</Th>
              <Th align="right" />
            </Tr>
          </THead>
          <TBody>
            {categories.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12">
                  <EmptyState
                    title="No categories yet"
                    description="Categories are how shoppers browse — Tents, Furniture, Lighting, and so on."
                    action={<Button onClick={() => setCreating(true)}>Add your first category</Button>}
                  />
                </td>
              </tr>
            ) : (
              categories.map((category, index) => (
                <Tr key={category.id}>
                  <Td>
                    <div className="flex gap-0.5">
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`Move ${category.name} up`}
                        disabled={pending || index === 0}
                        onClick={() => move(index, -1)}
                        className="h-7 w-7"
                      >
                        <ChevronUp size={14} />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`Move ${category.name} down`}
                        disabled={pending || index === categories.length - 1}
                        onClick={() => move(index, 1)}
                        className="h-7 w-7"
                      >
                        <ChevronDown size={14} />
                      </Button>
                    </div>
                  </Td>
                  <Td>
                    <button
                      type="button"
                      onClick={() => setEditing(category)}
                      className="text-left font-medium hover:underline"
                    >
                      {category.name}
                    </button>
                    <span className="block font-mono text-[11px] text-paper-faint">
                      /{category.slug}
                    </span>
                  </Td>
                  <Td numeric>
                    {category._count?.products ? (
                      <Link
                        href={`/admin/products?category=${category.id}`}
                        className="hover:underline"
                      >
                        {category._count.products}
                      </Link>
                    ) : (
                      <span className="text-paper-mute">0</span>
                    )}
                  </Td>
                  <Td>
                    <Badge tone={category.isActive ? "success" : "neutral"}>
                      {category.isActive ? "Visible" : "Hidden"}
                    </Badge>
                  </Td>
                  <Td align="right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setEditing(category)}>
                        Edit
                      </Button>
                      <DeleteCategory category={category} />
                    </div>
                  </Td>
                </Tr>
              ))
            )}
          </TBody>
        </Table>
      </TableContainer>

      <CategoryDialog
        key={editing?.id ?? "new"}
        open={creating || editing !== null}
        category={editing}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
      />
    </>
  );
}

function DeleteCategory({ category }: { category: CategoryRow }) {
  const { toast } = useToast();
  const [, startTransition] = useTransition();

  return (
    <ConfirmDialog
      trigger={
        <Button size="sm" variant="ghost" className="text-danger">
          Delete
        </Button>
      }
      title={`Delete ${category.name}?`}
      description={
        category._count?.products
          ? `This category still holds ${category._count.products} product(s). Move them first — the delete will be refused otherwise.`
          : "This cannot be undone."
      }
      confirmLabel="Delete category"
      destructive
      onConfirm={() =>
        startTransition(async () => {
          const result = await deleteCategoryAction(category.id);
          toast(
            result.error
              ? { title: "Could not delete", description: result.error, tone: "error" }
              : { title: "Category deleted" },
          );
        })
      }
    />
  );
}

function CategoryDialog({
  open,
  category,
  onClose,
}: {
  open: boolean;
  category: CategoryRow | null;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const action = saveCategoryAction.bind(null, category?.id ?? null);
  const [state, formAction] = useActionState(action, {});

  useEffect(() => {
    if (state.ok) {
      toast({ title: category ? "Category updated" : "Category created" });
      onClose();
    }
    // onClose is stable for the lifetime of the dialog instance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.ok, state]);

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={category ? `Edit ${category.name}` : "New category"}
      description="Categories group your inventory on the storefront."
    >
      <form action={formAction} className="space-y-4" id="category-form">
        {state.error ? <Banner tone="danger">{state.error}</Banner> : null}

        <Input
          name="name"
          label="Name"
          required
          defaultValue={category?.name ?? ""}
          error={state.fieldErrors?.name}
          placeholder="Tents"
        />
        <Input
          name="slug"
          label="URL slug"
          defaultValue={category?.slug ?? ""}
          hint="Leave blank to generate it from the name."
        />
        <Textarea
          name="description"
          label="Description"
          rows={3}
          defaultValue={category?.description ?? ""}
        />
        <Input
          name="imageUrl"
          label="Image URL"
          defaultValue={category?.imageUrl ?? ""}
          hint="Optional banner shown on the category page."
        />
        <Checkbox
          name="isActive"
          defaultChecked={category?.isActive ?? true}
          label="Visible on the storefront"
        />

        <div className="flex justify-end gap-2 pt-2">
          <ModalClose asChild>
            <Button variant="secondary">Cancel</Button>
          </ModalClose>
          <SaveButton label={category ? "Save changes" : "Create category"} />
        </div>
      </form>
    </Modal>
  );
}

function SaveButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending}>
      {label}
    </Button>
  );
}
