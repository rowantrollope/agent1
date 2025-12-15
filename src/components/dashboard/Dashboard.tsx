"use client";

import { useState, useEffect } from "react";
import { DashboardData } from "@/lib/types";
import { StatsCards } from "./StatsCards";
import { DatingCharts } from "./DatingCharts";
import { ActiveDatingTable } from "./ActiveDatingTable";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Dashboard() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchDashboardData = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch("/api/dashboard");
            const result = await response.json();
            
            if (result.success) {
                setData({
                    statistics: result.statistics,
                    activePeople: result.activePeople || [],
                    nextDate: result.nextDate,
                    datingHistory: result.datingHistory || [],
                });
            } else {
                setError(result.error || "Failed to load dashboard data");
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load dashboard data");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, []);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-center">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-center">
                    <p className="text-destructive mb-4">{error}</p>
                    <Button onClick={fetchDashboardData} variant="outline">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Retry
                    </Button>
                </div>
            </div>
        );
    }

    if (!data) {
        return null;
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Dating Dashboard</h2>
                <Button onClick={fetchDashboardData} variant="outline" size="sm">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                </Button>
            </div>

            <StatsCards
                statistics={data.statistics}
                nextDate={data.nextDate}
            />

            <ActiveDatingTable
                activePeople={data.activePeople}
                onUpdate={fetchDashboardData}
            />

            <DatingCharts
                statistics={data.statistics}
                datingHistory={data.datingHistory || []}
            />
        </div>
    );
}

