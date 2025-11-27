"use client";

import { Card } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface DatesOverTimeChartProps {
  data: Array<{ month: string; count: number }>;
}

export function DatesOverTimeChart({ data }: DatesOverTimeChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Dates Over Time</h3>
        <div className="flex items-center justify-center h-[300px] text-muted-foreground">
          No date history available
        </div>
      </Card>
    );
  }

  const formatMonth = (month: string) => {
    try {
      const [year, monthNum] = month.split("-");
      const date = new Date(parseInt(year), parseInt(monthNum) - 1);
      return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    } catch {
      return month;
    }
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Dates Over Time</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="month"
            tickFormatter={formatMonth}
            angle={-45}
            textAnchor="end"
            height={80}
            tick={{ fontSize: 11 }}
          />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip
            labelFormatter={(value) => formatMonth(value as string)}
          />
          <Line 
            type="monotone" 
            dataKey="count" 
            stroke="#8884d8" 
            strokeWidth={2}
            dot={{ fill: "#8884d8", r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}






