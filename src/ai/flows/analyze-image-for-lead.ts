'use server';
/**
 * @fileOverview An AI flow to analyze an image and extract potential lead information.
 * This flow does NOT save to the database. It only returns the extracted data to the client.
 *
 * - analyzeImageForLead - A function that analyzes an image and returns extracted data.
 * - AnalyzeImageForLeadInput - The input type for the analyzeImageForLead function.
 * - AnalyzeImageForLeadOutput - The return type for the analyzeImageForLead function.
 * - ExtractedLeadData - The type for the data extracted from the image.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { logger } from '@/lib/logger';
import { ExtractedLeadDataSchema } from '@/types';
import type { ExtractedLeadData } from '@/types';


const AnalyzeImageForLeadInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of an advertisement, business card, or social media post, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'"
    ),
});
export type AnalyzeImageForLeadInput = z.infer<
  typeof AnalyzeImageForLeadInputSchema
>;

const AnalyzeImageForLeadOutputSchema = z.object({
    extractedData: ExtractedLeadDataSchema.optional(),
    message: z.string().describe("A message describing the outcome."),
});
export type AnalyzeImageForLeadOutput = z.infer<
  typeof AnalyzeImageForLeadOutputSchema
>;

export async function analyzeImageForLead(
  input: AnalyzeImageForLeadInput
): Promise<AnalyzeImageForLeadOutput> {
  return analyzeImageForLeadFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeImageForLeadPrompt',
  input: { schema: AnalyzeImageForLeadInputSchema },
  output: { schema: ExtractedLeadDataSchema.optional() },
  prompt: `You are an expert at analyzing images of advertisements, business cards, and social media posts to extract lead information.
Analyze the provided image and extract the following information if available: contact person's full name, job title, company name, email, phone number, website, and physical/business address (including city, state, postal code, and country).
Also provide any other relevant context or details you can infer from the image. If a piece of information is not present, omit the corresponding field.
If the image does not appear to contain any relevant lead information, respond with an empty object.

Image to analyze: {{media url=photoDataUri}}`,
});

const analyzeImageForLeadFlow = ai.defineFlow(
  {
    name: 'analyzeImageForLeadFlow',
    inputSchema: AnalyzeImageForLeadInputSchema,
    outputSchema: AnalyzeImageForLeadOutputSchema,
  },
  async (input) => {
    logger.info('[Image Analysis] Starting lead extraction from image.');
    const { output } = await prompt(input);

    if (!output || (!output.name && !output.companyName)) {
      logger.warn('[Image Analysis] AI could not extract a name or company from the image.');
      return { message: "The AI could not identify a potential lead in this image. Please review and enter the details manually." };
    }
    
    logger.info(`[Image Analysis] AI extracted: ${output.name} at ${output.companyName}`);

    return { 
        extractedData: output,
        message: "AI analysis complete. Please verify the extracted information below."
    };
  }
);
