'use server';
/**
 * @fileOverview An AI flow to analyze a URL and extract MULTIPLE leads with reliability and sanitization.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { logger } from '@/lib/logger';
import { ExtractedLeadDataSchema } from '@/types';
import { ComplianceManager } from '@/lib/compliance';
import { RetryManager } from '@/lib/retry';
import { LeadValidator } from '@/lib/lead-validator';
import { AIConfidenceScorer } from '@/lib/ai-confidence';
import fetch from 'node-fetch';

const ExtractMultipleLeadsInputSchema = z.object({
  url: z.string().url().describe("The URL of the webpage to analyze, e.g., a partners or portfolio page."),
});
export type ExtractMultipleLeadsInput = z.infer<typeof ExtractMultipleLeadsInputSchema>;

const ExtractMultipleLeadsOutputSchema = z.object({
    leads: z.array(z.any()).optional(),
    message: z.string().describe("A message describing the outcome of the operation."),
});
export type ExtractMultipleLeadsOutput = z.infer<typeof ExtractMultipleLeadsOutputSchema>;

import { cleanHtml } from '@/lib/html-cleaner';

const prompt = ai.definePrompt({
  name: 'extractMultipleLeadsFromUrlPrompt',
  input: { schema: z.object({ htmlContent: z.string() }) },
  output: { schema: z.object({ leads: z.array(ExtractedLeadDataSchema) }) },
  prompt: `Analyze the provided cleaned HTML content and identify all individual companies, partners, or customers listed.
For each entity, extract: author name as 'name', company name as 'companyName', their quote/details as 'details', their 'website', and any physical 'address' information (including city, state, postalCode, country).
Ignore the primary company that owns the website.

HTML to analyze:
\`\`\`html
{{htmlContent}}
\`\`\`
`,
});

export async function extractMultipleLeadsFromUrl(
  input: ExtractMultipleLeadsInput
): Promise<ExtractMultipleLeadsOutput> {
  return extractMultipleLeadsFromUrlFlow(input);
}

const extractMultipleLeadsFromUrlFlow = ai.defineFlow(
  {
    name: 'extractMultipleLeadsFromUrlFlow',
    inputSchema: ExtractMultipleLeadsInputSchema,
    outputSchema: ExtractMultipleLeadsOutputSchema,
  },
  async ({ url }) => {
    logger.info(`[Bulk URL Analysis] Starting lead extraction for: ${url}`);
    
    const compliance = ComplianceManager.getInstance();
    
    const robotsCheck = await compliance.checkRobotsTxt(url);
    if (!robotsCheck.allowed) {
      return { message: `Scraping blocked: ${robotsCheck.reason}` };
    }

    let rawHtml = '';
    try {
      const response = await RetryManager.withRetry(async () => {
        const res = await fetch(url, { 
          headers: { 'User-Agent': 'LeadAceBot/1.0 (https://lead-ace.com/bot)' }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res;
      });
      rawHtml = await response.text();
    } catch (error: any) {
      logger.error(`[Bulk URL Analysis] Failed to fetch content: ${error.message}`);
      return { message: `Network error: ${error.message}` };
    }

    const htmlContent = cleanHtml(rawHtml);

    try {
      const { output } = await prompt({ htmlContent });

      if (!output?.leads || output.leads.length === 0) {
        logger.warn(`[Bulk URL Analysis] No leads identified in content for ${url}`);
        return { message: "The AI could not identify a list of potential leads from this webpage." };
      }
      
      const processedLeads = await Promise.all(output.leads.map(async (rawLead) => {
        const enhanced = LeadValidator.enhance(rawLead);
        const validation = await LeadValidator.validate(enhanced);
        const confidence = await AIConfidenceScorer.calculate(enhanced);
        const compCheck = await compliance.verifyLeadCompliance(enhanced);

        return {
          ...enhanced,
          confidenceScore: confidence,
          validationErrors: validation.errors,
          compliance: {
            gdprCompliant: compCheck.gdprCompliant,
            ccpaCompliant: compCheck.ccpaCompliant,
            consentTimestamp: Date.now()
          }
        };
      }));

      logger.info(`[Bulk URL Analysis] Extracted ${processedLeads.length} leads from ${url}`);

      return {
        leads: processedLeads,
        message: `Successfully extracted ${processedLeads.length} potential leads.`
      };
    } catch (error: any) {
      logger.error(`[Bulk URL Analysis] AI processing failed: ${error.message}`);
      return { message: `The AI failed to analyze the webpage content. Details in Debug logs.` };
    }
  }
);
