// src/ai/flows/suggest-lead-search-terms.ts
'use server';
/**
 * @fileOverview This file defines a Genkit flow for suggesting lead search terms based on a description of the ideal lead profile.
 *
 * - suggestLeadSearchTerms - A function that takes a description of an ideal lead profile and returns suggested search terms.
 * - SuggestLeadSearchTermsInput - The input type for the suggestLeadSearchTerms function.
 * - SuggestLeadSearchTermsOutput - The return type for the suggestLeadSearchTerms function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestLeadSearchTermsInputSchema = z.object({
  idealLeadProfileDescription: z
    .string()
    .describe('A short description of the ideal lead profile.'),
});
export type SuggestLeadSearchTermsInput = z.infer<
  typeof SuggestLeadSearchTermsInputSchema
>;

const SuggestLeadSearchTermsOutputSchema = z.object({
  searchTerms: z
    .string()
    .describe('Comma-separated list of suggested search terms.'),
});
export type SuggestLeadSearchTermsOutput = z.infer<
  typeof SuggestLeadSearchTermsOutputSchema
>;

export async function suggestLeadSearchTerms(
  input: SuggestLeadSearchTermsInput
): Promise<SuggestLeadSearchTermsOutput> {
  return suggestLeadSearchTermsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestLeadSearchTermsPrompt',
  input: {schema: SuggestLeadSearchTermsInputSchema},
  output: {schema: SuggestLeadSearchTermsOutputSchema},
  prompt: `You are an expert in lead generation and search term optimization. Based on the description of the ideal lead profile, suggest a comma-separated list of relevant search terms.

Ideal Lead Profile Description: {{{idealLeadProfileDescription}}}

Suggested Search Terms:`,
});

const suggestLeadSearchTermsFlow = ai.defineFlow(
  {
    name: 'suggestLeadSearchTermsFlow',
    inputSchema: SuggestLeadSearchTermsInputSchema,
    outputSchema: SuggestLeadSearchTermsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
