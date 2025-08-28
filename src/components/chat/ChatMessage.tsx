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
    const text = typeof message.content === "string" ? message.content.trim() : "";
    if (!text) return;
    // Quick heuristics to avoid trying to parse all text
    const looksLikeJson = (text.startsWith("{") && text.endsWith("}")) || (text.startsWith("[") && text.endsWith("]"));
    if (!looksLikeJson) return;
    try {
      parsedJson = JSON.parse(text);
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
          <pre className={cn(
            "text-xs md:text-sm whitespace-pre-wrap break-words font-mono",
            isUser ? "opacity-95" : "opacity-90",
          )}>
            {JSON.stringify(parsedJson, null, 2)}
          </pre>
        ) : (
          <div className="whitespace-pre-wrap break-words">{message.content}</div>
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
