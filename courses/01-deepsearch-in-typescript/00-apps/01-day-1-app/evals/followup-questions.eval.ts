import { evalite } from "evalite";
import { askDeepSearch } from "../src/app/api/chat/deep-search";
import type { Message } from "ai";

// Test data for followup questions evaluation
const followupTestData = [
  {
    input: "Hello!",
    expected: "clarification",
    description: "Simple greeting should trigger clarification",
  },
  {
    input: "Tell me about something",
    expected: "clarification",
    description: "Vague request should trigger clarification",
  },
  {
    input: "What's your favourite type of bat?",
    expected: "clarification",
    description: "Ambiguous question should trigger clarification",
  },
  {
    input: "How do I improve it?",
    expected: "clarification",
    description: "Missing context should trigger clarification",
  },
  {
    input: "What happened in the incident?",
    expected: "clarification",
    description: "Unknown reference should trigger clarification",
  },
  {
    input: "How much does it cost?",
    expected: "clarification",
    description: "Missing context should trigger clarification",
  },
  {
    input: "What's the weather like?",
    expected: "clarification",
    description: "Missing location/time should trigger clarification",
  },
  {
    input: "What are the health benefits of meditation?",
    expected: "search",
    description: "Clear question should proceed to search",
  },
  {
    input: "How does climate change affect sea levels?",
    expected: "search",
    description: "Clear question should proceed to search",
  },
  {
    input: "What is the current state of artificial intelligence research?",
    expected: "search",
    description: "Clear question should proceed to search",
  },
  {
    input: "What happened in the 2024 US presidential election?",
    expected: "search",
    description: "Clear question should proceed to search",
  },
];

evalite("Followup Questions Eval", {
  data: async () => {
    return followupTestData;
  },
  task: async (input: string) => {
    const messages: Message[] = [
      {
        id: "1",
        role: "user",
        content: input,
      },
    ];
    return askDeepSearch(messages);
  },
  scorers: [
    {
      name: "Clarification Detection",
      description:
        "Checks if the system correctly identifies questions that need clarification",
      scorer: ({ output, expected }) => {
        const isClarificationRequest =
          output.toLowerCase().includes("clarification") ||
          output.toLowerCase().includes("could you clarify") ||
          output.toLowerCase().includes("please specify") ||
          output.toLowerCase().includes("what do you mean") ||
          output.toLowerCase().includes("which") ||
          output.toLowerCase().includes("where") ||
          output.toLowerCase().includes("when") ||
          output.toLowerCase().includes("what specific");

        if (expected === "clarification") {
          return isClarificationRequest ? 1 : 0;
        } else {
          return isClarificationRequest ? 0 : 1;
        }
      },
    },
    {
      name: "Search Proceeding",
      description:
        "Checks if clear questions proceed to search (contain links or sources)",
      scorer: ({ output, expected }) => {
        const containsLinks = /\[[^\]]+\]\([^\)]+\)/.test(output);
        const containsSources =
          output.toLowerCase().includes("source") ||
          output.toLowerCase().includes("according to") ||
          output.toLowerCase().includes("research shows");

        if (expected === "search") {
          return containsLinks || containsSources ? 1 : 0;
        } else {
          return containsLinks || containsSources ? 0 : 1;
        }
      },
    },
    {
      name: "Response Quality",
      description: "Checks if responses are helpful and appropriate",
      scorer: ({ output, expected }) => {
        const isHelpful =
          output.length > 20 &&
          !output.toLowerCase().includes("i cannot") &&
          !output.toLowerCase().includes("i'm sorry") &&
          !output.toLowerCase().includes("i don't understand");

        return isHelpful ? 1 : 0;
      },
    },
  ],
});
