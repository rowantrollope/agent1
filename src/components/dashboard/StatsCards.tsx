"use client";

import { Card } from "@/components/ui/card";
import { Users, Heart, Calendar, TrendingUp } from "lucide-react";
import { DatingStatistics } from "@/lib/types";

interface StatsCardsProps {
  statistics: DatingStatistics;
  nextDate?: {
    name: string;
    date: string;
  };
}

export function StatsCards({ statistics, nextDate }: StatsCardsProps) {
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="grid grid-cols-2 gap-2">
      <Card className="p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Active Dating
            </p>
            <p className="text-2xl font-bold mt-1">{statistics.active_count}</p>
          </div>
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Heart className="h-4 w-4 text-primary" />
          </div>
        </div>
      </Card>

      <Card className="p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Total People
            </p>
            <p className="text-2xl font-bold mt-1">
              {statistics.total_people}
            </p>
          </div>
          <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center">
            <Users className="h-4 w-4 text-blue-500" />
          </div>
        </div>
      </Card>

      <Card className="p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Not Pursuing
            </p>
            <p className="text-2xl font-bold mt-1">
              {statistics.not_pursuing_count}
            </p>
          </div>
          <div className="h-8 w-8 rounded-full bg-gray-500/10 flex items-center justify-center">
            <TrendingUp className="h-4 w-4 text-gray-500" />
          </div>
        </div>
      </Card>

      <Card className="p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Next Date
            </p>
            {nextDate ? (
              <>
                <p className="text-sm font-semibold mt-1">{nextDate.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(nextDate.date)}
                </p>
              </>
            ) : (
              <p className="text-sm font-semibold mt-1 text-muted-foreground">
                None scheduled
              </p>
            )}
          </div>
          <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center">
            <Calendar className="h-4 w-4 text-green-500" />
          </div>
        </div>
      </Card>
    </div>
  );
}

