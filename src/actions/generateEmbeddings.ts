"use server";
import { authenticate } from "@/lib/auth";
import { generateEmbeddingsInPineconeVectorStore } from "@/lib/langchain";
import { revalidatePath } from "next/cache";

export async function generateEmbeddings(docId: string) {
  // check authentication
  authenticate();

  // turn pdf into embeddings
  await generateEmbeddingsInPineconeVectorStore(docId);
  revalidatePath("/dashboard");
  return { completed: true };
}
