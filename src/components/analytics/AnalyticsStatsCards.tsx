"use client";

import { Card } from "@/components/ui/card";
import { 
    Calendar, 
    TrendingUp, 
    Clock, 
    MapPin,
    Users,
    Heart,
    BarChart3
} from "lucide-react";
import { DatingStatistics } from "@/lib/types";

interface AnalyticsStatsCardsProps {
    statistics: DatingStatistics;
}

export function AnalyticsStatsCards({ statistics }: AnalyticsStatsCardsProps) {
    const formatDays = (days?: number) => {
        if (!days) return "N/A";
        if (days < 30) return `${days} days`;
        if (days < 365) return `${Math.round(days / 30)} months`;
        return `${Math.round(days / 365)} years`;
    };

    const stats = [
        {
            label: "Total Dates",
            value: statistics.total_dates?.toLocaleString() || "0",
            icon: Calendar,
            color: "text-blue-500",
            bgColor: "bg-blue-500/10",
        },
        {
            label: "Avg Dates/Person",
            value: statistics.avg_dates_per_person?.toFixed(1) || "0",
            icon: BarChart3,
            color: "text-purple-500",
            bgColor: "bg-purple-500/10",
        },
        {
            label: "Avg Relationship",
            value: formatDays(statistics.avg_relationship_duration_days),
            icon: Clock,
            color: "text-amber-500",
            bgColor: "bg-amber-500/10",
        },
        {
            label: "Longest Relationship",
            value: statistics.longest_relationship 
                ? `${formatDays(statistics.longest_relationship.days)}`
                : "N/A",
            subtitle: statistics.longest_relationship?.name,
            icon: Heart,
            color: "text-rose-500",
            bgColor: "bg-rose-500/10",
        },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                    <Card key={index} className="p-4">
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <p className="text-sm font-medium text-muted-foreground mb-1">
                                    {stat.label}
                                </p>
                                <p className="text-2xl font-bold">{stat.value}</p>
                                {stat.subtitle && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {stat.subtitle}
                                    </p>
                                )}
                            </div>
                            <div className={`h-10 w-10 rounded-full ${stat.bgColor} flex items-center justify-center`}>
                                <Icon className={`h-5 w-5 ${stat.color}`} />
                            </div>
                        </div>
                    </Card>
                );
            })}
        </div>
    );
}






