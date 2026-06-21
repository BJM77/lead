import { config } from 'dotenv';
config();

import '@/ai/flows/suggest-lead-search-terms.ts';
import '@/ai/flows/lead-summary.ts';
import '@/ai/flows/find-leads.ts';
import '@/ai/flows/feedback-loop.ts';
import '@/ai/flows/analyze-image-for-lead.ts';
import '@/ai/flows/create-lead-from-form.ts';
import '@/ai/flows/extract-lead-from-url.ts';
import '@/ai/flows/health-check.ts';
import '@/ai/flows/extract-multiple-leads-from-url.ts';
import '@/ai/flows/analyze-ad-for-lead.ts';
import '@/ai/flows/prospect-from-street-view.ts';
import '@/ai/flows/discover-urls.ts';
