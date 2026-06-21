'use server';
/**
 * @fileOverview AI flow to discover specific URLs based on search queries with internal deduplication.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { logger } from '@/lib/logger';
import { DiscoveredUrlSchema, type DiscoveredUrl } from '@/types';

const DiscoverUrlsInputSchema = z.object({
  query: z.string().describe("The search query or keyword to find target URLs."),
  limit: z.number().default(10),
});

const DiscoverUrlsOutputSchema = z.object({
  urls: z.array(DiscoveredUrlSchema),
  message: z.string(),
});

/**
 * Normalizes a URL for comparison to help with deduplication.
 */
function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    return (u.origin + u.pathname).replace(/\/$/, '').toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

export async function discoverUrls(input: z.infer<typeof DiscoverUrlsInputSchema>) {
  return discoverUrlsFlow(input);
}

const discoverUrlsFlow = ai.defineFlow(
  {
    name: 'discoverUrlsFlow',
    inputSchema: DiscoverUrlsInputSchema,
    outputSchema: DiscoverUrlsOutputSchema,
  },
  async (input) => {
    logger.info(`[URL Discovery] Running discovery for query: ${input.query}`);

    const prompt = `You are a search intelligence bot. The user is looking for URLs that match a specific search pattern: "${input.query}".
    
    CRITICAL: Only return domains and businesses that are located in Australia. All candidate URLs must belong to Australian companies, organizations, or Australian branches (preferring .com.au, .net.au, .org.au, .edu.au or other domains clearly operating in and targetting the Australian market).
    
    Based on your internal knowledge, provide a list of {{limit}} unique candidate URLs for real businesses in Australia that likely match this pattern.
    Focus on well-known or verifiable corporate domains that would have such pages.
    
    For each URL, provide:
    1. The URL of the specific page.
    2. A descriptive title for the business/page.
    3. A brief snippet of what a user would see on that page.
    4. A relevance score from 0-100.`;

    const { output } = await ai.generate({
      prompt: prompt.replace('{{limit}}', (input.limit * 2).toString()), // Ask for more to allow for filtering
      output: { schema: z.object({ urls: z.array(DiscoveredUrlSchema) }) }
    });

    const rawUrls = output?.urls || [];
    
    // Internal deduplication of AI results
    const seen = new Set<string>();
    const uniqueUrls: DiscoveredUrl[] = [];

    for (const item of rawUrls) {
      const normalized = normalizeUrl(item.url);
      if (!seen.has(normalized)) {
        seen.add(normalized);
        uniqueUrls.push(item);
      }
    }

    const finalUrls = uniqueUrls.slice(0, input.limit);

    return {
      urls: finalUrls,
      message: `Identified ${finalUrls.length} unique candidate targets matching your criteria.`
    };
  }
);
