"use server";

import { revalidatePath } from "next/cache";
import { serverGet, serverPost } from "../server-api";
import { assertCanWrite, toActionState, type ActionState } from "./action-state";

export type EmailTemplate = {
  id: string;
  key: string;
  locale: string;
  subject: string;
  bodyHtml: string;
  isActive: boolean;
};

export type TemplateCatalogEntry = {
  key: string;
  name: string;
  description: string;
  customised: boolean;
};

export type TemplatesResponse = {
  templates: EmailTemplate[];
  catalog: TemplateCatalogEntry[];
  variables: string[];
};

export async function getEmailTemplates(): Promise<TemplatesResponse> {
  return serverGet<TemplatesResponse>("/email-templates", { cache: "no-store" });
}

export async function saveTemplateAction(input: {
  key: string;
  subject: string;
  bodyHtml: string;
  isActive: boolean;
}): Promise<ActionState> {
  const denied = await assertCanWrite();
  if (denied) return denied;

  if (!input.subject.trim() || !input.bodyHtml.trim()) {
    return { error: "A template needs both a subject and a body." };
  }

  try {
    await serverPost("/email-templates", { ...input, locale: "en" });
  } catch (err) {
    return toActionState(err);
  }

  revalidatePath("/admin/emails");
  return { ok: true };
}

export async function previewTemplateAction(input: {
  subject: string;
  bodyHtml: string;
}): Promise<{
  preview?: { subject: string; bodyHtml: string; unknownVariables: string[] };
} & ActionState> {
  try {
    const preview = await serverPost<{
      subject: string;
      bodyHtml: string;
      unknownVariables: string[];
    }>("/email-templates/preview", input);
    return { ok: true, preview };
  } catch (err) {
    return toActionState(err);
  }
}

export async function sendTestEmailAction(input: {
  to: string;
  subject: string;
  bodyHtml: string;
}): Promise<{ queued?: boolean; message?: string } & ActionState> {
  const denied = await assertCanWrite();
  if (denied) return denied;

  try {
    const result = await serverPost<{ queued: boolean; message: string }>(
      "/email-templates/test-send",
      input,
    );
    return { ok: true, queued: result.queued, message: result.message };
  } catch (err) {
    return toActionState(err);
  }
}
