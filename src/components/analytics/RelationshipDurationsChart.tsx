"use client";

import { Card } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface RelationshipDurationsChartProps {
  data: Array<{ name: string; days: number }>;
}

export function RelationshipDurationsChart({ data }: RelationshipDurationsChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Relationship Durations</h3>
        <div className="flex items-center justify-center h-[300px] text-muted-foreground">
          No duration data available
        </div>
      </Card>
    );
  }

  const formatDays = (days: number) => {
    if (days < 30) return `${days}d`;
    if (days < 365) return `${Math.round(days / 30)}mo`;
    return `${Math.round(days / 365)}yr`;
  };

  const chartData = data.map(item => ({
    ...item,
    formatted: formatDays(item.days)
  }));

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Relationship Durations</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            type="number" 
            tickFormatter={(value) => formatDays(value)}
          />
          <YAxis 
            dataKey="name" 
            type="category" 
            width={120}
            tick={{ fontSize: 12 }}
          />
          <Tooltip 
            formatter={(value: number) => `${value} days (${formatDays(value)})`}
          />
          <Bar dataKey="days" fill="#ffc658" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}






