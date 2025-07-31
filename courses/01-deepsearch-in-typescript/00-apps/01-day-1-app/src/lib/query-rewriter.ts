import { z } from "zod";
import { generateObject } from "ai";
import { model } from "~/app/api/chat/model";
import type { SystemContext } from "./system-context";

export interface QueryPlan {
  plan: string;
  queries: string[];
}

export const queryPlanSchema = z.object({
  plan: z
    .string()
    .describe(
      "A detailed research plan that outlines the logical progression of information needed to answer the question. This should explain the strategy and reasoning behind the search queries.",
    ),
  queries: z
    .array(z.string())
    .min(1)
    .max(5)
    .describe(
      "A numbered list of 3-5 sequential search queries that progress logically from foundational to specific information. Each query should be specific and focused, written in natural language without Boolean operators.",
    ),
});

interface QueryRewriterOptions {
  langfuseTraceId?: string;
}

export const queryRewriter = async (
  context: SystemContext,
  opts?: QueryRewriterOptions,
) => {
  const result = await generateObject({
    model,
    schema: queryPlanSchema,
    system: `
You are a strategic research planner with expertise in breaking down complex questions into logical search steps. Your primary role is to create a detailed research plan before generating any search queries.

First, analyze the question thoroughly:
- Break down the core components and key concepts
- Identify any implicit assumptions or context needed
- Consider what foundational knowledge might be required
- Think about potential information gaps that need filling

Then, develop a strategic research plan that:
- Outlines the logical progression of information needed
- Identifies dependencies between different pieces of information
- Considers multiple angles or perspectives that might be relevant
- Anticipates potential dead-ends or areas needing clarification

Finally, translate this plan into a numbered list of 3-5 sequential search queries that:

- Are specific and focused (avoid broad queries that return general information)
- Are written in natural language without Boolean operators (no AND/OR)
- Progress logically from foundational to specific information
- Build upon each other in a meaningful way

Remember that initial queries can be exploratory - they help establish baseline information or verify assumptions before proceeding to more targeted searches. Each query should serve a specific purpose in your overall research plan.

<location-context>
${context.getLocationContext()}
</location-context>
`,
    prompt: `
<message-history>
${context.getMessages()}
</message-history>

Based on the user's question, create a strategic research plan and generate 3-5 sequential search queries that will help answer the question comprehensively.

<search-history>
${context.getSearchHistory()}
</search-history>
    `,
    experimental_telemetry: opts?.langfuseTraceId
      ? {
          isEnabled: true,
          functionId: "query-rewriter",
          metadata: {
            langfuseTraceId: opts.langfuseTraceId,
          },
        }
      : undefined,
  });

  // Report usage
  context.reportUsage("query-rewriter", result.usage);

  return result.object;
};
