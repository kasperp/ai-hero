import type { streamText, StreamTextResult } from "ai";
import type { Message } from "ai";
import { searchTavily, formatTavilyResults } from "~/lib/tavily";
import { env } from "~/env";
import { SystemContext } from "./system-context";
import { getNextAction, type MessageAnnotation } from "./get-next-action";
import { queryRewriter } from "./query-rewriter";
import { answerQuestion } from "./answer-question";
import type { LocationInfo } from "./location-utils";

// Combined search function using Tavily for search and scrape in one call
const searchWeb = async (
  query: string,
  conversation: string,
  opts?: { langfuseTraceId?: string },
) => {
  // Search and scrape using Tavily in a single call
  const tavilyResponse = await searchTavily({
    query,
    num: env.SEARCH_RESULTS_COUNT,
  });

  // Format results for compatibility with existing code
  const combinedResults = formatTavilyResults(tavilyResponse);

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

  while (!ctx.shouldStop()) {
    // First, generate search queries using the query rewriter
    const queryPlan = await queryRewriter(ctx, opts);

    // Execute all queries in parallel for maximum speed
    const searchPromises = queryPlan.queries.map(async (query) => {
      const searchResults = await searchWeb(query, ctx.getMessages(), {
        langfuseTraceId: opts?.langfuseTraceId,
      });
      return { query, results: searchResults };
    });

    const searchResults = await Promise.all(searchPromises);

    // Report all search results to the context
    for (const { query, results } of searchResults) {
      ctx.reportSearch({
        query,
        results: results.map((result) => ({
          date: result.date || "",
          title: result.title,
          url: result.link,
          snippet: result.summary, // Use summary as snippet since we no longer have separate snippet
          scrapedContent: result.scrapedContent,
          summary: result.summary,
        })),
      });
    }

    // Now we choose the next action based on the updated state of our system
    const nextAction = await getNextAction(ctx, opts);

    // Store the feedback in the system context
    ctx.setLastFeedback(nextAction.feedback ?? "");

    // Send annotation about the chosen action
    if (opts?.writeMessageAnnotation) {
      opts.writeMessageAnnotation({
        type: "NEW_ACTION",
        action: {
          type: nextAction.type,
          title: nextAction.title,
          reasoning: nextAction.reasoning,
          feedback: nextAction.feedback,
        },
      });
    }

    // We execute the action and update the state of our system
    if (nextAction.type === "continue") {
      // Continue to the next iteration of the loop
      // (we've already done the searching above)
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
