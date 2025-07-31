import { z } from "zod";
import { searchTavily, formatTavilyResults } from "~/lib/tavily";
import { env } from "~/env";

export const searchWeb = {
  parameters: z.object({
    query: z.string().describe("The query to search the web for"),
    num: z
      .number()
      .describe("The number of search results to return")
      .default(10),
  }),
  execute: async (
    { query, num }: { query: string; num?: number },
    options: { abortSignal?: AbortSignal },
  ) => {
    // Search and scrape using Tavily in a single call
    const tavilyResponse = await searchTavily({
      query,
      num: num ?? env.SEARCH_RESULTS_COUNT,
    });

    // Format results for compatibility with existing code
    const combinedResults = formatTavilyResults(tavilyResponse);

    return combinedResults;
  },
};
