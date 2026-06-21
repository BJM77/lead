import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import type { Lead, Company, NewLead } from '@/types';
import { logger } from './logger';
import { generateEmailPermutations } from './email-discovery';

const EnrichmentOutputSchema = z.object({
  name: z.string().optional().describe("First and last name of the best contact person found, or 'Unknown'"),
  title: z.string().optional().describe("Job title or role"),
  email: z.string().optional().describe("Email address found, or generate a best-guess email based on name and domain if name is known, e.g. john.doe@company.com"),
  phone: z.string().optional().describe("Phone number"),
  isOutOfRegion: z.boolean().optional().describe("Set to true if a location constraint was provided and this lead is definitively located in a different country/region (e.g. US, Europe) rather than the target region."),
  company: z.object({
    name: z.string().describe("Company name"),
    industry: z.string().optional().describe("Industry category"),
    employeeCount: z.number().optional().describe("Estimated employee count"),
    revenue: z.number().optional().describe("Estimated revenue in USD"),
    hiring: z.boolean().optional().describe("Is the company hiring?"),
    fundingRaised: z.number().optional().describe("Estimated funding raised in USD"),
    techStack: z.array(z.string()).optional().describe("List of technologies detected or mentioned"),
    intentSignals: z.array(z.string()).optional().describe("Bullet points of recent news, expansion, or growth indicators"),
  }),
  insights: z.array(z.string()).optional().describe("Key observations or business opportunities for outreach"),
});

const enrichmentPrompt = ai.definePrompt({
  name: 'enrichLeadPrompt',
  input: {
    schema: z.object({
      rawText: z.string(),
      companyName: z.string().optional(),
      contactName: z.string().optional(),
      targetLocation: z.string().optional(),
    }),
  },
  output: { schema: EnrichmentOutputSchema },
  prompt: `You are a world-class lead intelligence and enrichment agent.
Analyze the following raw scraped website data and search snippets.
Extract contact details for the best decision-maker or key contact found on the site (like CEO, Founder, VP, Marketing Director, Manager).
Also extract detailed company firmographics (industry, employee count, estimated revenue, funding, whether they are actively hiring, technologies used, intent signals/recent news).

If no email address is found but you have a contact name, please construct a best-guess email address using their name and the company website domain (e.g. john.doe@company.com or jdoe@company.com).

Given context:
- Company Name Hint: {{companyName}}
- Contact Name Hint: {{contactName}}
- Target Location Constraint: {{targetLocation}} (If specified, verify if the lead/company resides here. If they are clearly located elsewhere, flag 'isOutOfRegion' as true.)

Raw Scraped Content:
"""
{{rawText}}
"""
`
});

export async function enrichLeadData(lead: Partial<NewLead> & { targetLocation?: string }): Promise<NewLead & { isOutOfRegion?: boolean }> {
  const companyName = typeof lead.company === 'string' ? lead.company : lead.company?.name;
  logger.info(`[Enrichment] Starting real AI enrichment for company: ${companyName}`);

  const rawText = lead.details || '';
  
  try {
    const { output } = await enrichmentPrompt({
      rawText,
      companyName: companyName || '',
      contactName: lead.name || '',
      targetLocation: lead.targetLocation || 'Australia',
    });

    if (!output) {
      throw new Error("AI returned empty enrichment response.");
    }

    const companyData: Company = {
      name: output.company.name || companyName || 'Unknown Company',
      industry: output.company.industry || lead.company?.industry || 'Technology',
      employeeCount: output.company.employeeCount || lead.company?.employeeCount || undefined,
      revenue: output.company.revenue || lead.company?.revenue || undefined,
      hiring: output.company.hiring !== undefined ? output.company.hiring : lead.company?.hiring,
      fundingRaised: output.company.fundingRaised || lead.company?.fundingRaised || undefined,
      techStack: Array.from(new Set([...(output.company.techStack || []), ...(lead.company?.techStack || [])])),
      intentSignals: output.company.intentSignals || lead.company?.intentSignals || [],
      website: lead.company?.website || undefined,
    };

    let resolvedEmail = output.email || lead.email;
    const finalName = output.name || lead.name;
    const website = companyData.website || (typeof lead.company !== 'string' ? lead.company?.website : undefined);

    if ((!resolvedEmail || resolvedEmail === 'no-email@example.com') && finalName && finalName !== 'Unknown Lead' && website) {
        const permutations = generateEmailPermutations(finalName, website);
        if (permutations.length > 0) {
            resolvedEmail = permutations[0];
            logger.info(`[Enrichment] AI didn't find email. Generated best guess: ${resolvedEmail}`);
        }
    }

    // Construct enriched lead data
    const enrichedLead: NewLead = {
      name: finalName || 'Unknown Lead',
      title: output.title || lead.title || 'Decision Maker',
      company: companyData,
      email: resolvedEmail || 'no-email@example.com',
      phone: output.phone || lead.phone || 'N/A',
      status: lead.status || 'New',
      quality: lead.quality || 0,
      source: lead.source || 'AI Search',
      details: lead.details || '',
      seniority: output.title ? inferSeniority(output.title) : lead.seniority || 'manager',
      intelligenceInsights: output.insights || [],
      intentEvidence: lead.intentEvidence || {},
    };

    // Update details string to append the real intelligence report nicely
    const insightsStr = enrichedLead.intelligenceInsights?.length 
      ? `\n\n[Intelligence Insights]\n${enrichedLead.intelligenceInsights.join('\n')}` 
      : '';
    const intentSignalsStr = companyData.intentSignals?.length 
      ? `\n\n[Company News / Intent Signals]\n${companyData.intentSignals.join('\n')}` 
      : '';
      
    enrichedLead.details = `${lead.details || ''}${insightsStr}${intentSignalsStr}`;

    return {
      ...enrichedLead,
      isOutOfRegion: output.isOutOfRegion || false,
    };
  } catch (error: any) {
    logger.error(`[Enrichment] AI enrichment failed: ${error.message}. Falling back to standard format.`);
    // Return original lead with basic parsed fields
    return {
      ...lead,
      name: lead.name || 'Unknown Lead',
      company: typeof lead.company === 'string' ? { name: lead.company } : lead.company || { name: 'Unknown Company' },
      email: lead.email || 'no-email@example.com',
      phone: lead.phone || 'N/A',
      status: lead.status || 'New',
      quality: lead.quality || 0,
      source: lead.source || 'AI Search',
      details: lead.details || '',
    } as NewLead;
  }
}

function inferSeniority(title: string): string {
  const t = title.toLowerCase();
  if (t.includes('ceo') || t.includes('founder') || t.includes('president') || t.includes('owner') || t.includes('chief')) {
    return 'executive';
  }
  if (t.includes('vp') || t.includes('vice president') || t.includes('director') || t.includes('head')) {
    return 'director';
  }
  if (t.includes('manager') || t.includes('lead')) {
    return 'manager';
  }
  return 'individual_contributor';
}
