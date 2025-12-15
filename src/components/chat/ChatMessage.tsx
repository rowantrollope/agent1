"use client";

import { ChatMessage as ChatMessageType } from "@/lib/types";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ChatMessageProps {
        message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
        const isUser = message.role === "user";

        // Attempt to parse JSON content for pretty display
        let parsedJson: unknown | null = null;
        (() => {
            const text =
                typeof message.content === "string" ? message.content.trim() : "";
            if (!text) return;

            const parseNestedJson = (obj: unknown): unknown => {
                if (typeof obj === "string") {
                    try {
                        const nested = JSON.parse(obj);
                        if (typeof nested === "object" && nested !== null) {
                            return parseNestedJson(nested);
                        }
                    } catch {
                        // Not JSON, return as is
                    }
                    return obj;
                }

                if (Array.isArray(obj)) {
                    return obj.map(parseNestedJson);
                }

                if (obj && typeof obj === "object") {
                    const normalized: Record<string, unknown> = {};
                    for (const [key, value] of Object.entries(
                        obj as Record<string, unknown>,
                    )) {
                        normalized[key] = parseNestedJson(value);
                    }
                    return normalized;
                }

                return obj;
            };

            // Try to parse as JSON - be more aggressive about detection
            try {
                parsedJson = JSON.parse(text);
                // If we successfully parsed, check if it's a meaningful object/array
                if (typeof parsedJson === "object" && parsedJson !== null) {
                    parsedJson = parseNestedJson(parsedJson);
                } else {
                    // Don't format simple strings/numbers as JSON
                    parsedJson = null;
                }
            } catch {
                parsedJson = null;
            }
        })();

        return (
            <div
                className={cn(
                    "flex w-full mb-4",
                    isUser ? "justify-end" : "justify-start",
                )}
            >
                <div
                    className={cn(
                        "max-w-[80%] rounded-lg px-4 py-2",
                        isUser
                            ? "bg-pink-500 text-white"
                            : "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100",
                    )}
                >
                    {parsedJson !== null ? (
                        <pre
                            className={cn(
                                "text-xs md:text-sm whitespace-pre-wrap break-words font-mono",
                                isUser ? "opacity-95" : "opacity-90",
                            )}
                        >
                            {JSON.stringify(parsedJson, null, 2)}
                        </pre>
                    ) : (
                        <div className="prose prose-sm max-w-none prose-gray dark:prose-invert whitespace-pre-wrap break-words">
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                    // Override default styles to inherit text color
                                    p: ({ children }) => (
                                        <p className="mb-2 last:mb-0 text-current">{children}</p>
                                    ),
                                    strong: ({ children }) => (
                                        <strong className="font-bold text-current">{children}</strong>
                                    ),
                                    em: ({ children }) => (
                                        <em className="italic text-current">{children}</em>
                                    ),
                                    h1: ({ children }) => (
                                        <h1 className="text-lg font-bold mb-2 text-current">
                                            {children}
                                        </h1>
                                    ),
                                    h2: ({ children }) => (
                                        <h2 className="text-base font-bold mb-2 text-current">
                                            {children}
                                        </h2>
                                    ),
                                    h3: ({ children }) => (
                                        <h3 className="text-sm font-bold mb-1 text-current">
                                            {children}
                                        </h3>
                                    ),
                                    code: ({ children, className }) =>
                                        className ? (
                                            <code
                                                className={`${className} bg-gray-800 text-gray-100 dark:bg-gray-700 dark:text-gray-200 px-1 py-0.5 rounded text-sm font-mono`}
                                            >
                                                {children}
                                            </code>
                                        ) : (
                                            <code className="bg-gray-800 text-gray-100 dark:bg-gray-700 dark:text-gray-200 px-1 py-0.5 rounded text-sm font-mono">
                                                {children}
                                            </code>
                                        ),
                                    pre: ({ children }) => (
                                        <pre className="bg-gray-800 text-gray-100 dark:bg-gray-700 dark:text-gray-200 p-3 rounded-md overflow-x-auto my-2">
                                            {children}
                                        </pre>
                                    ),
                                    ul: ({ children }) => (
                                        <ul className="list-disc ml-4 mb-2 text-current">
                                            {children}
                                        </ul>
                                    ),
                                    ol: ({ children }) => (
                                        <ol className="list-decimal ml-4 mb-2 text-current">
                                            {children}
                                        </ol>
                                    ),
                                    li: ({ children }) => (
                                        <li className="mb-1 text-current">{children}</li>
                                    ),
                                }}
                            >
                                {message.content}
                            </ReactMarkdown>
                        </div>
                    )}
                    <div className="text-xs opacity-70 mt-1">
                        {message.timestamp.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                        })}
                    </div>
                </div>
            </div>
        );
}
