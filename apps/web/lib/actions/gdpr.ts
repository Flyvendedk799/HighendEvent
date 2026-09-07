"use server";

import { revalidatePath } from "next/cache";
import { serverDelete, serverGet } from "../server-api";
import { assertCanWrite, toActionState, type ActionState } from "./action-state";

export async function exportCustomerDataAction(
  customerId: string,
): Promise<{ data?: unknown } & ActionState> {
  try {
    const data = await serverGet(`/gdpr/customers/${customerId}/export`, { cache: "no-store" });
    return { ok: true, data };
  } catch (err) {
    return toActionState(err);
  }
}

export async function deleteCustomerDataAction(customerId: string): Promise<ActionState> {
  const denied = await assertCanWrite();
  if (denied) return denied;

  try {
    await serverDelete(`/gdpr/customers/${customerId}`);
  } catch (err) {
    return toActionState(err);
  }

  revalidatePath("/admin/customers");
  return { ok: true };
}
