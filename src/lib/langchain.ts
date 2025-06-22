import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { createRetrievalChain } from "langchain/chains/retrieval";
import { createHistoryAwareRetriever } from "langchain/chains/history_aware_retriever";
import {
	HumanMessage,
	AIMessage,
	type BaseMessage,
} from "@langchain/core/messages";
import pineconeClient from "./pinecone";
import { PineconeStore } from "@langchain/pinecone";
import { PineconeConflictError } from "@pinecone-database/pinecone/dist/errors";
import type { Index, RecordMetadata } from "@pinecone-database/pinecone";
import { downloadFileToBuffer } from "./s3";
import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import { getMessages } from "./helper";
import { chat } from "@pinecone-database/pinecone/dist/assistant/data/chat";
import type { Message } from "@/types/types";
import { insertMessage } from "@/lib/helper";

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

async function fetchMessagesFromDb(
	userId: string,
	chatId: string,
): Promise<BaseMessage[]> {
	// grab messages from db
	const messages = await getMessages(userId, chatId);

	const chatHistory: BaseMessage[] = messages.map((msg) => {
		if (msg.role === "human") return new HumanMessage(msg.content);
		return new AIMessage(msg.content);
	});

	return chatHistory;
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

	// retrieve existing namespace
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

const generateLangchainCompletion = async (
	userId: string,
	chatId: string,
	question: string,
) => {
	const docId = `${userId}/${chatId}`;
	let pineconeVectorStore: PineconeStore | null = null;

	const chatHistory = await fetchMessagesFromDb(userId, chatId);

	try {
		pineconeVectorStore = await generateEmbeddingsInPineconeVectorStore(docId);
	} catch (err) {
		console.warn(`Embeddings unavailable for ${docId}, skipping retrieval.`);
	}

	if (!pineconeVectorStore) {
		const fallbackPrompt = ChatPromptTemplate.fromMessages([
			[
				"system",
				"You are a helpful assistant. Continue the conversation appropriately based on prior messages.",
			],
			...chatHistory,
			["user", "{input}"],
		]);

		const chain = fallbackPrompt.pipe(model);

		const reply = await chain.invoke({ input: question });
		return reply.content;
	}

	const retriever = pineconeVectorStore.asRetriever();

	const historyAwarePrompt = ChatPromptTemplate.fromMessages([
		...chatHistory,
		["user", "{input}"],
		[
			"user",
			"Given the above conversation, generate a search query to look up in order to get relevant information to the conversation",
		],
	]);

	const historyAwareRetrieverChain = await createHistoryAwareRetriever({
		llm: model,
		retriever,
		rephrasePrompt: historyAwarePrompt,
	});

	const historyAwareRetrievalPrompt = ChatPromptTemplate.fromMessages([
		[
			"system",
			"Answer the user's question based on the context below:\n\n{context}",
		],
		...chatHistory,
		["user", "{input}"],
	]);

	const historyAwareCombineDocsChain = await createStuffDocumentsChain({
		llm: model,
		prompt: historyAwareRetrievalPrompt,
	});

	const conversationalRetrievalChain = await createRetrievalChain({
		retriever: historyAwareRetrieverChain,
		combineDocsChain: historyAwareCombineDocsChain,
	});

	const reply = await conversationalRetrievalChain.invoke({
		chat_history: chatHistory,
		input: question,
	});

	return reply.answer;
};

const askQuestion = async (
	message: Message,
): Promise<{ success: boolean; reply: string | null }> => {
	// verify user authentication from cookies

	// generate AI reply
	const reply = await generateLangchainCompletion(
		message.userId,
		message.chatId,
		message.content,
	);

	if (reply == null || reply === undefined) {
		return { success: false, reply: "Error generating reply" };
	}
	return { success: true, reply: reply as string }; // return success message
};

export { model, generateLangchainCompletion, askQuestion };
