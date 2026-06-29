'use server';

import { SecurityUtils } from '@/lib/security';
import { logger } from '@/lib/logger';
import { RetryManager } from '@/lib/retry';
import { ErrorLogger } from '@/lib/error-logger';

type FindLeadsInput = {
  searchContext: string;
  searchTerms: string[];
  location?: string;
  industry?: string;
  employeeCount?: string;
  techStack?: string;
};

function handleActionError(error: any, actionName: string): { error: string } {
  const errObj = error instanceof Error ? error : new Error(String(error));
  ErrorLogger.logError(errObj, { actionName });
  
  const errorMessage = errObj.message;
  if (
    errorMessage.includes('503') ||
    errorMessage.includes('Service Unavailable') ||
    errorMessage.toLowerCase().includes('high demand') ||
    errorMessage.toLowerCase().includes('overloaded') ||
    errorMessage.toLowerCase().includes('rate limit') ||
    errorMessage.toLowerCase().includes('resource exhausted')
  ) {
    return { error: 'The AI is currently overloaded, please try again.' };
  }
  
  return { error: 'The lead discovery process encountered an issue. Please check the debug logs for details.' };
}

async function withTimeout<T>(fn: () => Promise<T>, ms: number = 45000, actionName: string): Promise<T> {
  const executeWithTimeout = async () => {
    let timeoutId: NodeJS.Timeout;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        logger.error(`[Timeout] Action "${actionName}" exceeded ${ms}ms limit.`);
        reject(new Error(`The request timed out. Please try again.`));
      }, ms);
    });

    try {
      const result = await Promise.race([fn(), timeoutPromise]);
      clearTimeout(timeoutId!);
      return result;
    } catch (error) {
      clearTimeout(timeoutId!);
      throw error;
    }
  };

  return RetryManager.withRetry(executeWithTimeout, {
    maxRetries: 3,
    baseDelay: 2000,
    maxDelay: 15000,
    retryableErrors: ['503', '500', '502', '504', 'high demand', 'overloaded', 'rate limit', 'ECONNRESET', 'ETIMEDOUT']
  });
}

export async function findLeadsAction(input: FindLeadsInput) {
  try {
    const sanitizedInput = {
      ...input,
      searchContext: SecurityUtils.sanitizePromptInput(input.searchContext),
      searchTerms: input.searchTerms ? input.searchTerms.map(t => SecurityUtils.sanitizePromptInput(t)) : [],
      location: input.location ? SecurityUtils.sanitizePromptInput(input.location) : undefined,
    };
    const { findLeads } = await import('@/ai/flows/find-leads');
    return await withTimeout(() => findLeads(sanitizedInput), 90000, 'findLeads');
  } catch (error) {
    return handleActionError(error, 'findLeadsAction');
  }
}

export async function createLeadFromFormAction(input: any) {
  try {
    const { createLeadFromForm } = await import('@/ai/flows/create-lead-from-form');
    // Doesn't strictly need a timeout but we can wrap it with a 30s timeout and retries for network resilience
    return await withTimeout(() => createLeadFromForm(input), 30000, 'createLeadFromForm');
  } catch (error) {
    return handleActionError(error, 'createLeadFromFormAction');
  }
}

export async function prospectFromStreetViewAction(input: any) {
  try {
    const { prospectFromStreetView } = await import('@/ai/flows/prospect-from-street-view');
    return await withTimeout(() => prospectFromStreetView(input), 60000, 'prospectFromStreetView');
  } catch (error) {
    return handleActionError(error, 'prospectFromStreetViewAction');
  }
}

export async function analyzeImageForLeadAction(input: any) {
  try {
    const { analyzeImageForLead } = await import('@/ai/flows/analyze-image-for-lead');
    return await withTimeout(() => analyzeImageForLead(input), 45000, 'analyzeImageForLead');
  } catch (error) {
    return handleActionError(error, 'analyzeImageForLeadAction');
  }
}

export async function createJobAction() {
  try {
    const { createInMemoryJob } = await import('@/lib/job-store');
    return createInMemoryJob();
  } catch (error) {
    return handleActionError(error, 'createJobAction');
  }
}

export async function getJobProgressAction(jobId: string) {
  try {
    const { getInMemoryJob } = await import('@/lib/job-store');
    return getInMemoryJob(jobId);
  } catch (error) {
    return handleActionError(error, 'getJobProgressAction');
  }
}

export async function extractLeadFromUrlAction(input: any) {
  try {
    if (input.url && !SecurityUtils.validateUrl(input.url)) {
      throw new Error('Invalid URL provided.');
    }
    const { extractLeadFromUrl } = await import('@/ai/flows/extract-lead-from-url');
    return await withTimeout(() => extractLeadFromUrl(input), 45000, 'extractLeadFromUrl');
  } catch (error) {
    return handleActionError(error, 'extractLeadFromUrlAction');
  }
}

export async function extractMultipleLeadsFromUrlAction(input: any) {
  try {
    if (input.url && !SecurityUtils.validateUrl(input.url)) {
      throw new Error('Invalid URL provided.');
    }
    const { extractMultipleLeadsFromUrl } = await import('@/ai/flows/extract-multiple-leads-from-url');
    return await withTimeout(() => extractMultipleLeadsFromUrl(input), 60000, 'extractMultipleLeadsFromUrl');
  } catch (error) {
    return handleActionError(error, 'extractMultipleLeadsFromUrlAction');
  }
}

export async function analyzeAdForLeadAction(input: any) {
  try {
    const { analyzeAdForLead } = await import('@/ai/flows/analyze-ad-for-lead');
    return await withTimeout(() => analyzeAdForLead(input), 45000, 'analyzeAdForLead');
  } catch (error) {
    return handleActionError(error, 'analyzeAdForLeadAction');
  }
}

export async function discoverUrlsAction(input: any) {
  try {
    const sanitizedInput = {
      ...input,
      query: SecurityUtils.sanitizePromptInput(input.query)
    };
    const { discoverUrls } = await import('@/ai/flows/discover-urls');
    return await withTimeout(() => discoverUrls(sanitizedInput), 90000, 'discoverUrls');
  } catch (error) {
    return handleActionError(error, 'discoverUrlsAction');
  }
}

export async function findLeadsByPlaceAction(input: { query: string }) {
  try {
    const sanitizedInput = {
      query: SecurityUtils.sanitizePromptInput(input.query)
    };
    const { findLeadsByPlace } = await import('@/ai/flows/find-leads-by-place');
    return await withTimeout(() => findLeadsByPlace(sanitizedInput), 60000, 'findLeadsByPlace');
  } catch (error) {
    return handleActionError(error, 'findLeadsByPlaceAction');
  }
}

