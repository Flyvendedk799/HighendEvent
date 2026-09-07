"use server";

import { revalidatePath } from "next/cache";
import { serverDelete, serverGet, serverPost } from "../server-api";
import { assertCanWrite, toActionState, type ActionState } from "./action-state";

export type DnsRecord = {
  type: string;
  name: string;
  value: string;
  note?: string | null;
};

export type CustomDomain = {
  id: string;
  hostname: string;
  verified: boolean;
  sslStatus: string;
  createdAt: string;
  instructions: { verification: DnsRecord; routing: DnsRecord };
};

export async function getDomains(): Promise<CustomDomain[]> {
  return serverGet<CustomDomain[]>("/domains", { cache: "no-store" }).catch(() => []);
}

export async function addDomainAction(hostname: string): Promise<ActionState> {
  const denied = await assertCanWrite();
  if (denied) return denied;

  try {
    await serverPost("/domains", { hostname });
  } catch (err) {
    return toActionState(err);
  }

  revalidatePath("/admin/settings");
  revalidatePath("/admin/go-live");
  return { ok: true };
}

export async function verifyDomainAction(
  id: string,
): Promise<{ verified?: boolean; message?: string } & ActionState> {
  try {
    const result = await serverPost<{ verified: boolean; message: string }>(
      `/domains/${id}/verify`,
    );
    revalidatePath("/admin/settings");
    revalidatePath("/admin/go-live");
    return { ok: true, verified: result.verified, message: result.message };
  } catch (err) {
    return toActionState(err);
  }
}

export async function removeDomainAction(id: string): Promise<ActionState> {
  const denied = await assertCanWrite();
  if (denied) return denied;

  try {
    await serverDelete(`/domains/${id}`);
  } catch (err) {
    return toActionState(err);
  }

  revalidatePath("/admin/settings");
  return { ok: true };
}
