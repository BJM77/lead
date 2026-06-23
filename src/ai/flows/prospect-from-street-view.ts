'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { logger } from '@/lib/logger';

const ProspectFromStreetViewInputSchema = z.object({
  address: z.string().min(5, "Address must be at least 5 characters.").describe("The starting address or area to search for businesses."),
});

const ProspecetedBusinessSchema = z.object({
    name: z.string(),
    address: z.string(),
    website: z.string().optional(),
    phone: z.string().optional(),
    placeId: z.string(),
    streetViewImageUrl: z.string().describe("A URL to a Google Street View static image of the business."),
    types: z.array(z.string()).optional(),
});

const ProspectFromStreetViewOutputSchema = z.object({
  businesses: z.array(ProspecetedBusinessSchema).optional(),
  message: z.string().describe("A message describing the outcome."),
});
export type ProspectFromStreetViewOutput = z.infer<typeof ProspectFromStreetViewOutputSchema>;

export async function prospectFromStreetView(
  input: z.infer<typeof ProspectFromStreetViewInputSchema>
): Promise<ProspectFromStreetViewOutput> {
    return prospectFromStreetViewFlow(input);
}


const prospectFromStreetViewFlow = ai.defineFlow(
  {
    name: 'prospectFromStreetViewFlow',
    inputSchema: ProspectFromStreetViewInputSchema,
    outputSchema: ProspectFromStreetViewOutputSchema,
  },
  async ({ address }) => {
    logger.info(`[Street View Prospecting] Starting process for address: ${address}`);
    const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
        logger.error("[Street View Prospecting] Google API Key is not configured.");
        throw new Error("Google API Key is not configured. Please define GOOGLE_MAPS_API_KEY.");
    }

    let lat: number, lng: number;
    try {
        const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
        const geocodeResponse = await fetch(geocodeUrl);
        const geocodeData: any = await geocodeResponse.json();
        if (geocodeData.status !== 'OK' || !geocodeData.results[0]) {
            throw new Error(`Geocoding failed: ${geocodeData.status} - ${geocodeData.error_message || 'No results found.'}`);
        }
        const location = geocodeData.results[0].geometry.location;
        lat = location.lat;
        lng = location.lng;
        logger.info(`[Street View Prospecting] Geocoded address to: ${lat}, ${lng}`);
    } catch (error: any) {
        logger.error(`[Street View Prospecting] Geocoding error: ${error.message}`);
        return { message: `Could not find location for address: ${address}.` };
    }

    let places: any[];
    try {
        const placesUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=200&type=store&key=${apiKey}`;
        const placesResponse = await fetch(placesUrl);
        const placesData: any = await placesResponse.json();
        if (placesData.status !== 'OK') {
            throw new Error(`Places API failed: ${placesData.status} - ${placesData.error_message || 'An error occurred.'}`);
        }
        places = placesData.results;
        logger.info(`[Street View Prospecting] Found ${places.length} nearby places.`);
    } catch (error: any) {
        logger.error(`[Street View Prospecting] Places API error: ${error.message}`);
        return { message: `Failed to find businesses near the address.` };
    }

    const businesses = await Promise.all(
        places.map(async (place) => {
            let placeDetails: any = {};
            try {
                const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=website,formatted_phone_number&key=${apiKey}`;
                const detailsResponse = await fetch(detailsUrl);
                const detailsData: any = await detailsResponse.json();
                if (detailsData.status === 'OK') {
                    placeDetails = detailsData.result;
                }
            } catch (e) {
                logger.warn(`Could not fetch details for place: ${place.name}`);
            }

            const placeLat = place.geometry.location.lat;
            const placeLng = place.geometry.location.lng;
            const streetViewImageUrl = `https://maps.googleapis.com/maps/api/streetview?size=400x300&location=${placeLat},${placeLng}&fov=120&pitch=5&key=${apiKey}`;

            return {
                name: place.name,
                address: place.vicinity,
                website: placeDetails.website,
                phone: placeDetails.formatted_phone_number,
                placeId: place.place_id,
                streetViewImageUrl,
                types: place.types,
            };
        })
    );
    
    const filteredBusinesses = businesses.filter(b => b.name && b.address);

    logger.info(`[Street View Prospecting] Successfully processed ${filteredBusinesses.length} businesses.`);
    return {
        businesses: filteredBusinesses,
        message: `Found ${filteredBusinesses.length} businesses near the location.`,
    };
  }
);
