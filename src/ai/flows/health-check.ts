'use server';
/**
 * @fileOverview A simple health check flow for the AI system.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const HealthCheckInputSchema = z.object({
  ping: z.string(),
});
export type HealthCheckInput = z.infer<typeof HealthCheckInputSchema>;

const HealthCheckOutputSchema = z.object({
  pong: z.string(),
});
export type HealthCheckOutput = z.infer<typeof HealthCheckOutputSchema>;

export async function healthCheck(
  input: HealthCheckInput
): Promise<HealthCheckOutput> {
  return healthCheckFlow(input);
}

const healthCheckFlow = ai.defineFlow(
  {
    name: 'healthCheckFlow',
    inputSchema: HealthCheckInputSchema,
    outputSchema: HealthCheckOutputSchema,
  },
  async (input) => {
    return { pong: input.ping };
  }
);
