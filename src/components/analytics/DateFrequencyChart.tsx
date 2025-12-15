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

interface DateFrequencyChartProps {
    data: Array<{ dates: number; people: number }>;
}

export function DateFrequencyChart({ data }: DateFrequencyChartProps) {
    if (!data || data.length === 0) {
        return (
            <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Date Frequency Distribution</h3>
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    No frequency data available
                </div>
            </Card>
        );
    }

    return (
        <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Date Frequency Distribution</h3>
            <p className="text-sm text-muted-foreground mb-4">
                How many people have each number of dates
            </p>
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                        dataKey="dates" 
                        label={{ value: "Number of Dates", position: "insideBottom", offset: -5 }}
                        tick={{ fontSize: 11 }}
                    />
                    <YAxis 
                        label={{ value: "Number of People", angle: -90, position: "insideLeft" }}
                        tick={{ fontSize: 11 }}
                    />
                    <Tooltip />
                    <Bar dataKey="people" fill="#ff7300" radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </Card>
    );
}






