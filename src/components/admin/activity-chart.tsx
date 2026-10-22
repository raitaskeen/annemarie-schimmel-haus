"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

const config = {
  enrollments: { label: "Course applications", color: "var(--chart-1)" },
  events: { label: "Event registrations", color: "var(--chart-2)" },
  placement: { label: "Placement tests", color: "var(--chart-4)" },
} satisfies ChartConfig;

export function ActivityChart({ data }: { data: { day: string; enrollments: number; events: number; placement: number }[] }) {
  return (
    <ChartContainer config={config} className="aspect-auto h-72 w-full">
      <AreaChart data={data} margin={{ left: -16, right: 8, top: 8 }}>
        <defs>
          {Object.keys(config).map((k) => (
            <linearGradient key={k} id={`fill-${k}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={`var(--color-${k})`} stopOpacity={0.35} />
              <stop offset="95%" stopColor={`var(--color-${k})`} stopOpacity={0.02} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="day"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={24}
          tickFormatter={(v: string) => new Date(`${v}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
        />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={40} />
        <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" labelFormatter={(v) => new Date(`${v}T00:00:00`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })} />} />
        {(Object.keys(config) as (keyof typeof config)[]).map((k) => (
          <Area key={k} dataKey={k} type="monotone" stroke={`var(--color-${k})`} strokeWidth={2} fill={`url(#fill-${k})`} isAnimationActive={false} />
        ))}
        <ChartLegend content={<ChartLegendContent />} />
      </AreaChart>
    </ChartContainer>
  );
}
