'use server';

import { z } from 'genkit';
import { logger } from '@/lib/logger';
import { createLead } from '@/lib/db';
import type { NewLead } from '@/types';
import fetch from 'node-fetch';
import { calculateLeadScore } from '@/lib/scoring';

const FindLeadsByPlaceInputSchema = z.object({
  query: z.string().describe('Search query, e.g., "plumbers in Sydney"'),
});

export type FindLeadsByPlaceInput = z.infer<typeof FindLeadsByPlaceInputSchema>;

const FindLeadsByPlaceOutputSchema = z.object({
  message: z.string(),
  savedCount: z.number().optional(),
});

export type FindLeadsByPlaceOutput = z.infer<typeof FindLeadsByPlaceOutputSchema>;

export async function findLeadsByPlace(input: FindLeadsByPlaceInput): Promise<FindLeadsByPlaceOutput> {
  logger.info(`[Places Search] Starting search for: ${input.query}`);
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    logger.error('[Places Search] GOOGLE_MAPS_API_KEY is not configured');
    return { message: 'Google Maps API key is not configured.' };
  }

  try {
    const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(input.query)}&key=${apiKey}`;
    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) throw new Error(`HTTP ${searchRes.status}`);
    
    const searchData = (await searchRes.json()) as any;
    
    if (!searchData.results || searchData.results.length === 0) {
      return { message: 'No leads found for that query.' };
    }

    const leads = [];
    const limit = Math.min(searchData.results.length, 10); // Limit to 10 for performance

    for (let i = 0; i < limit; i++) {
      const place = searchData.results[i];
      const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=name,formatted_phone_number,website,formatted_address,address_components&key=${apiKey}`;
      const detailsRes = await fetch(detailsUrl);
      if (!detailsRes.ok) continue;
      
      const detailsData = (await detailsRes.json()) as any;
      if (!detailsData.result) continue;

      const result = detailsData.result;
      
      let city = '', state = '', postalCode = '', country = '';
      if (result.address_components) {
        for (const component of result.address_components) {
          if (component.types.includes('locality')) city = component.long_name;
          if (component.types.includes('administrative_area_level_1')) state = component.short_name;
          if (component.types.includes('postal_code')) postalCode = component.long_name;
          if (component.types.includes('country')) country = component.long_name;
        }
      }

      const extractedAddress = {
        street: result.formatted_address || '',
        city,
        state,
        postalCode,
        country,
        formatted: result.formatted_address || ''
      };

      const leadToScore: any = {
        id: 'temp',
        userId: 'temp',
        name: 'Unknown',
        title: 'N/A',
        company: {
          name: result.name || 'Unknown Company',
          website: result.website || '',
          address: extractedAddress,
        },
        email: 'no-email@example.com',
        phone: result.formatted_phone_number || '',
        status: 'New',
        quality: 0,
        source: 'AI Search',
        details: 'Found via Google Places API.',
        createdAt: Date.now(),
      };

      const quality = calculateLeadScore(leadToScore as any);
      const newLead: NewLead = {
        name: leadToScore.name,
        title: leadToScore.title,
        company: leadToScore.company,
        email: leadToScore.email,
        phone: leadToScore.phone,
        status: leadToScore.status,
        quality,
        source: leadToScore.source,
        details: leadToScore.details,
      };

      try {
        await createLead(newLead);
        leads.push(newLead);
      } catch (err) {
        logger.error(`[Places Search] Failed to save lead ${result.name}`);
      }
    }

    return {
      message: `Found and saved ${leads.length} potential leads via Google Places.`,
      savedCount: leads.length,
    };

  } catch (error: any) {
    logger.error(`[Places Search] Failed: ${error.message}`);
    return { message: `Search failed: ${error.message}` };
  }
}
