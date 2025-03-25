"use server";
import { authenticate } from "@/lib/auth";
import { downloadFileToBuffer } from "@/lib/s3";
import { revalidatePath } from "next/cache";

export async function getFileBuffer(key: string): Promise<Blob> {
  const res = await downloadFileToBuffer(key);
  const file = new Blob([res], { type: "application/pdf" });
  return file;
}
