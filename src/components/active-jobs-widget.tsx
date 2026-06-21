'use client';

import React, { useEffect, useState } from 'react';
import { listenToJobs } from '@/lib/db';
import type { Job } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Loader2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

export function ActiveJobsWidget() {
  const [jobs, setJobs] = useState<Job[]>([]);

  useEffect(() => {
    const unsubscribe = listenToJobs((dbJobs) => {
      setJobs(dbJobs);
    });
    return () => unsubscribe();
  }, []);

  const activeJobs = jobs.filter(j => j.status === 'pending' || j.status === 'processing');
  const recentCompleted = jobs.filter(j => j.status === 'completed' || j.status === 'failed').slice(0, 3);

  if (jobs.length === 0) return null;

  return (
    <Card className="col-span-1 md:col-span-2 lg:col-span-4 bg-background/50 backdrop-blur-xl border-white/10 shadow-xl overflow-hidden">
      <CardHeader className="pb-3 border-b border-white/5">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          Active Discovery Jobs
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 grid gap-4">
        {activeJobs.length === 0 ? (
           <div className="text-sm text-muted-foreground italic flex items-center gap-2">
             <CheckCircle2 className="w-4 h-4 text-green-500" />
             All background discovery jobs completed.
           </div>
        ) : (
          activeJobs.map(job => (
            <div key={job.id} className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">{job.type}</span>
                <span className="text-muted-foreground">{job.progress || 0}%</span>
              </div>
              <Progress value={job.progress || 0} className="h-2" />
              <p className="text-xs text-muted-foreground">{job.message}</p>
            </div>
          ))
        )}

        {recentCompleted.length > 0 && (
          <div className="mt-4 pt-4 border-t border-white/5">
            <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Recently Completed</h4>
            <div className="space-y-2">
              {recentCompleted.map(job => (
                <div key={job.id} className="flex items-center gap-2 text-xs">
                  {job.status === 'completed' ? (
                    <CheckCircle2 className="w-3 h-3 text-green-500" />
                  ) : (
                    <XCircle className="w-3 h-3 text-red-500" />
                  )}
                  <span className="truncate flex-1">{job.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
