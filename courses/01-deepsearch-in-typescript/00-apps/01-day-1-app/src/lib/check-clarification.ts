import { generateObject } from "ai";
import { z } from "zod";
import { streamText } from "ai";
import { guardrailModel } from "~/app/api/chat/model";
import type { SystemContext } from "./system-context";

export const checkIfQuestionNeedsClarification = async (
  ctx: SystemContext,
  langfuseTraceId?: string,
) => {
  const messageHistory: string = ctx.getMessages();
  const currentContext = ctx.getCurrentContext();

  const result = await generateObject({
    model: guardrailModel,
    schema: z.object({
      needsClarification: z.boolean(),
      reason: z
        .string()
        .optional()
        .describe("If needsClarification is true, explain why."),
    }),
    system: `You are a clarification assessment agent for a DeepSearch system. Your job is to determine whether a user's question requires clarification before conducting a comprehensive search and response.

## Current Context

${currentContext || "No context available"}

## Your Task

Analyze the user's question and determine if it needs clarification. Respond with a JSON object in this exact format:

{ "needsClarification": boolean, "reason": "string" }

- Include 'reason' only if 'needsClarification' is true
- Keep the reason concise and specific

## When to Request Clarification

Request clarification ONLY if the question is genuinely ambiguous and reasonable assumptions cannot be made. Be conservative - only ask for clarification when it would significantly improve the search results.

### 1. Truly Ambiguous References

- Unfamiliar names of people, organizations, or entities that could refer to multiple things
- Unclear geographic references that could be multiple places
- Technical terms or jargon that could have multiple meanings in the same context

**Examples:**

- "What's the latest on the Johnson case?" (if there are multiple well-known Johnson cases)
- "How is the company performing?" (if the conversation hasn't established which company)
- "What happened in the incident?" (if multiple incidents have been discussed)

### 2. Missing Critical Context That Affects Search Strategy

- Time frame is unclear when it matters for accuracy AND reasonable assumptions can't be made
- The user's specific use case would significantly change what sources to search
- Important constraints that would change the research approach

**Examples:**

- "What are the current regulations?" (if multiple jurisdictions/industries could apply)
- "How much does it cost?" (if multiple products/services have been discussed)

### 3. Contradictory Information

- The question contains contradictory elements that can't be resolved
- Essential information appears to be missing AND reasonable assumptions can't be made

## When NOT to Request Clarification

Do NOT request clarification for:

- Questions that are clear and searchable, even if broad
- Common names or well-known entities
- Questions where reasonable assumptions can be made based on context
- Topics where a comprehensive overview would be valuable
- Questions that are self-contained and unambiguous
- References to recent events, current year, or common knowledge
- Location-specific questions when user location is known
- Time-based questions where "current" or "recent" is clear from context

**Examples of questions that DON'T need clarification:**

- "What are the health benefits of meditation?"
- "How does climate change affect sea levels?"
- "What is the current state of artificial intelligence research?"
- "What happened in the 2024 US presidential election?"
- "What's the weather like?" (when user location is known)
- "What are the latest developments?" (assume recent/current)
- "How is the economy doing?" (assume current state)
- "What are the best restaurants?" (assume user's location)

## Assumptions to Make

When in doubt, assume:

- "Current" or "latest" refers to recent/ongoing developments
- "Best" or "top" refers to generally recognized quality
- Location-specific questions refer to the user's location
- Time references without specific dates refer to recent/current time
- Common terms refer to their most common meaning
- The user wants comprehensive, up-to-date information

## Response Format

Always respond with valid JSON only. No additional text or explanation.

**If clarification is needed:**

{
"needsClarification": true,
"reason": "The question refers to 'the recent merger' but doesn't specify which companies or industry"
}

**If no clarification is needed:**

{ "needsClarification": false }

## Guidelines

- Be conservative - only request clarification when it would significantly improve the search results
- Focus on clarifications that would change the research approach or sources
- Prioritize the most critical missing information
- Keep reasons specific and actionable for the user
- Assume reasonable defaults rather than asking for clarification`,
    prompt: messageHistory,
    experimental_telemetry: langfuseTraceId
      ? {
          isEnabled: true,
          functionId: "clarification-check",
          metadata: {
            langfuseTraceId,
          },
        }
      : undefined,
  });

  // Report usage
  ctx.reportUsage("clarification-check", result.usage);

  return result.object;
};

export const generateClarificationRequest = async (
  ctx: SystemContext,
  reason: string,
  langfuseTraceId?: string,
) => {
  const messageHistory: string = ctx.getMessages();

  const result = streamText({
    model: guardrailModel,
    system: `You are a clarification agent for a DeepSearch system.
Your job is to ask the user for clarification on their question.

Be helpful, friendly, and specific. Ask for the most important missing information that would help provide a better answer.

Keep your response concise and actionable. Don't be overly formal or robotic.`,
    prompt: `Here is the message history:

${messageHistory}

And here is why the question needs clarification:

${reason}

Please reply to the user with a clarification request.`,
    experimental_telemetry: langfuseTraceId
      ? {
          isEnabled: true,
          functionId: "clarification-request",
          metadata: {
            langfuseTraceId,
          },
        }
      : undefined,
  });

  // Report usage when the stream completes
  void result.usage.then((usage) => {
    ctx.reportUsage("clarification-request", usage);
  });

  return result;
};
