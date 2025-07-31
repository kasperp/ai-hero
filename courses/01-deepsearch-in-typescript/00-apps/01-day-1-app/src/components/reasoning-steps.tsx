import { useState } from "react";
import {
  SearchIcon,
  MessageSquareIcon,
  LightbulbIcon,
  GlobeIcon,
  HashIcon,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { MessageAnnotation } from "~/lib/get-next-action";

export const ReasoningSteps = ({
  annotations,
}: {
  annotations: MessageAnnotation[];
}) => {
  const [openStep, setOpenStep] = useState<number | null>(null);

  if (annotations.length === 0) return null;

  return (
    <div className="mb-4 w-full">
      <ul className="space-y-1">
        {annotations.map((annotation, index) => {
          const isOpen = openStep === index;
          return (
            <li key={index} className="relative">
              <button
                onClick={() => setOpenStep(isOpen ? null : index)}
                className={`min-w-34 flex w-full flex-shrink-0 items-center rounded px-2 py-1 text-left text-sm transition-colors ${
                  isOpen
                    ? "bg-gray-700 text-gray-200"
                    : "text-gray-400 hover:bg-gray-800 hover:text-gray-300"
                }`}
              >
                <span
                  className={`z-10 mr-3 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 border-gray-500 text-xs font-bold ${
                    isOpen
                      ? "border-blue-400 text-white"
                      : "bg-gray-800 text-gray-300"
                  }`}
                >
                  {index + 1}
                </span>
                <div className="flex items-center gap-2">
                  {annotation.type === "NEW_ACTION" ? (
                    annotation.action.type === "continue" ? (
                      <SearchIcon className="size-4" />
                    ) : (
                      <MessageSquareIcon className="size-4" />
                    )
                  ) : annotation.type === "SOURCES" ? (
                    <GlobeIcon className="size-4" />
                  ) : annotation.type === "TOKEN_USAGE" ? (
                    <HashIcon className="size-4" />
                  ) : null}
                  {annotation.type === "NEW_ACTION"
                    ? annotation.action.title
                    : annotation.type === "SOURCES"
                      ? `${annotation.sources.length} sources found`
                      : annotation.type === "TOKEN_USAGE"
                        ? `Tokens: ${annotation.totalTokens.toLocaleString()}`
                        : ""}
                </div>
              </button>
              <div className={`${isOpen ? "mt-1" : "hidden"}`}>
                {isOpen && (
                  <div className="space-y-3 px-2 py-1">
                    {annotation.type === "NEW_ACTION" ? (
                      <>
                        <div className="text-sm italic text-gray-400">
                          <div className="mb-1 font-medium text-gray-300">
                            Reasoning:
                          </div>
                          <ReactMarkdown>
                            {annotation.action.reasoning}
                          </ReactMarkdown>
                        </div>
                        {annotation.action.feedback && (
                          <div className="border-l-2 border-blue-400 pl-3 text-sm text-blue-300">
                            <div className="mb-1 flex items-center gap-1 font-medium text-blue-200">
                              <LightbulbIcon className="size-4" />
                              Feedback for next search:
                            </div>
                            <ReactMarkdown>
                              {annotation.action.feedback}
                            </ReactMarkdown>
                          </div>
                        )}
                      </>
                    ) : annotation.type === "SOURCES" ? (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {annotation.sources.map((source, sourceIndex) => (
                          <a
                            key={sourceIndex}
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group block rounded-lg border border-gray-600 bg-gray-800 p-3 transition-colors hover:border-gray-500 hover:bg-gray-700"
                          >
                            <div className="flex items-start gap-3">
                              {source.favicon && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={source.favicon}
                                  alt=""
                                  className="mt-0.5 size-4 flex-shrink-0 rounded"
                                  onError={(e) => {
                                    // Hide the image if it fails to load
                                    (
                                      e.target as HTMLImageElement
                                    ).style.display = "none";
                                  }}
                                />
                              )}
                              <div className="min-w-0 flex-1">
                                <h4 className="mb-1 text-sm font-medium text-gray-200 group-hover:text-white">
                                  {source.title}
                                </h4>
                                <p
                                  className="overflow-hidden text-ellipsis text-xs text-gray-400"
                                  style={{
                                    display: "-webkit-box",
                                    WebkitLineClamp: 3,
                                    WebkitBoxOrient: "vertical",
                                  }}
                                >
                                  {source.snippet}
                                </p>
                                <p className="mt-1 truncate text-xs text-gray-500">
                                  {new URL(source.url).hostname}
                                </p>
                              </div>
                            </div>
                          </a>
                        ))}
                      </div>
                    ) : annotation.type === "TOKEN_USAGE" ? (
                      <div className="text-sm text-gray-400">
                        <div className="mb-1 font-medium text-gray-300">
                          Token Usage:
                        </div>
                        <div className="text-gray-300">
                          Total tokens used:{" "}
                          {annotation.totalTokens.toLocaleString()}
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
