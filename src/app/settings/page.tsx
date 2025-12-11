"use client";

import { ToolsPanel } from "@/components/chat/ToolsPanel";
import { Card } from "@/components/ui/card";
import { Settings } from "lucide-react";
import { Header } from "@/components/Header";

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col overflow-hidden">
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <Settings className="h-6 w-6" />
              <h1 className="text-3xl font-bold">Settings</h1>
            </div>
            <p className="text-muted-foreground">
              Manage your MCP servers and available tools
            </p>
          </div>

          <ToolsPanel defaultExpanded={true} className="" />
        </div>
      </main>
    </div>
  );
}

