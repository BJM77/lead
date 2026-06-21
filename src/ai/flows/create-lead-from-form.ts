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
    leadId: z.string().describe("The ID of the newly created lead."),
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

    const finalLeadData = {
        ...enrichedData,
        quality,
    };

    // 3. Save the lead to the database
    const newLead = await createLead(finalLeadData);
    logger.info(`[Create Lead] Successfully saved new lead: ${finalLeadData.name} with score ${quality} and ID ${newLead.id}`);

    const flowEndTime = Date.now();
    const duration = ((flowEndTime - flowStartTime) / 1000).toFixed(2);
    const finalMessage = `Successfully created new lead: ${newLead.name}.`;
    logger.info(`[PERF] createLeadFromForm flow finished. Total time: ${duration}s. ${finalMessage}`);

    return {
      leadId: newLead.id,
      message: finalMessage,
    };
  }
);
