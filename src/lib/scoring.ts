import type { Lead } from '@/types';

/**
 * Multi-Factor Scoring Engine v3.0 (Logistics & Australia Optimized)
 * Evaluates leads across Firmographics, Intent, Technical Fit, and Regional relevance.
 */
export function calculateLeadScore(lead: Lead): number {
  let score = 0;

  // 1. Regional Integrity & Local Fit (Max 25 pts)
  const website = lead.company?.website || '';
  const isAuDomain = website.endsWith('.au') || website.includes('.com.au') || website.includes('.net.au');
  if (isAuDomain) score += 15;
  
  // Check details/metadata for Australian states/keywords
  const detailsUpper = (lead.details || '').toUpperCase();
  const hasAuState = /NSW|VIC|QLD|WA|SA|TAS|ACT|NT|AUSTRALIA/i.test(detailsUpper);
  if (hasAuState) score += 10;

  // 2. Firmographic & Industry Fit (Max 30 pts)
  const industry = (lead.company?.industry || '').toLowerCase();
  const logisticsKeywords = ['logistics', 'shipping', 'freight', 'cargo', 'supply chain', 'warehouse', 'delivery', 'transport', 'distribution', 'e-commerce', 'ecommerce', 'retail'];
  const hasLogisticsFit = logisticsKeywords.some(kw => industry.includes(kw));
  if (hasLogisticsFit) score += 20;

  if (lead.company?.employeeCount) {
    if (lead.company.employeeCount > 100) score += 10;
    else if (lead.company.employeeCount > 20) score += 5;
  }

  // 3. Technical Strategy Match (Max 25 pts)
  // Reward logistics, shipping platforms, e-commerce systems, and ERPs
  const highValueTech = [
    'ShipStation', 'Starshipit', 'Shippit', 'Sendle', 'Australia Post',
    'CartonCloud', 'SAP', 'Oracle', 'NetSuite', 'Shopify', 'WooCommerce',
    'Magento', 'BigCommerce', 'Salesforce'
  ];
  const detectedTech = lead.company?.techStack || [];
  const techMatchCount = detectedTech.filter(t => 
    highValueTech.some(h => t.toLowerCase().includes(h.toLowerCase()))
  ).length;
  score += Math.min(25, techMatchCount * 8);

  // 4. Contact Integrity & Authority (Max 20 pts)
  const title = (lead.title || '').toLowerCase();
  if (title.includes('director') || title.includes('manager') || title.includes('head') || title.includes('lead') || title.includes('vp')) {
    score += 10;
  } else if (title.includes('ceo') || title.includes('founder') || title.includes('president') || title.includes('owner')) {
    score += 10;
  }
  
  if (lead.email && !lead.email.includes('no-email') && lead.email.includes('@')) {
    score += 10;
  }

  return Math.floor(Math.max(0, Math.min(100, score)));
}
