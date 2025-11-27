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

interface CommonHowWeMetProps {
  howWeMet: Array<{ place: string; count: number }>;
}

export function CommonHowWeMet({ howWeMet }: CommonHowWeMetProps) {
  if (!howWeMet || howWeMet.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">How We Met</h3>
        <div className="flex items-center justify-center h-[300px] text-muted-foreground">
          No how-we-met data available
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">How We Met</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={howWeMet} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" />
          <YAxis dataKey="place" type="category" width={150} />
          <Tooltip />
          <Bar dataKey="count" fill="#82ca9d" />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}


