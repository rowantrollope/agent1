"use client";

import { useState, useEffect, useRef } from "react";
import { ChatMessage as ChatMessageType } from "@/lib/types";

interface RawChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Trash2, Bot } from "lucide-react";

export function ChatInterface() {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Load chat history on component mount
    loadChatHistory();
  }, []);

  const loadChatHistory = async () => {
    try {
      const response = await fetch("/api/chat-python");
      const data = await response.json();
      if (data.history) {
        setMessages(
          data.history.map((msg: RawChatMessage) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          })),
        );
      }
    } catch (error) {
      console.error("Failed to load chat history:", error);
    }
  };

  const handleSendMessage = async (messageContent: string) => {
    // Add user message immediately
    const userMessage: ChatMessageType = {
      id: `user-${Date.now()}`,
      role: "user",
      content: messageContent,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat-python", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: messageContent }),
      });

      const data = await response.json();

      if (data.history) {
        setMessages(
          data.history.map((msg: RawChatMessage) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          })),
        );
      }
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = async () => {
    try {
      const response = await fetch("/api/chat-python", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "clear" }),
      });

      if (response.ok) {
        // Clear local state and reload to ensure a clean session
        setMessages([]);
        if (typeof window !== "undefined") {
          window.location.reload();
        }
      }
    } catch (error) {
      console.error("Failed to clear chat:", error);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      <Card className="flex flex-col flex-1 min-h-0 pt-0 pb-0">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-muted/50 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            <h2 className="font-semibold">Chat</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearChat}
              disabled={isLoading || messages.length === 0}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Clear
            </Button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 min-h-0">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">Welcome to DateGPT</p>
                <p className="text-sm">
                  Start a conversation by typing a message below.
                </p>
              </div>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}
              {isLoading && (
                <div className="flex justify-start mb-4">
                  <div className="bg-muted text-muted-foreground rounded-lg px-4 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">Thinking</span>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-current rounded-full animate-pulse" />
                        <div className="w-2 h-2 bg-current rounded-full animate-pulse delay-100" />
                        <div className="w-2 h-2 bg-current rounded-full animate-pulse delay-200" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input */}
        <div className="flex-shrink-0">
          <ChatInput onSendMessage={handleSendMessage} disabled={isLoading} />
        </div>
      </Card>
    </div>
  );
}
