import type { Lead } from '@/types';

export function calculateCompleteness(lead: Lead): {
  score: number;
  missing: string[];
  hasRequiredFields: boolean;
} {
  const required = ['name', 'phone', 'email', 'address', 'website'];
  
  const present: string[] = [];
  
  if (lead.name && lead.name.trim() !== '' && lead.name.toLowerCase() !== 'unknown') {
    present.push('name');
  }
  
  if (lead.phone && lead.phone.trim() !== '' && lead.phone.toLowerCase() !== 'n/a') {
    present.push('phone');
  }
  
  if (lead.email && lead.email.trim() !== '' && !lead.email.includes('no-email')) {
    present.push('email');
  }
  
  if (lead.company?.address && lead.company.address.formatted && lead.company.address.formatted.trim() !== '') {
    present.push('address');
  }
  
  if (lead.company?.website && lead.company.website.trim() !== '') {
    present.push('website');
  }

  return {
    score: Math.round((present.length / required.length) * 100),
    missing: required.filter(f => !present.includes(f)),
    hasRequiredFields: present.length === required.length,
  };
}
