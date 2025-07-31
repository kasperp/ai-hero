import { z } from "zod";
import { generateObject } from "ai";
import { model } from "~/app/api/chat/model";
import type { SystemContext } from "./system-context";

export interface SearchAction {
  type: "search";
  query: string;
  title: string;
  reasoning: string;
}

export interface AnswerAction {
  type: "answer";
  title: string;
  reasoning: string;
}

export type Action = SearchAction | AnswerAction;

export const actionSchema = z.object({
  type: z.enum(["search", "answer"]).describe(
    `The type of action to take.
      - 'search': Search the web for more information and automatically scrape the URLs for detailed content.
      - 'answer': Answer the user's question and complete the loop.`,
  ),
  title: z
    .string()
    .describe(
      "The title of the action, to be displayed in the UI. Be extremely concise. 'Searching Saka's injury history', 'Checking HMRC industrial action', 'Comparing toaster ovens'",
    ),
  reasoning: z.string().describe("The reason you chose this step."),
  query: z
    .string()
    .describe("The query to search for. Required if type is 'search'.")
    .optional(),
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
You are a helpful assistant that can search the web (which automatically scrapes URLs for detailed content) or answer the user's question.

Your role is to choose the next action based on the available context.

${context.getLocationContext()}
`,
    prompt: `
    Message history:
${context.getMessages()}

Based on the context, choose the next action:

- Use 'search' if you need more information to answer the question. The search action will automatically scrape the URLs for detailed content.
- Use 'answer' if you have enough information to provide a comprehensive answer

Here is the context:

${context.getSearchHistory()}
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
    type: "search" | "answer";
    title: string;
    reasoning: string;
    query?: string;
  };
};
