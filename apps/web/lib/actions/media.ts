"use server";

import { revalidatePath } from "next/cache";
import { serverDelete, serverGet, serverPost } from "../server-api";
import { assertCanWrite, toActionState, type ActionState } from "./action-state";

export type StorageStatus = {
  configured: boolean;
  bucket: string | null;
  publicBaseUrl: string | null;
  maxBytes: number;
  allowedTypes: string[];
  reason: string | null;
};

export type MediaAsset = {
  id: string;
  url: string;
  key: string;
  mimeType?: string | null;
  alt?: string | null;
  createdAt: string;
};

export type UploadTicket = {
  assetId: string;
  uploadUrl: string;
  url: string;
  key: string;
  method: "PUT";
  headers: Record<string, string>;
};

export async function getStorageStatus(): Promise<StorageStatus> {
  return serverGet<StorageStatus>("/media/storage-status", { cache: "no-store" });
}

/**
 * Issues a presigned PUT. The browser uploads directly to object storage from here, so large
 * files never travel through the Next server or the API.
 */
export async function createUploadTicketAction(input: {
  filename: string;
  mimeType: string;
  sizeBytes: number;
  alt?: string;
}): Promise<{ ticket?: UploadTicket } & ActionState> {
  const denied = await assertCanWrite();
  if (denied) return denied;

  try {
    const ticket = await serverPost<UploadTicket>("/media/upload-url", input);
    return { ok: true, ticket };
  } catch (err) {
    return toActionState(err);
  }
}

export async function registerExternalMediaAction(input: {
  url: string;
  alt?: string;
}): Promise<{ asset?: MediaAsset } & ActionState> {
  const denied = await assertCanWrite();
  if (denied) return denied;

  try {
    const asset = await serverPost<MediaAsset>("/media/external", input);
    revalidatePath("/admin/media");
    return { ok: true, asset };
  } catch (err) {
    return toActionState(err);
  }
}

export async function deleteMediaAction(id: string): Promise<ActionState> {
  const denied = await assertCanWrite();
  if (denied) return denied;

  try {
    await serverDelete(`/media/${id}`);
  } catch (err) {
    return toActionState(err);
  }

  revalidatePath("/admin/media");
  return { ok: true };
}
