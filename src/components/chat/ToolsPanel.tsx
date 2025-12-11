"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Wrench, ChevronDown, ChevronUp, Plug, AlertCircle, CheckCircle2, XCircle, Power } from "lucide-react";
import { cn } from "@/lib/utils";

interface Tool {
  name: string;
  description: string;
  parameters?: Record<string, unknown>;
}

interface ServerInfo {
  description: string;
  status: "connected" | "not_connected" | "error" | "disabled";
  enabled?: boolean;
  error?: string;
  tools: Tool[];
}

interface ToolsData {
  success: boolean;
  error?: string;
  servers: Record<string, ServerInfo>;
}

interface ToolsPanelProps {
  defaultExpanded?: boolean;
  className?: string;
}

export function ToolsPanel({ defaultExpanded = false, className }: ToolsPanelProps) {
  const [toolsData, setToolsData] = useState<ToolsData | null>(null);
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [, setLoading] = useState(false);
  
  // Always keep expanded when defaultExpanded is true
  const effectiveExpanded = defaultExpanded ? true : isExpanded;

  const loadTools = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/mcp/tools");
      const data = await response.json();
      setToolsData(data);
    } catch (error) {
      console.error("Failed to load MCP tools:", error);
      setToolsData({
        success: false,
        error: "Failed to load tools",
        servers: {}
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTools();
    // Refresh tools every 30 seconds
    const interval = setInterval(loadTools, 30000);
    return () => clearInterval(interval);
  }, []);

  const toggleServer = async (serverName: string, enabled: boolean) => {
    try {
      const endpoint = enabled ? "enable" : "disable";
      const response = await fetch(`/api/mcp/${endpoint}/${serverName}`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(`Failed to ${endpoint} server`);
      }

      // Refresh tools after toggle
      await loadTools();
    } catch (error) {
      console.error(`Error toggling server ${serverName}:`, error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "connected":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "not_connected":
        return <XCircle className="h-4 w-4 text-yellow-500" />;
      case "disabled":
        return <Power className="h-4 w-4 text-gray-400" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <XCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "connected":
        return "Connected";
      case "not_connected":
        return "Not Connected";
      case "disabled":
        return "Disabled";
      case "error":
        return "Error";
      default:
        return "Unknown";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "connected":
        return "bg-green-100 text-green-800 border-green-200";
      case "not_connected":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "disabled":
        return "bg-gray-100 text-gray-600 border-gray-200";
      case "error":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  if (!toolsData) {
    return (
      <Card className={cn(className || "border-t rounded-t-none", defaultExpanded && "py-0")}>
        <div className="p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Wrench className="h-4 w-4" />
            Loading tools...
          </div>
        </div>
      </Card>
    );
  }

  const totalServers = Object.keys(toolsData.servers).length;
  const connectedServers = Object.values(toolsData.servers).filter(s => s.status === "connected").length;
  const totalTools = Object.values(toolsData.servers).reduce((sum, server) => sum + server.tools.length, 0);

  return (
    <Card className={cn(className || "border-t rounded-t-none", defaultExpanded && "py-0")}>
      {/* Header */}
      <div className="p-3 border-b bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            <span className="font-medium text-sm">Available Tools</span>
            <Badge variant="secondary" className="text-xs">
              {totalTools} tools
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Plug className="h-3 w-3" />
              {connectedServers}/{totalServers} servers
            </div>
            {!defaultExpanded && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="h-6 w-6 p-0"
              >
                {isExpanded ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      {effectiveExpanded && (
        <div className={`p-3 ${defaultExpanded ? '' : 'max-h-60'} overflow-y-auto`}>
          {!toolsData.success ? (
            <div className="text-sm text-red-600">
              Error loading tools: {toolsData.error}
            </div>
          ) : Object.keys(toolsData.servers).length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-4">
              No MCP servers configured
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(toolsData.servers).map(([serverName, serverInfo]) => (
                <div key={serverName} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(serverInfo.status)}
                      <span className="font-medium text-sm">{serverName}</span>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${getStatusColor(serverInfo.status)}`}
                      >
                        {getStatusText(serverInfo.status)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={serverInfo.enabled !== false}
                        onCheckedChange={(checked) => toggleServer(serverName, checked)}
                        className="h-4 w-7"
                      />
                      <span className="text-xs text-muted-foreground">
                        {serverInfo.tools.length} tools
                      </span>
                    </div>
                  </div>
                  
                  {serverInfo.description && (
                    <p className="text-xs text-muted-foreground pl-6">
                      {serverInfo.description}
                    </p>
                  )}

                  {serverInfo.error && (
                    <p className="text-xs text-red-600 pl-6">
                      Error: {serverInfo.error}
                    </p>
                  )}

                  {serverInfo.tools.length > 0 && (
                    <div className="pl-6 space-y-1">
                      {serverInfo.tools.map((tool, index) => (
                        <div key={index} className="flex items-start gap-2 text-xs">
                          <span className="font-mono text-blue-600">{tool.name}</span>
                          {tool.description && (
                            <span className="text-muted-foreground">
                              - {tool.description}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}