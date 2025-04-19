import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { createRetrievalChain } from "langchain/chains/retrieval";
import { createHistoryAwareRetriever } from "langchain/chains/history_aware_retriever";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import pineconeClient from "./pinecone";
import { PineconeStore } from "@langchain/pinecone";
import { PineconeConflictError } from "@pinecone-database/pinecone/dist/errors";
import type { Index, RecordMetadata } from "@pinecone-database/pinecone";
import { downloadFileToBuffer } from "./s3";
import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";

const model = new ChatOpenAI({
	apiKey: process.env.OPENAI_API_KEY,
	modelName: "gpt-4o",
});

export const indexName = "chatai";

async function namespaceExists(
	index: Index<RecordMetadata>,
	namespace: string,
) {
	if (namespace === null) throw new Error("no namespace provided");
	const { namespaces } = await index.describeIndexStats();
	return namespaces?.[namespace] !== undefined;
}

// where docId is aws file key
export async function generateDocs(docId: string) {
	const pdfBuffer = await downloadFileToBuffer(docId);

	const tempFilePath = path.join(os.tmpdir(), `temp-${Date.now()}.pdf`);

	await fs.writeFile(tempFilePath, pdfBuffer);

	const loader = new PDFLoader(tempFilePath);
	const docs = await loader.load();

	const splitter = new RecursiveCharacterTextSplitter();
	const splitDocs = await splitter.splitDocuments(docs);

	await fs.unlink(tempFilePath);
	return splitDocs;
}

export async function generateEmbeddingsInPineconeVectorStore(docId: string) {
	let pineconeVectoreStore: PineconeStore;

	const embeddings = new OpenAIEmbeddings();

	const index = await pineconeClient.index(indexName);
	const namespaceAlreadyExists = await namespaceExists(index, docId);

	if (namespaceAlreadyExists) {
		console.log(`--- Namespace ${docId} already exists ---`);

		pineconeVectoreStore = await PineconeStore.fromExistingIndex(embeddings, {
			pineconeIndex: index,
			namespace: docId,
		});

		return pineconeVectoreStore;
	}

	const splitDocs = await generateDocs(docId);

	pineconeVectoreStore = await PineconeStore.fromDocuments(
		splitDocs,
		embeddings,
		{
			pineconeIndex: index,
			namespace: docId,
		},
	);

	return pineconeVectoreStore;
}

const generateLangchainCompletion = async();
