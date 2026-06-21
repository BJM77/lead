'use server';
/**
 * @fileOverview A flow for finding and enriching new leads.
 * This version uses a background job queue to prevent timeouts.
 */

import { z } from 'genkit';
import { scrapeWithAI } from '@/lib/scraper';
import { enrichLeadData } from '@/lib/enrichment';
import { calculateLeadScore } from '@/lib/scoring';
import { suggestLeadSearchTerms } from './suggest-lead-search-terms';
import type { Lead, NewLead } from '@/types';
import { createLead, createJob, updateJobProgress } from '@/lib/db';
import { logger } from '@/lib/logger';
import { ai } from '../genkit';

const FindLeadsInputSchema = z.object({
  searchContext: z.string(),
  searchTerms: z.array(z.string()).optional(),
  location: z.string().optional(),
  industry: z.string().optional(),
  employeeCount: z.string().optional(),
  techStack: z.string().optional(),
});
export type FindLeadsInput = z.infer<typeof FindLeadsInputSchema>;

const FindLeadsOutputSchema = z.object({
  jobId: z.string().describe('The ID of the background job.'),
  message: z.string().describe('A summary message.')
});
export type FindLeadsOutput = z.infer<typeof FindLeadsOutputSchema>;

async function getSearchTerms(input: FindLeadsInput): Promise<string[]> {
  if (input.searchTerms && input.searchTerms.length > 0) {
    return input.searchTerms;
  }
  return [input.searchContext || ''].filter(Boolean);
}

// Background processor
async function backgroundScrapeAndProcess(jobId: string, input: FindLeadsInput) {
  try {
    await updateJobProgress(jobId, { status: 'processing', progress: 10, message: 'Determining search strategy...' });
    
    const terms = await getSearchTerms(input);
    if (terms.length === 0 || terms[0] === '') {
      await updateJobProgress(jobId, { status: 'failed', message: 'No search terms provided.' });
      return;
    }

    await updateJobProgress(jobId, { status: 'processing', progress: 20, message: `Scraping sources for: ${terms.join(', ')}` });
    
    const sources = ['linkedin', 'crunchbase', 'company-websites', 'news-articles'] as const;
    const scrapedLeads = [];
    
    for (let i = 0; i < sources.length; i++) {
      const source = sources[i];
      try {
        const results = await scrapeWithAI({
          source,
          searchTerms: terms,
          location: input.location,
          maxResults: 3, // Increased max results per source
        });
        scrapedLeads.push(...results);
        
        // Progress update per source
        const progress = 20 + Math.floor(((i + 1) / sources.length) * 30);
        await updateJobProgress(jobId, { progress, message: `Scraped ${source}... Found ${results.length} potentials.` });
        
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (err: any) {
        logger.error(`[Job ${jobId}] Error scraping source ${source}: ${err.message}`);
      }
    }

    const uniqueLeads = Array.from(new Map(scrapedLeads.map(item => [`${item.name}-${item.company?.name}`, item])).values());
    
    if (uniqueLeads.length === 0) {
      await updateJobProgress(jobId, { status: 'completed', progress: 100, message: `No leads found for keywords: ${terms.join(', ')}.` });
      return;
    }

    await updateJobProgress(jobId, { status: 'processing', progress: 60, message: `Enriching ${uniqueLeads.length} unique leads using AI...` });
    
    let savedCount = 0;
    for (let i = 0; i < uniqueLeads.length; i++) {
      const lead = uniqueLeads[i];
      try {
        const enrichedData = await enrichLeadData({
          ...lead,
          source: lead.source as any,
          targetLocation: input.location || 'Australia',
        });
        
        if (enrichedData.isOutOfRegion) {
          logger.info(`[Job ${jobId}] Skipping lead "${lead.name}" (${enrichedData.company.name}) because it is outside the target region (${input.location || 'Australia'}).`);
          continue;
        }
        const leadToScore: Lead = {
          id: 'temp',
          userId: 'temp',
          name: enrichedData.name || 'Unknown',
          title: enrichedData.title,
          company: enrichedData.company!,
          email: enrichedData.email || 'no-email@example.com',
          phone: enrichedData.phone || 'N/A',
          status: 'New',
          quality: 0,
          source: 'AI Search',
          details: enrichedData.details || 'No details provided.',
          seniority: enrichedData.seniority,
          createdAt: Date.now(),
        };

        const quality = calculateLeadScore(leadToScore);
        const finalLeadData: NewLead = {
          name: leadToScore.name,
          title: leadToScore.title,
          company: leadToScore.company,
          email: leadToScore.email,
          phone: leadToScore.phone,
          status: leadToScore.status,
          quality,
          source: leadToScore.source,
          details: leadToScore.details,
          seniority: leadToScore.seniority,
        };

        await createLead(finalLeadData);
        savedCount++;
        
        // Update progress per lead
        const currentProgress = 60 + Math.floor(((i + 1) / uniqueLeads.length) * 40);
        await updateJobProgress(jobId, { progress: currentProgress, message: `Enriched ${i+1}/${uniqueLeads.length} leads...` });

      } catch (error: any) {
        logger.error(`[Job ${jobId}] Failed to process lead "${lead.name}": ${error.message}`);
      }
    }

    await updateJobProgress(jobId, { status: 'completed', progress: 100, message: `Successfully generated ${savedCount} high-quality leads.` });
  } catch (err: any) {
    logger.error(`[Job ${jobId}] Fatal error: ${err.message}`);
    await updateJobProgress(jobId, { status: 'failed', error: err.message, message: 'Job encountered a fatal error.' });
  }
}

export const findLeads = ai.defineFlow(
  {
    name: 'findLeadsFlow',
    inputSchema: FindLeadsInputSchema,
    outputSchema: FindLeadsOutputSchema,
  },
  async (input) => {
    // Create Job synchronously
    const jobId = await createJob('Lead Discovery');
    
    // Kick off background processing without awaiting
    backgroundScrapeAndProcess(jobId, input);

    return {
      jobId,
      message: 'Background discovery job started. You can track progress on the dashboard.',
    };
  }
);
