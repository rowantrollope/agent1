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

interface DateLocationsChartProps {
    data: Array<{ location: string; count: number }>;
}

export function DateLocationsChart({ data }: DateLocationsChartProps) {
    if (!data || data.length === 0) {
        return (
            <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Top Date Locations</h3>
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    No location data available
                </div>
            </Card>
        );
    }

    return (
        <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Top Date Locations</h3>
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis 
                        dataKey="location" 
                        type="category" 
                        width={150}
                        tick={{ fontSize: 12 }}
                    />
                    <Tooltip />
                    <Bar dataKey="count" fill="#82ca9d" radius={[0, 4, 4, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </Card>
    );
}






