/**
 * @fileOverview Validates and enhances lead data extracted from various sources.
 */
export class LeadValidator {
  static validate(leadData: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!leadData.companyName && !leadData.name) {
      errors.push('Missing both company name and contact name.');
    }
    
    if (leadData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(leadData.email)) {
        errors.push(`Invalid email format: ${leadData.email}`);
      }
    }
    
    if (leadData.website) {
      try {
        new URL(leadData.website);
      } catch {
        errors.push(`Invalid URL format: ${leadData.website}`);
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  static enhance(leadData: any): any {
    const enhanced = { ...leadData };
    
    if (enhanced.email) {
      enhanced.email = enhanced.email.toLowerCase().trim();
      enhanced.domain = enhanced.email.split('@')[1];
    }
    
    if (enhanced.website && !enhanced.website.startsWith('http')) {
      enhanced.website = `https://${enhanced.website}`;
    }
    
    return enhanced;
  }
}
