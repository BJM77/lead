'use client';

import React, { useEffect, useState } from 'react';
import { LeadDataTable } from '@/components/lead-data-table';
import { columns } from '@/components/lead-columns';
import type { Lead } from '@/types';
import { listenToLeads } from '@/lib/db';
import { Loader2 } from 'lucide-react';

export function LeadsClientPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = listenToLeads((dbLeads) => {
      const sortedLeads = dbLeads.sort((a, b) => b.createdAt - a.createdAt);
      setLeads(sortedLeads);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLeadDeleted = (deletedLeadId: string) => {
    // Lead deletion is handled via real-time listener updates
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="pt-4">
      <LeadDataTable 
        columns={columns({ onLeadDeleted: handleLeadDeleted })} 
        data={leads} 
      />
    </div>
  );
}
