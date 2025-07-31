import type { streamText, StreamTextResult } from "ai";
import type { Message } from "ai";
import { searchSerper } from "~/lib/serper";
import { bulkCrawlWebsites } from "~/lib/scraper";
import { summarizeURL } from "~/lib/summarize-url";
import { env } from "~/env";
import { SystemContext } from "./system-context";
import { getNextAction, type MessageAnnotation } from "./get-next-action";
import { answerQuestion } from "./answer-question";
import type { LocationInfo } from "./location-utils";

// Combined search function that automatically scrapes URLs and summarizes content
const searchWeb = async (
  query: string,
  conversation: string,
  opts?: { langfuseTraceId?: string },
) => {
  // Search for results
  const searchResults = await searchSerper(
    { q: query, num: env.SEARCH_RESULTS_COUNT }, // Reduced to 3 as requested
    undefined,
  );

  // Extract URLs from search results
  const urls = searchResults.organic.map((result) => result.link);

  // Scrape the URLs for detailed content
  const scrapeResults = await bulkCrawlWebsites({ urls });

  // Combine search results with scraped content and generate summaries
  const combinedResults = await Promise.all(
    searchResults.organic.map(async (result, index) => {
      if (!scrapeResults.success) {
        return {
          title: result.title,
          link: result.link,
          snippet: result.snippet,
          scrapedContent: "",
          summary: "",
        };
      }
      const scrapedContent = scrapeResults.results[index]?.result.data ?? "";

      const summary = await summarizeURL(
        {
          url: result.link,
          title: result.title,
          snippet: result.snippet,
          scrapedContent,
          query,
          conversation,
        },
        { langfuseTraceId: opts?.langfuseTraceId },
      );

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
};

interface RunAgentLoopOptions {
  langfuseTraceId?: string;
  locationInfo?: LocationInfo;
  onFinish?: Parameters<typeof streamText>[0]["onFinish"];
  writeMessageAnnotation?: (annotation: MessageAnnotation) => void;
}

export const runAgentLoop = async (
  messages: Message[],
  locationInfo?: LocationInfo,
  opts?: RunAgentLoopOptions,
) => {
  const ctx = new SystemContext(messages, locationInfo);

  // A loop that continues until we have an answer
  // or we've taken 10 actions
  while (!ctx.shouldStop()) {
    // We choose the next action based on the state of our system
    const nextAction = await getNextAction(ctx, opts);

    // Send annotation about the chosen action
    if (opts?.writeMessageAnnotation) {
      opts.writeMessageAnnotation({
        type: "NEW_ACTION",
        action: {
          type: nextAction.type,
          title: nextAction.title,
          reasoning: nextAction.reasoning,
          query: nextAction.query,
        },
      });
    }

    // We execute the action and update the state of our system
    if (nextAction.type === "search" && nextAction.query) {
      const searchResults = await searchWeb(
        nextAction.query,
        ctx.getMessages(),
        {
          langfuseTraceId: opts?.langfuseTraceId,
        },
      );
      ctx.reportSearch({
        query: nextAction.query,
        results: searchResults.map((result) => ({
          date: result.date || "",
          title: result.title,
          url: result.link,
          snippet: result.snippet,
          scrapedContent: result.scrapedContent,
          summary: result.summary,
        })),
      });
    } else if (nextAction.type === "answer") {
      const lastMessage = messages[messages.length - 1];
      const userQuestion = lastMessage?.content || "";
      return answerQuestion(
        ctx,
        userQuestion,
        { isFinal: false, onFinish: opts?.onFinish },
        opts,
      );
    }

    // We increment the step counter
    ctx.incrementStep();
  }

  // If we've taken 10 actions and still don't have an answer,
  // we ask the LLM to give its best attempt at an answer
  const lastMessage = messages[messages.length - 1];
  const userQuestion = lastMessage?.content || "";
  return answerQuestion(
    ctx,
    userQuestion,
    { isFinal: true, onFinish: opts?.onFinish },
    opts,
  );
};
