'use server';
/**
 * @fileOverview AI flow to discover specific URLs based on search queries with internal deduplication.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { logger } from '@/lib/logger';
import { DiscoveredUrlSchema, type DiscoveredUrl } from '@/types';

import { searchDuckDuckGo } from '@/lib/scraper';

const DiscoverUrlsInputSchema = z.object({
  query: z.string().describe("The search query or keyword to find target URLs."),
  limit: z.number().default(10),
  excludeUrls: z.array(z.string()).optional().describe("List of URLs/domains to exclude to ensure uniqueness."),
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

    const requestLimit = Math.max(input.limit * 2, 60);
    const hasDorking = /inurl:|intitle:|site:|filetype:/i.test(input.query);
    let finalQuery = input.query;
    
    // If not a dorking query, we can try to be more specific to Australia 
    // depending on the input, but we'll leave the query as is if it looks deliberate.
    if (!hasDorking && !/australia|au/i.test(input.query)) {
        finalQuery = `${input.query} Australia`;
    }

    let searchResults: { url: string; title: string; snippet: string }[] = [];
    try {
        searchResults = await searchDuckDuckGo(finalQuery, requestLimit);
    } catch (e: any) {
        logger.error(`[URL Discovery] DuckDuckGo search failed: ${e.message}`);
    }

    const excludeSet = new Set((input.excludeUrls || []).map(u => normalizeUrl(u)));
    const seen = new Set<string>();
    const uniqueUrls: DiscoveredUrl[] = [];

    for (const item of searchResults) {
      const normalized = normalizeUrl(item.url);
      if (!seen.has(normalized) && !excludeSet.has(normalized)) {
        seen.add(normalized);
        uniqueUrls.push({
          url: item.url,
          title: item.title || 'Untitled Page',
          snippet: item.snippet || 'No snippet available.',
          relevanceScore: 90, // Baseline for a real search result
        });
      }
    }

    let finalUrls = uniqueUrls.slice(0, input.limit);

    // Fallback to AI generation if DuckDuckGo returns nothing and it's not a dorking query
    if (finalUrls.length === 0 && !hasDorking) {
        logger.info(`[URL Discovery] Search engine returned no results. Falling back to AI knowledge.`);
        let prompt = `You are a search intelligence bot. The user is looking for URLs that match a specific search pattern: "${input.query}".
        
        CRITICAL: Only return domains and businesses that are located in Australia. All candidate URLs must belong to Australian companies, organizations, or Australian branches.
        
        Based on your internal knowledge, provide a list of ${requestLimit} unique candidate URLs for real businesses in Australia that likely match this pattern.
        Focus on well-known or verifiable corporate domains that would have such pages.`;

        if (input.excludeUrls && input.excludeUrls.length > 0) {
          prompt += `\n\nCRITICAL: DO NOT include any of the following URLs or domains in your output (exclude them completely):\n${input.excludeUrls.slice(0, 100).map(u => `- ${u}`).join('\n')}`;
        }

        prompt += `\n\nFor each URL, provide:
        1. The URL of the specific page.
        2. A descriptive title for the business/page.
        3. A brief snippet of what a user would see on that page.
        4. A relevance score from 0-100.`;

        const { output } = await ai.generate({
          prompt,
          output: { schema: z.object({ urls: z.array(DiscoveredUrlSchema) }) }
        });

        const rawUrls = output?.urls || [];
        for (const item of rawUrls) {
          const normalized = normalizeUrl(item.url);
          if (!seen.has(normalized) && !excludeSet.has(normalized)) {
            seen.add(normalized);
            uniqueUrls.push(item);
          }
        }
        finalUrls = uniqueUrls.slice(0, input.limit);
    }

    return {
      urls: finalUrls,
      message: `Identified ${finalUrls.length} unique candidate targets matching your criteria.`
    };
  }
);
