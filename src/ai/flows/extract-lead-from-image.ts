
'use server';
/**
 * @fileOverview This file is deprecated and will be removed. Use analyze-image-for-lead.ts instead.
 * @deprecated
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import type { Lead, NewLead } from '@/types';
import { createLead } from '@/lib/db';
import { calculateLeadScore } from '@/lib/scoring';
import { logger } from '@/lib/logger';

const ExtractLeadFromImageInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of an advertisement, business card, or social media post, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ExtractLeadFromImageInput = z.infer<
  typeof ExtractLeadFromImageInputSchema
>;

const ExtractedLeadDataSchema = z.object({
    name: z.string().optional().describe("The full name of the contact person."),
    title: z.string().optional().describe("The job title of the contact person."),
    companyName: z.string().optional().describe("The name of the company."),
    email: z.string().optional().describe("The contact email address."),
    phone: z.string().optional().describe("The contact phone number."),
    website: z.string().optional().describe("The company's website URL."),
    details: z.string().optional().describe("Any other relevant details or context from the image.")
}).optional();

const ExtractLeadFromImageOutputSchema = z.object({
    leadId: z.string().optional().describe("The ID of the lead if it was created."),
    message: z.string().describe("A message describing the outcome."),
});

export type ExtractLeadFromImageOutput = z.infer<
  typeof ExtractLeadFromImageOutputSchema
>;

export async function extractLeadFromImage(
  input: ExtractLeadFromImageInput
): Promise<ExtractLeadFromImageOutput> {
  logger.warn('extractLeadFromImage is deprecated. Use analyzeImageForLead and createLeadFromForm instead.');
  return extractLeadFromImageFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractLeadFromImagePrompt',
  input: { schema: ExtractLeadFromImageInputSchema },
  output: { schema: ExtractedLeadDataSchema },
  prompt: `You are an expert at analyzing images of advertisements, business cards, and social media posts to extract lead information.
Analyze the provided image and extract the following information if available: contact person's full name, job title, company name, email, phone number, and website.
Also provide any other relevant context or details you can infer from the image. If a piece of information is not present, omit the corresponding field.
If the image does not appear to contain any relevant lead information, respond with an empty object.

Image to analyze: {{media url=photoDataUri}}`,
});

const extractLeadFromImageFlow = ai.defineFlow(
  {
    name: 'extractLeadFromImageFlow',
    inputSchema: ExtractLeadFromImageInputSchema,
    outputSchema: ExtractLeadFromImageOutputSchema,
  },
  async (input) => {
    logger.info('[Image Capture] Starting lead extraction from image.');
    const { output } = await prompt(input);

    if (!output || (!output.name && !output.companyName)) {
      logger.warn('[Image Capture] AI could not extract a name or company. Discarding lead.');
      return { message: "The AI could not identify a potential lead in this image. Please try another one." };
    }
    
    logger.info(`[Image Capture] AI extracted: ${output.name} at ${output.companyName}`);

    const leadToScore: Lead = {
        id: 'temp-img-id', // temporary for scoring
        userId: 'temp-user',
        name: output.name || 'Unknown',
        title: output.title || 'N/A',
        email: output.email || 'no-email@example.com',
        phone: output.phone || 'N/A',
        company: {
            name: output.companyName || 'Unknown Company',
        },
        status: 'New',
        quality: 0,
        source: 'Image Upload',
        details: `${output.details || 'Extracted from image.'}\nWebsite: ${output.website || 'N/A'}`,
        createdAt: Date.now(),
    }
    
    const quality = calculateLeadScore(leadToScore);
    logger.info(`[Image Capture] Scored lead with quality: ${quality}`);
    
    const newLead: NewLead = {
        ...leadToScore,
        quality,
    };

    const savedLead = await createLead(newLead);
    logger.info(`[Image Capture] Saved new lead with ID: ${savedLead.id}`);

    return { 
        leadId: savedLead.id,
        message: `Successfully created a new lead for ${savedLead.name} with a quality score of ${savedLead.quality}.`
    };
  }
);
