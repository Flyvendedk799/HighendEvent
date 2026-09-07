"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { serverGet, serverPatch, serverPost } from "../server-api";
import { assertCanWrite, toActionState, type ActionState } from "./action-state";

export type StaffMember = {
  id: string;
  email: string;
  name: string | null;
  role: "OWNER" | "MANAGER" | "STAFF" | "READONLY";
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
};

export async function getStaff(): Promise<StaffMember[]> {
  return serverGet<StaffMember[]>("/staff", { cache: "no-store" }).catch(() => []);
}

export async function inviteStaffAction(input: {
  email: string;
  name?: string;
  role: string;
}): Promise<{ temporaryPassword?: string | null } & ActionState> {
  const denied = await assertCanWrite();
  if (denied) return denied;

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");

  try {
    const result = await serverPost<{ temporaryPassword: string | null }>("/staff/invite", {
      email: input.email,
      name: input.name || undefined,
      role: input.role,
      inviteBaseUrl: `${proto}://${host}`,
    });
    revalidatePath("/admin/staff");
    return { ok: true, temporaryPassword: result.temporaryPassword };
  } catch (err) {
    return toActionState(err);
  }
}

export async function updateStaffRoleAction(id: string, role: string): Promise<ActionState> {
  const denied = await assertCanWrite();
  if (denied) return denied;

  try {
    await serverPatch(`/staff/${id}/role`, { role });
  } catch (err) {
    return toActionState(err);
  }

  revalidatePath("/admin/staff");
  return { ok: true };
}

export async function setStaffActiveAction(
  id: string,
  isActive: boolean,
): Promise<ActionState> {
  const denied = await assertCanWrite();
  if (denied) return denied;

  try {
    await serverPatch(`/staff/${id}/active`, { isActive });
  } catch (err) {
    return toActionState(err);
  }

  revalidatePath("/admin/staff");
  return { ok: true };
}
