'use server';
/**
 * @fileOverview A lead summary AI agent.
 *
 * - summarizeLead - A function that handles the lead summary process.
 * - SummarizeLeadInput - The input type for the summarizeLead function.
 * - SummarizeLeadOutput - The return type for the summarizeLead function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeLeadInputSchema = z.object({
  leadDetails: z.string().describe('Detailed information about the lead.'),
});
export type SummarizeLeadInput = z.infer<typeof SummarizeLeadInputSchema>;

const SummarizeLeadOutputSchema = z.object({
  summary: z.string().describe('A concise summary of the lead and its potential value.'),
});
export type SummarizeLeadOutput = z.infer<typeof SummarizeLeadOutputSchema>;

export async function summarizeLead(input: SummarizeLeadInput): Promise<SummarizeLeadOutput> {
  return summarizeLeadFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeLeadPrompt',
  input: {schema: SummarizeLeadInputSchema},
  output: {schema: SummarizeLeadOutputSchema},
  prompt: `You are an expert sales assistant. Your task is to provide a short, concise summary of a lead and its potential value based on the provided details.

Lead Details: {{{leadDetails}}}

Summary:`,
});

const summarizeLeadFlow = ai.defineFlow(
  {
    name: 'summarizeLeadFlow',
    inputSchema: SummarizeLeadInputSchema,
    outputSchema: SummarizeLeadOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
