/**
 * @fileOverview A flow for creating a new lead from a form submission.
 * It enriches, scores, and saves the lead to the database.
 * 
 * - createLeadFromForm - The main exported function.
 */

import { z } from 'genkit';
import { enrichLeadData } from '@/lib/enrichment';
import { calculateLeadScore } from '@/lib/scoring';
import { createLead } from '@/lib/db';
import { logger } from '@/lib/logger';
import { NewLeadSchema, type Lead, type NewLead } from '@/types';
import { ai } from '../genkit';

export const CreateLeadOutputSchema = z.object({
    enrichedLead: NewLeadSchema,
    message: z.string().describe("A summary message of the operation.")
});

export type CreateLeadOutput = z.infer<typeof CreateLeadOutputSchema>;

// This is the main flow that will be called from the client
export const createLeadFromForm = ai.defineFlow(
  {
    name: 'createLeadFromFormFlow',
    inputSchema: NewLeadSchema,
    outputSchema: CreateLeadOutputSchema,
  },
  async (leadData) => {
    const flowStartTime = Date.now();
    logger.info(`[PERF] Starting createLeadFromForm flow for: "${leadData.name}"`);

    // 1. Enrich the lead data
    logger.info(`[Create Lead] Enriching lead: ${leadData.name}`);
    const enrichedData = await enrichLeadData(leadData);

    // 2. Calculate the lead score
    const quality = calculateLeadScore(enrichedData as Lead);
    logger.debug(`[Create Lead] Lead "${enrichedData.name}" scored with quality: ${quality}`);

    const isValidEmail = (e: string | undefined | null) => e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
    const finalEmail = isValidEmail(enrichedData.email) ? enrichedData.email : (isValidEmail(leadData.email) ? leadData.email : `no-email-${Date.now()}@example.com`);

    const finalLeadData: NewLead = {
        name: enrichedData.name || leadData.name || 'Unknown',
        title: enrichedData.title || leadData.title,
        company: enrichedData.company || leadData.company,
        email: finalEmail as string,
        phone: enrichedData.phone || leadData.phone,
        status: enrichedData.status || leadData.status || 'New',
        source: enrichedData.source || leadData.source || 'AI Search',
        details: enrichedData.details || leadData.details || '',
        sourceUrl: enrichedData.sourceUrl || leadData.sourceUrl,
        seniority: enrichedData.seniority || leadData.seniority,
        quality,
    };

    const flowEndTime = Date.now();
    const duration = ((flowEndTime - flowStartTime) / 1000).toFixed(2);
    const finalMessage = `Successfully enriched lead: ${finalLeadData.name}. Ready to save.`;
    logger.info(`[PERF] createLeadFromForm flow finished. Total time: ${duration}s. ${finalMessage}`);

    return {
      enrichedLead: finalLeadData,
      message: finalMessage,
    };
  }
);
