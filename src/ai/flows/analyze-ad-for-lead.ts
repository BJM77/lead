'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { logger } from '@/lib/logger';
import { ExtractedLeadDataSchema, type ExtractedLeadData } from '@/types';

const AnalyzeAdForLeadInputSchema = z.object({
  photoDataUri: z.string().describe("A screenshot of an ad as a data URI."),
});

const AnalyzeAdForLeadOutputSchema = z.object({
    extractedData: ExtractedLeadDataSchema.nullable().optional(),
    message: z.string().describe("A message describing the outcome."),
});
export type AnalyzeAdForLeadOutput = z.infer<typeof AnalyzeAdForLeadOutputSchema>;

// Prompt 1: Analyze the image to get the company name and URL
const imageAnalysisPrompt = ai.definePrompt({
    name: 'analyzeAdImageForUrlPrompt',
    input: { schema: AnalyzeAdForLeadInputSchema },
    output: { schema: z.object({ companyName: z.string().optional(), websiteUrl: z.string().url().optional() }) },
    prompt: `You are an expert at analyzing advertisement screenshots (like Google or Facebook ads). Your most important task is to identify and extract the main website URL being advertised. Also, extract the company name.

Image to analyze: {{media url=photoDataUri}}`
});

// Prompt 2: Analyze the website's HTML to get contact details
const htmlAnalysisPrompt = ai.definePrompt({
    name: 'analyzeWebsiteForDetailsPrompt',
    input: { schema: z.object({ htmlContent: z.string(), companyName: z.string().optional() }) },
    output: { schema: ExtractedLeadDataSchema },
    prompt: `You are an expert at analyzing a company's website HTML to find contact information. Find the primary contact phone number, physical address, and a contact person's name and title if available. Use the provided company name for context.

Company Name: {{companyName}}

Website HTML:
\`\`\`html
{{htmlContent}}
\`\`\`
`
});


// The main flow that orchestrates the two steps
export async function analyzeAdForLead(
  input: z.infer<typeof AnalyzeAdForLeadInputSchema>
): Promise<AnalyzeAdForLeadOutput> {
  return analyzeAdForLeadFlow(input);
}


const analyzeAdForLeadFlow = ai.defineFlow(
  {
    name: 'analyzeAdForLeadFlow',
    inputSchema: AnalyzeAdForLeadInputSchema,
    outputSchema: AnalyzeAdForLeadOutputSchema,
  },
  async (input) => {
    logger.info('[Ad Analysis] Step 1: Analyzing image for URL.');
    
    // Step 1: Analyze the image
    const imageAnalysisResult = await imageAnalysisPrompt(input);
    const { companyName, websiteUrl } = imageAnalysisResult.output || {};

    if (!websiteUrl) {
      logger.warn('[Ad Analysis] Could not find a website URL in the image.');
      return { message: "The AI could not identify a website URL in the ad. Please try a different image or enter the lead manually." };
    }
    logger.info(`[Ad Analysis] Found URL: ${websiteUrl} and Company: ${companyName}`);

    // Step 2: Scrape the website
    let htmlContent = '';
    try {
        logger.info(`[Ad Analysis] Step 2: Fetching content from ${websiteUrl}`);
        const response = await fetch(websiteUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }});
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        htmlContent = await response.text();
    } catch (error: any) {
        logger.error(`[Ad Analysis] Failed to fetch URL ${websiteUrl}: ${error.message}`);
        // Return the data we got from the image, as scraping failed
        return { 
            extractedData: { companyName, website: websiteUrl },
            message: `AI found a website, but failed to load it. Please review the extracted data.` 
        };
    }

    // Step 3: Analyze the HTML
    logger.info('[Ad Analysis] Step 3: Analyzing HTML for contact details.');
    const htmlAnalysisResult = await htmlAnalysisPrompt({ htmlContent, companyName });
    const scrapedData = htmlAnalysisResult.output;
    
    // Combine data from both steps, giving preference to the more detailed scraped data
    const finalData: ExtractedLeadData = {
        name: scrapedData?.name,
        title: scrapedData?.title,
        companyName: scrapedData?.companyName || companyName, // Fallback to name from image
        email: scrapedData?.email,
        phone: scrapedData?.phone,
        website: scrapedData?.website || websiteUrl, // Fallback to URL from image
        details: scrapedData?.details,
    };

    return {
        extractedData: finalData,
        message: "Successfully analyzed ad and website. Please verify the details below."
    };
  }
);
