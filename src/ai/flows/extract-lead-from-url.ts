'use server';
/**
 * @fileOverview Lead intelligence extraction with enhanced HTML sanitization and technical fingerprinting.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { logger } from '@/lib/logger';
import { ExtractedLeadDataSchema, type ExtractedLeadData } from '@/types';
import fetch from 'node-fetch';

const ExtractLeadFromUrlInputSchema = z.object({
  url: z.string().url().describe("The URL of the website to analyze."),
});

/**
 * Strips HTML noise to keep token count low and AI focus high.
 */
function cleanHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, '')
    .replace(/<link\b[^>]*>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 35000); // Safely under Gemini's limits
}

/**
 * Identifies technologies based on common HTML/Script markers.
 */
function detectTech(html: string): string[] {
  const techs: string[] = [];
  if (html.includes('cdn.shopify.com')) techs.push('Shopify');
  if (html.includes('woocommerce')) techs.push('WooCommerce');
  if (html.includes('stripe.com')) techs.push('Stripe');
  if (html.includes('klaviyo')) techs.push('Klaviyo');
  if (html.includes('intercom.io')) techs.push('Intercom');
  return techs;
}

const prompt = ai.definePrompt({
  name: 'extractLeadFromUrlPrompt',
  input: { schema: z.object({ htmlContent: z.string() }) },
  output: { schema: ExtractedLeadDataSchema.optional() },
  prompt: `You are an expert lead intelligence analyst. 
Extract contact details and company information from the following cleaned HTML.
Look for: Contact Name, Job Title, Company Name, Email, Phone, and Website.
Also note 'evidence' for each field found (e.g. "from about page bio").

HTML Content:
\`\`\`html
{{htmlContent}}
\`\`\`
`,
});

export async function extractLeadFromUrl(input: z.infer<typeof ExtractLeadFromUrlInputSchema>) {
  logger.info(`[Intelligence] Processing target URL: ${input.url}`);
  
  try {
    const response = await fetch(input.url, { 
      headers: { 'User-Agent': 'LeadAceIntelligenceBot/1.0' },
      timeout: 10000 
    });
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const rawHtml = await response.text();
    const technicalFingerprints = detectTech(rawHtml);
    const cleanedHtml = cleanHtml(rawHtml);

    const { output } = await prompt({ htmlContent: cleanedHtml });

    if (!output || (!output.name && !output.companyName)) {
      return { 
        message: "No lead signatures identified on this page.", 
        extractedData: null 
      };
    }

    const finalData: ExtractedLeadData = {
      ...output,
      detectedTech: Array.from(new Set([...(output.detectedTech || []), ...technicalFingerprints]))
    };

    return { 
      extractedData: finalData, 
      message: "Lead intelligence successfully extracted." 
    };
  } catch (error: any) {
    logger.error(`[Intelligence] Analysis failed: ${error.message}`);
    return { 
      message: `Failed to analyze page: ${error.message}`, 
      extractedData: null 
    };
  }
}
