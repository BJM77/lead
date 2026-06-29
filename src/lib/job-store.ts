export interface JobProgress {
  progress: number;
  message: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
}

const jobs = new Map<string, JobProgress>();

export function createInMemoryJob(): string {
  const jobId = 'job_' + Math.random().toString(36).substring(2, 15);
  jobs.set(jobId, {
    progress: 0,
    message: 'Initializing...',
    status: 'pending',
  });
  return jobId;
}

export function updateInMemoryJob(jobId: string, updates: Partial<JobProgress>) {
  const existing = jobs.get(jobId);
  if (existing) {
    jobs.set(jobId, { ...existing, ...updates } as JobProgress);
  } else {
    jobs.set(jobId, {
      progress: updates.progress ?? 0,
      message: updates.message ?? '',
      status: updates.status ?? 'pending',
      error: updates.error,
    });
  }
}

export function getInMemoryJob(jobId: string): JobProgress | undefined {
  return jobs.get(jobId);
}
