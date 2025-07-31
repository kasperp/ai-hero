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

  constructor(messages: Message[], locationInfo?: LocationInfo) {
    this.messages = messages;
    this.locationInfo = locationInfo;
  }

  shouldStop() {
    return this.step >= 10;
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
