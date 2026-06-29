import * as dns from 'dns/promises';
import { parsePhoneNumberFromString, CountryCode } from 'libphonenumber-js';
import { logger } from './logger';

export class LeadValidator {
  /**
   * Performs an async deep verification on an email using DNS/MX resolution.
   */
  static async validateEmail(email: string): Promise<{ valid: boolean; confidence: number; details: string }> {
    if (!email || email === 'no-email@example.com') {
      return { valid: false, confidence: 0, details: 'No email provided' };
    }

    // Basic format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { valid: false, confidence: 0, details: 'Invalid email format' };
    }

    const domain = email.split('@')[1];
    try {
      const mxRecords = await dns.resolveMx(domain);
      if (mxRecords && mxRecords.length > 0) {
        // Verify that at least one exchange host can be looked up
        for (const record of mxRecords) {
          try {
            await dns.lookup(record.exchange);
            return {
              valid: true,
              confidence: 0.9,
              details: `Valid MX record: ${record.exchange}`,
            };
          } catch {
            continue; // Try next MX record
          }
        }
        return {
          valid: false,
          confidence: 0.3,
          details: 'MX records found but none resolved to IP addresses',
        };
      }
      return {
        valid: false,
        confidence: 0.2,
        details: 'No MX records found',
      };
    } catch (error: any) {
      return {
        valid: false,
        confidence: 0.1,
        details: `DNS lookup failed: ${error.message || error}`,
      };
    }
  }

  /**
   * Validates and formats a phone number using libphonenumber-js, with regex-based backfalls.
   */
  static validatePhone(phone: string, countryCode: CountryCode = 'AU'): { valid: boolean; formatted: string } {
    if (!phone || phone === 'N/A') return { valid: false, formatted: '' };

    // 1. Try libphonenumber-js first
    try {
      const parsed = parsePhoneNumberFromString(phone, countryCode);
      if (parsed && parsed.isValid()) {
        return {
          valid: true,
          formatted: parsed.formatInternational(),
        };
      }
    } catch {
      // Fallback to regex
    }

    // 2. Regex-based fallback matching structures
    const cleaned = phone.replace(/[\s\-()]/g, '');
    const regexes = [
      /^\+?1?\d{10}$/, // US
      /^\+?44\d{10}$/, // UK
      /^\+?61\d{9}$/, // Australia
      /^\+?\d{8,15}$/, // Generic international
    ];

    for (const regex of regexes) {
      if (regex.test(cleaned)) {
        return { valid: true, formatted: cleaned };
      }
    }

    return { valid: false, formatted: phone };
  }

  /**
   * Formats/enhances lead details in place.
   */
  static enhance(leadData: any): any {
    const enhanced = { ...leadData };

    if (enhanced.email) {
      enhanced.email = enhanced.email.toLowerCase().trim();
      enhanced.domain = enhanced.email.split('@')[1];
    }

    if (enhanced.website && !enhanced.website.startsWith('http')) {
      enhanced.website = `https://${enhanced.website}`;
    }

    if (enhanced.phone && enhanced.phone !== 'N/A') {
      const phoneValidation = this.validatePhone(enhanced.phone, 'AU');
      if (phoneValidation.valid) {
        enhanced.phone = phoneValidation.formatted;
      }
    }

    return enhanced;
  }

  /**
   * Calculates overall validation status for backward compatibility.
   */
  static async validate(leadData: any): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    if (!leadData.companyName && !leadData.name) {
      errors.push('Missing both company name and contact name.');
    }

    if (leadData.email) {
      const emailResult = await this.validateEmail(leadData.email);
      if (!emailResult.valid) {
        errors.push(emailResult.details);
      }
    }

    if (leadData.phone) {
      const phoneResult = this.validatePhone(leadData.phone, 'AU');
      if (!phoneResult.valid) {
        errors.push(`Invalid phone format/region: ${leadData.phone}`);
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
      errors,
    };
  }

  /**
   * Calculates overall intelligence confidence index using weights.
   */
  static async calculateConfidence(lead: any): Promise<number> {
    let confidence = 0;
    const weights = {
      email: 0.3,
      phone: 0.2,
      companyName: 0.15,
      name: 0.15,
      website: 0.1,
      title: 0.05,
      details: 0.05,
    };

    // Email validation weight
    if (lead.email) {
      const emailValidation = await this.validateEmail(lead.email);
      confidence += weights.email * emailValidation.confidence;
    }

    // Phone validation weight
    if (lead.phone) {
      const phoneValidation = this.validatePhone(lead.phone, 'AU');
      confidence += weights.phone * (phoneValidation.valid ? 0.9 : 0.1);
    }

    // Company name weight
    const compName = typeof lead.company === 'string' ? lead.company : lead.company?.name || lead.companyName;
    if (compName && compName.length > 2 && compName !== 'Unknown Company') {
      confidence += weights.companyName;
    }

    // Contact name weight
    if (lead.name && lead.name.length > 2 && lead.name !== 'Unknown Lead') {
      confidence += weights.name;
    }

    // Website validation weight
    const web = lead.website || lead.company?.website;
    if (web) {
      try {
        new URL(web);
        confidence += weights.website;
      } catch {
        // Invalid URL
      }
    }

    // Job Title weight
    if (lead.title && lead.title.length > 2 && lead.title !== 'Decision Maker') {
      confidence += weights.title;
    }

    // Details/Snippet content weight
    if (lead.details && lead.details.length > 20) {
      confidence += weights.details;
    }

    return Math.round(Math.min(confidence, 1) * 100);
  }
}
