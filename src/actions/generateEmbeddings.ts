"use server";
import { revalidatePath } from "next/cache";

export async function generateEmbeddings(docId: string) {
  // check authentication

  // turn pdf into embeddings
  await generateEmbeddingsInPineconeVectorStore(docId);
  revalidatePath("/dashboard");
  return { completed: true };
}
