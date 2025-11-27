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
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { DatingStatistics } from "@/lib/types";

interface DatingChartsProps {
  statistics: DatingStatistics;
  datingHistory: Array<{ month: string; count: number }>;
}

const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff7300", "#00ff00"];

export function DatingCharts({
  statistics,
  datingHistory,
}: DatingChartsProps) {
  const statusData = [
    { name: "Active", value: statistics.active_count },
    { name: "Not Pursuing", value: statistics.not_pursuing_count },
    { name: "Paused", value: statistics.paused_count },
    { name: "Exploring", value: statistics.exploring_count },
  ].filter((item) => item.value > 0);

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
    <div className="grid grid-cols-1 gap-2">
      <Card className="p-3">
        <h3 className="text-lg font-semibold mb-4">Dating History</h3>
        {datingHistory.length > 0 ? (
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={datingHistory}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="month"
                tickFormatter={formatMonth}
                angle={-45}
                textAnchor="end"
                height={60}
                tick={{ fontSize: 10 }}
              />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip
                labelFormatter={(value) => formatMonth(value as string)}
              />
              <Bar dataKey="count" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[150px] text-muted-foreground text-sm">
            No dating history data available
          </div>
        )}
      </Card>

      <Card className="p-3">
        <h3 className="text-lg font-semibold mb-4">Status Distribution</h3>
        {statusData.length > 0 ? (
          <ResponsiveContainer width="100%" height={150}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) =>
                  `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`
                }
                outerRadius={50}
                fill="#8884d8"
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: '10px' }} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[150px] text-muted-foreground text-sm">
            No status data available
          </div>
        )}
      </Card>
    </div>
  );
}

