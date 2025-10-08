import { tool } from "@langchain/core/tools";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { z } from "zod";

// separate tools. add web search tool eventually.
const searchTool = tool(
	(_) => {
		// This is a placeholder for the actual implementation
		return "Cold, with a low of 3℃";
	},
	{
		name: "search",
		description:
			"Use to surf the web, fetch current information, check the weather, and retrieve other information.",
		schema: z.object({
			query: z.string().describe("The query to use in your search."),
		}),
	},
);

await searchTool.invoke({ query: "What's the weather like?" });

const tools = [searchTool];
const toolNode = new ToolNode(tools);

export { toolNode, tools };
