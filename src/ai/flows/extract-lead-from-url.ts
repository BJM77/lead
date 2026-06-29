'use server';
/**
 * @fileOverview Lead intelligence extraction with enhanced HTML sanitization and technical fingerprinting.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { logger } from '@/lib/logger';
import { ExtractedLeadDataSchema, type ExtractedLeadData } from '@/types';
import { cleanHtml } from '@/lib/html-cleaner';
import { updateInMemoryJob } from '@/lib/job-store';

const ExtractLeadFromUrlInputSchema = z.object({
  url: z.string().url().describe("The URL of the website to analyze."),
  jobId: z.string().optional().describe("Optional in-memory jobId to write progress logs to."),
});

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
  input: { schema: z.object({ htmlContent: z.string(), url: z.string() }) },
  output: { schema: ExtractedLeadDataSchema.optional() },
  prompt: `You are an expert lead intelligence analyst. 
Extract contact details and company information from the following cleaned HTML.
The website URL being analyzed is: {{url}}

Look for: Contact Name, Job Title, Company Name, Email, Phone, Website (use the provided URL if not explicitly found in the HTML), and physical/business Address (including city, state, postal code, and country).
Also note 'evidence' for each field found (e.g. "from about page bio").

CRITICAL FORMATTING REQUIREMENTS:
- The "website" field MUST be strictly a clean, valid URL or domain string (e.g., "https://willship.com.au" or "willship.com.au"). Do NOT include any explanations, justifications, meta-commentary, sentences, or paragraphs in the "website" field. If you must explain your reasoning, place that text in the "evidence" object under the "website" key.
- Only "companyName" and "website" are required.
- If you cannot find the contact name, email, phone, or address details, do NOT write "null", "Unknown", or make up placeholders. Simply leave them empty/blank (empty string or exclude them from the response).

HTML Content:
\`\`\`html
{{htmlContent}}
\`\`\`
`,
});

export async function extractLeadFromUrl(input: z.infer<typeof ExtractLeadFromUrlInputSchema>) {
  logger.info(`[Intelligence] Processing target URL: ${input.url}`);
  const jobId = input.jobId;
  
  try {
    if (jobId) {
      updateInMemoryJob(jobId, { status: 'processing', progress: 10, message: 'Launching crawler and fetching homepage...' });
    }

    const { deepCrawler } = await import('@/lib/deep-crawler');
    
    // We modify deep crawler invocation to report progress if jobId is active
    if (jobId) {
      updateInMemoryJob(jobId, { progress: 30, message: 'Analyzing homepage structure and locating subpages...' });
    }

    const scrapeResult = await deepCrawler.crawl(input.url);
    
    if (!scrapeResult.success || !scrapeResult.html) {
      if (jobId) {
        updateInMemoryJob(jobId, { status: 'failed', error: scrapeResult.error || 'Empty HTML' });
      }
      return { 
        message: `Failed to analyze page: ${scrapeResult.error || 'Scrape yielded empty html'}`, 
        extractedData: null 
      };
    }
    
    if (jobId) {
      updateInMemoryJob(jobId, { progress: 60, message: 'Sanitizing text and starting AI parsing...' });
    }

    const rawHtml = scrapeResult.html;
    const technicalFingerprints = detectTech(rawHtml);
    const cleanedHtml = cleanHtml(rawHtml);

    const { output } = await prompt({ htmlContent: cleanedHtml, url: input.url });

    if (!output || (!output.companyName && !output.name)) {
      if (jobId) {
        updateInMemoryJob(jobId, { status: 'failed', message: 'No lead signatures identified.' });
      }
      return { 
        message: "No lead signatures identified on this page.", 
        extractedData: null 
      };
    }

    if (jobId) {
      updateInMemoryJob(jobId, { progress: 90, message: 'Finalizing extraction results...' });
    }

    // Merge regex discovered emails with AI extraction outputs
    const emails = [...new Set([...(output.email ? [output.email] : []), ...scrapeResult.emails])];

    const finalData: ExtractedLeadData = {
      ...output,
      email: emails.length > 0 ? emails[0] : (output.email || ''),
      detectedTech: Array.from(new Set([...(output.detectedTech || []), ...technicalFingerprints])),
      details: `${output.details || ''}
      
[Local Extraction Details]
Method: ${scrapeResult.method} (Deep Crawled)
Local Emails: ${scrapeResult.emails.join(', ') || 'None'}
Company Name: ${scrapeResult.companyInfo.name || 'N/A'}
Industry: ${scrapeResult.companyInfo.industry || 'N/A'}
Employees: ${scrapeResult.companyInfo.employeeCount || 'N/A'}`
    };

    if (jobId) {
      updateInMemoryJob(jobId, { status: 'completed', progress: 100, message: 'Analysis complete!' });
    }

    return { 
      extractedData: finalData, 
      message: `Lead intelligence successfully extracted using ${scrapeResult.method} deep-crawler.` 
    };
  } catch (error: any) {
    logger.error(`[Intelligence] Analysis failed: ${error.message}`);
    if (jobId) {
      updateInMemoryJob(jobId, { status: 'failed', error: error.message, message: `Error: ${error.message}` });
    }
    return { 
      message: `Failed to analyze page: ${error.message}`, 
      extractedData: null 
    };
  }
}
