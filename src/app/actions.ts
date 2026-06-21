'use server';

type FindLeadsInput = {
  searchContext: string;
  searchTerms: string[];
  location?: string;
  industry?: string;
  employeeCount?: string;
  techStack?: string;
};

export async function findLeadsAction(input: FindLeadsInput) {
  const { findLeads } = await import('@/ai/flows/find-leads');
  return await findLeads(input);
}

export async function createLeadFromFormAction(input: any) {
  const { createLeadFromForm } = await import('@/ai/flows/create-lead-from-form');
  return await createLeadFromForm(input);
}

export async function prospectFromStreetViewAction(input: any) {
  const { prospectFromStreetView } = await import('@/ai/flows/prospect-from-street-view');
  return await prospectFromStreetView(input);
}

export async function analyzeImageForLeadAction(input: any) {
  const { analyzeImageForLead } = await import('@/ai/flows/analyze-image-for-lead');
  return await analyzeImageForLead(input);
}

export async function extractLeadFromUrlAction(input: any) {
  const { extractLeadFromUrl } = await import('@/ai/flows/extract-lead-from-url');
  return await extractLeadFromUrl(input);
}

export async function extractMultipleLeadsFromUrlAction(input: any) {
  const { extractMultipleLeadsFromUrl } = await import('@/ai/flows/extract-multiple-leads-from-url');
  return await extractMultipleLeadsFromUrl(input);
}

export async function analyzeAdForLeadAction(input: any) {
  const { analyzeAdForLead } = await import('@/ai/flows/analyze-ad-for-lead');
  return await analyzeAdForLead(input);
}
