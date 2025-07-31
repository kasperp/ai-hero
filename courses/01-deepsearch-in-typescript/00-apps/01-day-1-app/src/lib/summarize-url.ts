import { generateText } from "ai";
import { summarizationModel } from "~/app/api/chat/model";
import { cacheWithRedis } from "~/server/redis/redis";
import type { Message } from "ai";

export interface SummarizeURLOptions {
  langfuseTraceId?: string;
}

export interface SummarizeURLInput {
  url: string;
  title: string;
  snippet: string;
  scrapedContent: string;
  query: string;
  conversation: string;
}

export const summarizeURL = cacheWithRedis(
  "summarizeURL",
  async (
    input: SummarizeURLInput,
    opts?: SummarizeURLOptions,
  ): Promise<string> => {
    const { url, title, snippet, scrapedContent, query, conversation } = input;

    const result = await generateText({
      model: summarizationModel,
      system: `You are a research extraction specialist. Given a research topic and raw web content, create a thoroughly detailed synthesis as a cohesive narrative that flows naturally between key concepts.

Extract the most valuable information related to the research topic, including relevant facts, statistics, methodologies, claims, and contextual information. Preserve technical terminology and domain-specific language from the source material.

Structure your synthesis as a coherent document with natural transitions between ideas. Begin with an introduction that captures the core thesis and purpose of the source material. Develop the narrative by weaving together key findings and their supporting details, ensuring each concept flows logically to the next.

Integrate specific metrics, dates, and quantitative information within their proper context. Explore how concepts interconnect within the source material, highlighting meaningful relationships between ideas. Acknowledge limitations by noting where information related to aspects of the research topic may be missing or incomplete.

Important guidelines:
- Maintain original data context (e.g., "2024 study of 150 patients" rather than generic "recent study")
- Preserve the integrity of information by keeping details anchored to their original context
- Create a cohesive narrative rather than disconnected bullet points or lists
- Use paragraph breaks only when transitioning between major themes

Critical Reminder: If content lacks a specific aspect of the research topic, clearly state that in the synthesis, and you should NEVER make up information and NEVER rely on external knowledge.`,
      prompt: `Research Topic: ${query}

Conversation Context:
${conversation}

Source Information:
- URL: ${url}
- Title: ${title}
- Snippet: ${snippet}

Content to Summarize:
${scrapedContent}

Please create a detailed synthesis of the above content in relation to the research topic. Focus on extracting the most valuable and relevant information while maintaining the original context and technical accuracy.`,
      experimental_telemetry: opts?.langfuseTraceId
        ? {
            isEnabled: true,
            functionId: "summarize-url",
            metadata: {
              langfuseTraceId: opts.langfuseTraceId,
            },
          }
        : undefined,
    });

    return result.text;
  },
);
