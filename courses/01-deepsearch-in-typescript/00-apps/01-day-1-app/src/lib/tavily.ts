import { tavily } from "@tavily/core";
import { env } from "~/env";

export interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
  raw_content?: string | null;
}

export interface TavilyResponse {
  query: string;
  answer?: string;
  images: any[];
  results: TavilySearchResult[];
  response_time?: string;
}

export interface TavilySearchInput {
  query: string;
  num?: number;
}

const tvly = tavily({
  apiKey: env.TAVILY_API_KEY,
});

export const searchTavily = async (
  input: TavilySearchInput,
  signal?: AbortSignal,
): Promise<TavilyResponse> => {
  try {
    const response = await tvly.search(input.query, {
      num: input.num ?? env.SEARCH_RESULTS_COUNT,
      search_depth: "advanced",
      include_answer: true,
      include_raw_content: true,
    });

    return response;
  } catch (error) {
    throw new Error(
      `Tavily search failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
};

// Helper function to format Tavily results for compatibility with existing code
export const formatTavilyResults = (response: TavilyResponse) => {
  return response.results.map((result) => ({
    title: result.title,
    link: result.url,
    // Use processed content as summary and raw content as scraped content
    summary: result.content, // Tavily's processed/cleaned content
    scrapedContent: result.raw_content || result.content, // Raw HTML content if available
    score: result.score,
    date: undefined, // Tavily doesn't provide date information
  }));
};
