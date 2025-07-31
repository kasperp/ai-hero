import { z } from "zod";
import { generateObject } from "ai";
import { model } from "~/app/api/chat/model";
import type { SystemContext } from "./system-context";

export interface ContinueAction {
  type: "continue";
  title: string;
  reasoning: string;
  feedback: string;
}

export interface AnswerAction {
  type: "answer";
  title: string;
  reasoning: string;
  feedback?: string;
}

export type Action = ContinueAction | AnswerAction;

export const actionSchema = z.object({
  type: z.enum(["continue", "answer"]).describe(
    `The type of action to take.
      - 'continue': Continue searching for more information to answer the question.
      - 'answer': Answer the user's question and complete the loop.`,
  ),
  title: z
    .string()
    .describe(
      "The title of the action, to be displayed in the UI. Be extremely concise. 'Searching for more information', 'Answering the question'",
    ),
  reasoning: z.string().describe("The reason you chose this step."),
  feedback: z
    .string()
    .optional()
    .describe(
      "For 'continue' type: Required. Detailed feedback about what information is still needed or what specific gaps remain. This will be used to guide the next search queries. Be specific about what information is missing and what types of queries would be most helpful. For 'answer' type: Optional. Only include if there are specific notes about answer quality or completeness.",
    ),
});

interface GetNextActionOptions {
  langfuseTraceId?: string;
}

export const getNextAction = async (
  context: SystemContext,
  opts?: GetNextActionOptions,
) => {
  const result = await generateObject({
    model,
    schema: actionSchema,
    system: `
You are a research query optimizer. Your task is to analyze search results against the original research goal and either decide to answer the question or to search for more information.

PROCESS:
1. Identify ALL information explicitly requested in the original research goal
2. Analyze what specific information has been successfully retrieved in the search results
3. Identify ALL information gaps between what was requested and what was found
4. For entity-specific gaps: Create targeted queries for each missing attribute of identified entities
5. For general knowledge gaps: Create focused queries to find the missing conceptual information

IMPORTANT: 
- If you choose 'continue': You MUST provide detailed feedback about what information is still needed. This feedback will be used to guide the next search queries.
- If you choose 'answer': You can omit the feedback field since you have enough information to answer the question.

<location-context>
${context.getLocationContext()}
</location-context>
`,
    prompt: `
<message-history>
${context.getMessages()}
</message-history>

Based on the context, choose the next action:

- Use 'continue' if you need more information to answer the question. This will trigger a new search phase. You MUST provide detailed feedback about what information is still needed.
- Use 'answer' if you have enough information to provide a comprehensive answer. You can omit the feedback field.

<search-history>
${context.getSearchHistory()}
</search-history>
    `,
    experimental_telemetry: opts?.langfuseTraceId
      ? {
          isEnabled: true,
          functionId: "get-next-action",
          metadata: {
            langfuseTraceId: opts.langfuseTraceId,
          },
        }
      : undefined,
  });

  return result.object;
};

export type MessageAnnotation = {
  type: "NEW_ACTION";
  action: {
    type: "continue" | "answer";
    title: string;
    reasoning: string;
    feedback?: string;
  };
};
