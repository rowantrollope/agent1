"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { CommonHowWeMet } from "@/components/analytics/CommonHowWeMet";
import { AnalyticsStatsCards } from "@/components/analytics/AnalyticsStatsCards";
import { DatesPerPersonChart } from "@/components/analytics/DatesPerPersonChart";
import { DateLocationsChart } from "@/components/analytics/DateLocationsChart";
import { DatesOverTimeChart } from "@/components/analytics/DatesOverTimeChart";
import { RelationshipDurationsChart } from "@/components/analytics/RelationshipDurationsChart";
import { DateFrequencyChart } from "@/components/analytics/DateFrequencyChart";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DatingStatistics, AnalyticsData } from "@/lib/types";

export default function AnalyticsPage() {
  const [statistics, setStatistics] = useState<DatingStatistics | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalyticsData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/dashboard");
      const result = await response.json();
      
      if (result.success) {
        setStatistics(result.statistics);
        setAnalytics(result.analytics || null);
      } else {
        setError(result.error || "Failed to load analytics data");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analytics data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="container mx-auto px-4 py-6 flex-1 flex items-center justify-center">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Loading analytics...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="container mx-auto px-4 py-6 flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={fetchAnalyticsData} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="container mx-auto px-4 py-6 flex-1 max-w-7xl">
        <div className="space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
              <p className="text-muted-foreground mt-1">
                Comprehensive insights into your dating life
              </p>
            </div>
            <Button onClick={fetchAnalyticsData} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {/* Stats Cards */}
          {statistics && (
            <AnalyticsStatsCards statistics={statistics} />
          )}

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* How We Met */}
            {statistics && (
              <CommonHowWeMet
                howWeMet={
                  statistics.common_how_we_met ||
                  statistics.common_meeting_places ||
                  []
                }
              />
            )}

            {/* Dates Over Time */}
            {analytics && analytics.dates_by_month.length > 0 && (
              <DatesOverTimeChart data={analytics.dates_by_month} />
            )}

            {/* Dates Per Person */}
            {analytics && analytics.dates_per_person.length > 0 && (
              <DatesPerPersonChart data={analytics.dates_per_person} />
            )}

            {/* Date Locations */}
            {analytics && analytics.date_locations.length > 0 && (
              <DateLocationsChart data={analytics.date_locations} />
            )}

            {/* Relationship Durations */}
            {analytics && analytics.relationship_durations.length > 0 && (
              <RelationshipDurationsChart data={analytics.relationship_durations} />
            )}

            {/* Date Frequency Distribution */}
            {analytics && analytics.date_frequency_distribution.length > 0 && (
              <DateFrequencyChart data={analytics.date_frequency_distribution} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}


