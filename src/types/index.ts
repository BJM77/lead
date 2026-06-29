import { z } from 'zod';

export const CompanySchema = z.object({
  name: z.string(),
  industry: z.string().optional(),
  employeeCount: z.number().optional(),
  revenue: z.number().optional(),
  hiring: z.boolean().optional(),
  fundingRaised: z.number().optional(),
  lastFunding: z.object({
    amount: z.string(),
    date: z.string(),
  }).optional(),
  techStack: z.array(z.string()).optional(),
  intentSignals: z.array(z.string()).optional(),
  website: z.string().optional(),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().optional(),
    formatted: z.string().optional(),
  }).optional(),
});
export type Company = z.infer<typeof CompanySchema>;

export const LeadSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  title: z.string().optional(),
  company: CompanySchema,
  email: z.string().optional(),
  phone: z.string().optional(),
  status: z.enum(['New', 'Contacted', 'Qualified', 'Lost']),
  quality: z.number(),
  source: z.enum(['Web Page Capture', 'Image Upload', 'Social Media Capture', 'Bulk URL Capture', 'AI Search', 'Street View Prospecting', 'URL Discovery']),
  sourceUrl: z.string().optional(),
  details: z.string(),
  seniority: z.string().optional(),
  createdAt: z.number(),
  // World-Class Intelligence Fields
  confidenceScore: z.number().optional(),
  intelligenceInsights: z.array(z.string()).optional(),
  intentEvidence: z.record(z.string()).optional(),
  compliance: z.object({
    gdprCompliant: z.boolean(),
    ccpaCompliant: z.boolean(),
    consentTimestamp: z.number().optional(),
  }).optional(),
});
export type Lead = z.infer<typeof LeadSchema>;

export const NewLeadSchema = LeadSchema.omit({ 
    id: true, 
    userId: true, 
    createdAt: true 
});
export type NewLead = z.infer<typeof NewLeadSchema>;

export const ExtractedLeadDataSchema = z.object({
  name: z.string().optional().describe("Potential contact person."),
  title: z.string().optional().describe("Job title."),
  companyName: z.string().optional().describe("Company name."),
  email: z.string().optional().describe("Contact email."),
  phone: z.string().optional().describe("Contact phone."),
  website: z.string().optional().describe("Website URL."),
  details: z.string().optional().describe("Relevant details."),
  evidence: z.record(z.string()).optional().describe("Where data was found in HTML."),
  detectedTech: z.array(z.string()).optional().describe("Tech identified (e.g. Shopify)."),
  address: z.string().optional().describe("Physical/business street address."),
  city: z.string().optional().describe("City."),
  state: z.string().optional().describe("State or province."),
  postalCode: z.string().optional().describe("Postal or ZIP code."),
  country: z.string().optional().describe("Country."),
});
export type ExtractedLeadData = z.infer<typeof ExtractedLeadDataSchema>;

export const DiscoveredUrlSchema = z.object({
  url: z.string().url(),
  title: z.string(),
  snippet: z.string(),
  relevanceScore: z.number(),
});
export type DiscoveredUrl = z.infer<typeof DiscoveredUrlSchema>;

export const JobSchema = z.object({
  id: z.string(),
  userId: z.string(),
  status: z.enum(['pending', 'processing', 'completed', 'failed']),
  type: z.string(),
  progress: z.number().optional(),
  message: z.string().optional(),
  error: z.string().optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export type Job = z.infer<typeof JobSchema>;
