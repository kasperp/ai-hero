import type { Message } from "ai";
import type { LocationInfo } from "./location-utils";

type SearchResult = {
  date: string;
  title: string;
  url: string;
  snippet: string;
  summary: string;
};

type SearchHistoryEntry = {
  query: string;
  results: SearchResult[];
};

type UsageEntry = {
  source: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};

export class SystemContext {
  /**
   * The current step in the loop
   */
  private step = 0;

  /**
   * The full conversation messages
   */
  public messages: Message[];

  /**
   * The history of all searches with their scraped content and summaries
   */
  private searchHistory: SearchHistoryEntry[] = [];

  /**
   * User's location information
   */
  private locationInfo?: LocationInfo;

  /**
   * The most recent feedback from getNextAction
   */
  private lastFeedback?: string;

  /**
   * Token usage tracking
   */
  private usage: UsageEntry[] = [];

  constructor(messages: Message[], locationInfo?: LocationInfo) {
    this.messages = messages;
    this.locationInfo = locationInfo;
  }

  shouldStop() {
    return this.step >= 3;
  }

  incrementStep() {
    this.step++;
  }

  getMessages(): string {
    const formattedMessages = this.messages
      .map((msg) => `<${msg.role}>${msg.content}</${msg.role}>`)
      .join("\n");
    return formattedMessages;
  }

  getLocationContext(): string {
    if (!this.locationInfo) {
      return "";
    }

    return `About the origin of user's request:
- lat: ${this.locationInfo.latitude || "unknown"}
- lon: ${this.locationInfo.longitude || "unknown"}
- city: ${this.locationInfo.city || "unknown"}
- country: ${this.locationInfo.country || "unknown"}
`;
  }

  reportSearch(search: SearchHistoryEntry) {
    this.searchHistory.push(search);
  }

  setLastFeedback(feedback: string) {
    this.lastFeedback = feedback;
  }

  getLastFeedback(): string {
    return this.lastFeedback || "";
  }

  /**
   * Report token usage from an LLM call
   */
  reportUsage(
    source: string,
    usage: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    },
  ) {
    this.usage.push({
      source,
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      totalTokens: usage.totalTokens,
    });
  }

  /**
   * Get total token usage across all calls
   */
  getTotalUsage(): {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  } {
    return this.usage.reduce(
      (total, entry) => ({
        promptTokens: total.promptTokens + entry.promptTokens,
        completionTokens: total.completionTokens + entry.completionTokens,
        totalTokens: total.totalTokens + entry.totalTokens,
      }),
      { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    );
  }

  /**
   * Get detailed usage breakdown
   */
  getUsageBreakdown(): UsageEntry[] {
    return [...this.usage];
  }

  getSearchHistory(): string {
    return this.searchHistory
      .map((search) =>
        [
          `## Query: "${search.query}"`,
          ...search.results.map((result) =>
            [
              `### ${result.date} - ${result.title}`,
              result.url,
              result.snippet,
              `<summary>`,
              result.summary,
              `</summary>`,
            ].join("\n\n"),
          ),
        ].join("\n\n"),
      )
      .join("\n\n");
  }

  // Legacy methods for backward compatibility
  reportQueries(queries: any[]) {
    // This method is deprecated - use reportSearch instead
    console.warn("reportQueries is deprecated - use reportSearch instead");
  }

  reportScrapes(scrapes: any[]) {
    // This method is deprecated - use reportSearch instead
    console.warn("reportScrapes is deprecated - use reportSearch instead");
  }

  getQueryHistory(): string {
    // This method is deprecated - use getSearchHistory instead
    return this.getSearchHistory();
  }

  getScrapeHistory(): string {
    // This method is deprecated - use getSearchHistory instead
    return this.getSearchHistory();
  }
}
