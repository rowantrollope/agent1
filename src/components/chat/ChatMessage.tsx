"use client";

import { ChatMessage as ChatMessageType } from "@/lib/types";
import { cn } from "@/lib/utils";

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

    // Try to parse as JSON - be more aggressive about detection
    try {
      parsedJson = JSON.parse(text);
      // If we successfully parsed, check if it's a meaningful object/array
      if (typeof parsedJson === "object" && parsedJson !== null) {
        // Check for nested JSON strings and parse them too
        const parseNestedJson = (obj: any): any => {
          if (typeof obj === "string") {
            try {
              const nested = JSON.parse(obj);
              if (typeof nested === "object" && nested !== null) {
                return parseNestedJson(nested);
              }
            } catch (_) {
              // Not JSON, return as is
            }
            return obj;
          } else if (Array.isArray(obj)) {
            return obj.map(parseNestedJson);
          } else if (typeof obj === "object" && obj !== null) {
            const result: any = {};
            for (const [key, value] of Object.entries(obj)) {
              result[key] = parseNestedJson(value);
            }
            return result;
          }
          return obj;
        };

        parsedJson = parseNestedJson(parsedJson);
      } else {
        // Don't format simple strings/numbers as JSON
        parsedJson = null;
      }
    } catch (_) {
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
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground",
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
          <div className="whitespace-pre-wrap break-words">
            {message.content}
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
