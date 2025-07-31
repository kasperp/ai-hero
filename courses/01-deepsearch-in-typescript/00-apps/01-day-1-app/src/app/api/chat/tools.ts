import { z } from "zod";
import { searchSerper } from "~/lib/serper";
import { bulkCrawlWebsites } from "~/lib/scraper";
import { summarizeURL } from "~/lib/summarize-url";
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
    // Search for results
    const searchResults = await searchSerper(
      { q: query, num: num ?? 3 },
      options.abortSignal,
    );

    // Extract URLs from search results
    const urls = searchResults.organic.map((result) => result.link);

    // Scrape the URLs for detailed content
    const scrapeResults = await bulkCrawlWebsites({ urls });

    // Combine search results with scraped content and generate summaries
    const combinedResults = await Promise.all(
      searchResults.organic.map(async (result, index) => {
        const scrapedContent = scrapeResults.success
          ? scrapeResults.results[index]?.result.success
            ? scrapeResults.results[index].result.data
            : "Failed to scrape content"
          : "Failed to scrape content";

        // Generate summary for the scraped content
        let summary = "Failed to generate summary";
        if (scrapedContent !== "Failed to scrape content") {
          try {
            summary = await summarizeURL(
              {
                url: result.link,
                title: result.title,
                snippet: result.snippet,
                scrapedContent,
                query,
                conversation: "", // Empty for tools context
              },
              undefined,
            );
          } catch (error) {
            console.error("Failed to summarize URL:", result.link, error);
            summary = "Failed to generate summary";
          }
        }

        return {
          title: result.title,
          link: result.link,
          snippet: result.snippet,
          date: result.date,
          scrapedContent,
          summary,
        };
      }),
    );

    return combinedResults;
  },
};
