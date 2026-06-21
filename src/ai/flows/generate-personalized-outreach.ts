'use server';
/**
 * @fileOverview AI flow for generating personalized outreach messages for leads.
 */
import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateOutreachInputSchema = z.object({
  leadName: z.string(),
  companyName: z.string(),
  leadDetails: z.string(),
  channel: z.enum(['email', 'linkedin']),
});

const GenerateOutreachOutputSchema = z.object({
  message: z.string(),
  subject: z.string().optional(),
});

export async function generatePersonalizedOutreach(input: z.infer<typeof GenerateOutreachInputSchema>) {
  return generatePersonalizedOutreachFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generatePersonalizedOutreachPrompt',
  input: { schema: GenerateOutreachInputSchema },
  output: { schema: GenerateOutreachOutputSchema },
  prompt: `You are a high-performing sales development representative.
Generate a personalized {{channel}} outreach message for:
Lead: {{leadName}}
Company: {{companyName}}
Context: {{leadDetails}}

Requirements:
- Professional, warm, and helpful tone.
- Reference a specific detail from the context to show research.
- Clear call-to-action.
- If email, provide a subject line.

{{channel}} Message:`,
});

const generatePersonalizedOutreachFlow = ai.defineFlow(
  {
    name: 'generatePersonalizedOutreachFlow',
    inputSchema: GenerateOutreachInputSchema,
    outputSchema: GenerateOutreachOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
