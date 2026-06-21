'use client';

import * as React from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, Pie, PieChart, Cell, Line, LineChart, YAxis, Tooltip } from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import type { Lead } from '@/types';

interface LeadAnalyticsChartsProps {
  leads: Lead[];
}

const chartConfigStatus = {
  leads: { label: 'Prospects' },
  New: { label: 'New Discovery', color: 'hsl(var(--chart-1))' },
  Contacted: { label: 'Engagement', color: 'hsl(var(--chart-4))' },
  Qualified: { label: 'High Intent', color: 'hsl(var(--chart-3))' },
  Lost: { label: 'Discarded', color: 'hsl(var(--chart-5))' },
};

const chartConfigConfidence = {
  leads: { label: 'Confidence' },
  color: 'hsl(var(--primary))'
};

export function LeadAnalyticsCharts({ leads }: LeadAnalyticsChartsProps) {
  const statusData = React.useMemo(() => {
    const counts: { [key: string]: number } = { New: 0, Contacted: 0, Qualified: 0, Lost: 0 };
    leads.forEach((lead) => {
      if (counts[lead.status] !== undefined) counts[lead.status]++;
    });
    return Object.entries(counts).map(([name, value]) => ({
      name,
      leads: value,
      fill: (chartConfigStatus as any)[name]?.color || 'hsl(var(--chart-2))',
    }));
  }, [leads]);

  const sourceData = React.useMemo(() => {
    const counts: Record<string, number> = {};
    leads.forEach(l => {
      counts[l.source] = (counts[l.source] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [leads]);

  return (
    <>
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Discovery Pipeline</CardTitle>
          <CardDescription>
            Leads categorized by their journey from discovery to qualification.
          </CardDescription>
        </CardHeader>
        <CardContent className="pl-2">
          <ChartContainer config={chartConfigStatus} className="h-[300px] w-full">
            <BarChart
              accessibilityLayer
              data={statusData}
              margin={{ top: 20 }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="name"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="dot" />}
              />
              <Bar dataKey="leads" radius={8} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
      
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle>Source Performance</CardTitle>
          <CardDescription>Where your highest intent leads are coming from.</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 pb-0">
          <ChartContainer
            config={{}}
            className="mx-auto aspect-square h-[250px]"
          >
            <PieChart>
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel />}
              />
              <Pie
                data={sourceData}
                dataKey="value"
                nameKey="name"
                innerRadius={60}
                strokeWidth={5}
              >
                {sourceData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={`hsl(var(--chart-${(index % 5) + 1}))`} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
          <div className="flex flex-wrap gap-2 justify-center pb-6">
             {sourceData.map((s, i) => (
               <div key={i} className="flex items-center gap-1">
                 <div className="w-2 h-2 rounded-full" style={{ backgroundColor: `hsl(var(--chart-${(i % 5) + 1}))` }} />
                 <span className="text-[10px] text-muted-foreground">{s.name}</span>
               </div>
             ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
