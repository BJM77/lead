'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { LeadDataTable } from '@/components/lead-data-table';
import { columns } from '@/components/lead-columns';
import type { Lead } from '@/types';
import { DiscoverLeadsDialog } from '@/components/discover-leads-dialog';
import { AnalyticsCard } from '@/components/analytics-card';
import { Target, Users, Zap, BarChart, Loader2, UserCircle, TrendingUp, ShieldCheck, CheckCircle } from 'lucide-react';
import { LeadAnalyticsCharts } from '@/components/lead-analytics-charts';
import { listenToLeads } from '@/lib/db';
import { auth } from '@/lib/firebase';
import { User } from 'firebase/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { calculateCompleteness } from '@/lib/completeness';

type LeadFilter = 'all' | 'highQuality' | 'converted' | 'newThisMonth' | 'complete';

export default function DashboardPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<LeadFilter>('all');
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const user = auth.currentUser;
    if (user) setCurrentUser(user);

    const unsubscribe = listenToLeads((dbLeads) => {
      const sortedLeads = dbLeads.sort((a, b) => b.createdAt - a.createdAt);
      setLeads(sortedLeads);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLeadDeleted = (deletedLeadId: string) => {};

  const highQualityLeadsCount = useMemo(
    () => leads.filter((l) => l.quality > 85).length,
    [leads]
  );
  
  const convertedLeads = useMemo(
    () => leads.filter((l) => l.status === 'Qualified'),
    [leads]
  );
  
  const completeLeadsCount = useMemo(
    () => leads.filter((l) => calculateCompleteness(l).score === 100).length,
    [leads]
  );
  
  const averageConfidence = useMemo(() => {
    if (leads.length === 0) return 0;
    const total = leads.reduce((acc, lead) => acc + (lead.confidenceScore || 0), 0);
    return Math.round(total / leads.length);
  }, [leads]);

  const filteredLeads = useMemo(() => {
    switch (activeFilter) {
      case 'highQuality':
        return leads.filter((l) => l.quality > 85);
      case 'converted':
        return convertedLeads;
      case 'newThisMonth':
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).getTime();
        return leads.filter(l => l.createdAt >= firstDayOfMonth);
      case 'complete':
        return leads.filter((l) => calculateCompleteness(l).score === 100);
      case 'all':
      default:
        return leads;
    }
  }, [leads, activeFilter, convertedLeads]);

  return (
    <div className="flex flex-1 flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Lead Intelligence Dashboard
            </h1>
            <p className="text-muted-foreground text-sm">
              Real-time monitoring of AI-discovered growth signals and pipeline health.
            </p>
          </div>
          <div className="flex gap-2">
             <DiscoverLeadsDialog onNewLeads={() => {}} />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
          <AnalyticsCard
            title="Total Prospects"
            value={loading ? '...' : leads.length.toString()}
            icon={Users}
            description="Leads extracted from all active sources."
            onClick={() => setActiveFilter('all')}
            isActive={activeFilter === 'all'}
          />
          <AnalyticsCard
            title="High Intent Leads"
            value={loading ? '...' : highQualityLeadsCount.toString()}
            icon={Zap}
            description="Decision-makers with growth intent signals."
            onClick={() => setActiveFilter('highQuality')}
            isActive={activeFilter === 'highQuality'}
          />
          <AnalyticsCard
            title="AI Confidence"
            value={loading ? '...' : `${averageConfidence}%`}
            icon={ShieldCheck}
            description="Average extraction reliability score."
          />
          <AnalyticsCard
            title="Pipeline Health"
            value={loading ? '...' : `${convertedLeads.length}`}
            icon={Target}
            description="Verified leads qualified for outreach."
            onClick={() => setActiveFilter('converted')}
            isActive={activeFilter === 'converted'}
          />
          <AnalyticsCard
            title="Complete Data"
            value={loading ? '...' : `${completeLeadsCount}`}
            icon={CheckCircle}
            description="Leads with all 5 required fields."
            onClick={() => setActiveFilter('complete')}
            isActive={activeFilter === 'complete'}
          />
        </div>

        <div className="grid auto-rows-max items-start gap-4 md:gap-8 lg:grid-cols-3">
          <LeadAnalyticsCharts leads={leads} />
        </div>

        <div className="pt-4">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <LeadDataTable columns={columns({ onLeadDeleted: handleLeadDeleted })} data={filteredLeads} />
          )}
        </div>
    </div>
  );
}
