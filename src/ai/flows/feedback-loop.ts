'use server';
/**
 * @fileOverview A flow for tracking lead outcomes and providing feedback to the AI model.
 *
 * - trackLeadOutcome - A function that updates a lead's outcome and informs the AI.
 */
import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { updateLeadOutcome } from '@/lib/db';

const TrackLeadOutcomeInputSchema = z.object({
  leadId: z.string(),
  outcome: z.enum(['converted', 'lost', 'unresponsive']),
  notes: z.string().optional(),
});
export type TrackLeadOutcomeInput = z.infer<typeof TrackLeadOutcomeInputSchema>;

const TrackLeadOutcomeOutputSchema = z.object({
  success: z.boolean(),
});
export type TrackLeadOutcomeOutput = z.infer<typeof TrackLeadOutcomeOutputSchema>;

export async function trackLeadOutcome(
  input: TrackLeadOutcomeInput
): Promise<TrackLeadOutcomeOutput> {
  return trackLeadOutcomeFlow(input);
}

const trackLeadOutcomeFlow = ai.defineFlow(
  {
    name: 'trackLeadOutcomeFlow',
    inputSchema: TrackLeadOutcomeInputSchema,
    outputSchema: TrackLeadOutcomeOutputSchema,
  },
  async (input) => {
    // 1. Update lead in database
    await updateLeadOutcome(input.leadId, input.outcome);

    // 2. Send feedback to AI model (for model tuning, in a real scenario)
    // This call simulates providing feedback to potentially fine-tune a model.
    // In this example, it doesn't have a direct effect but demonstrates the pattern.
    await ai.generate({
      prompt: `A user has updated a lead's status. Please take this feedback into account for future lead scoring and generation.
        Lead ID: ${input.leadId}
        Outcome: ${input.outcome}
        Notes: ${input.notes || 'None'}
        
        Acknowledge receipt of this feedback by responding with 'Feedback acknowledged'.`,
    });

    return { success: true };
  }
);
