'use server';

import { SecurityUtils } from '@/lib/security';
import { logger } from '@/lib/logger';

type FindLeadsInput = {
  searchContext: string;
  searchTerms: string[];
  location?: string;
  industry?: string;
  employeeCount?: string;
  techStack?: string;
};

async function withTimeout<T>(promise: Promise<T>, ms: number = 45000, actionName: string): Promise<T> {
  let timeoutId: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      logger.error(`[Timeout] Action "${actionName}" exceeded ${ms}ms limit.`);
      reject(new Error(`The request timed out. Please try again.`));
    }, ms);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId!);
    return result;
  } catch (error) {
    clearTimeout(timeoutId!);
    throw error;
  }
}

export async function findLeadsAction(input: FindLeadsInput) {
  // Sanitize contextual text input
  const sanitizedInput = {
    ...input,
    searchContext: SecurityUtils.sanitizePromptInput(input.searchContext),
    searchTerms: input.searchTerms ? input.searchTerms.map(t => SecurityUtils.sanitizePromptInput(t)) : [],
    location: input.location ? SecurityUtils.sanitizePromptInput(input.location) : undefined,
  };
  const { findLeads } = await import('@/ai/flows/find-leads');
  return await findLeads(sanitizedInput);
}

export async function createLeadFromFormAction(input: any) {
  const { createLeadFromForm } = await import('@/ai/flows/create-lead-from-form');
  return await createLeadFromForm(input);
}

export async function prospectFromStreetViewAction(input: any) {
  const { prospectFromStreetView } = await import('@/ai/flows/prospect-from-street-view');
  return await withTimeout(prospectFromStreetView(input), 60000, 'prospectFromStreetView');
}

export async function analyzeImageForLeadAction(input: any) {
  const { analyzeImageForLead } = await import('@/ai/flows/analyze-image-for-lead');
  return await withTimeout(analyzeImageForLead(input), 45000, 'analyzeImageForLead');
}

export async function extractLeadFromUrlAction(input: any) {
  if (input.url && !SecurityUtils.validateUrl(input.url)) {
    throw new Error('Invalid URL provided.');
  }
  const { extractLeadFromUrl } = await import('@/ai/flows/extract-lead-from-url');
  return await withTimeout(extractLeadFromUrl(input), 45000, 'extractLeadFromUrl');
}

export async function extractMultipleLeadsFromUrlAction(input: any) {
  if (input.url && !SecurityUtils.validateUrl(input.url)) {
    throw new Error('Invalid URL provided.');
  }
  const { extractMultipleLeadsFromUrl } = await import('@/ai/flows/extract-multiple-leads-from-url');
  return await withTimeout(extractMultipleLeadsFromUrl(input), 60000, 'extractMultipleLeadsFromUrl');
}

export async function analyzeAdForLeadAction(input: any) {
  const { analyzeAdForLead } = await import('@/ai/flows/analyze-ad-for-lead');
  return await withTimeout(analyzeAdForLead(input), 45000, 'analyzeAdForLead');
}

export async function discoverUrlsAction(input: any) {
  const sanitizedInput = {
    ...input,
    query: SecurityUtils.sanitizePromptInput(input.query)
  };
  const { discoverUrls } = await import('@/ai/flows/discover-urls');
  return await withTimeout(discoverUrls(sanitizedInput), 45000, 'discoverUrls');
}
