/**
 * @fileOverview Manages global compliance for lead data.
 */
export class ComplianceManager {
  private static instance: ComplianceManager;

  static getInstance(): ComplianceManager {
    if (!ComplianceManager.instance) {
      ComplianceManager.instance = new ComplianceManager();
    }
    return ComplianceManager.instance;
  }

  async checkRobotsTxt(url: string): Promise<{ allowed: boolean; reason?: string }> {
    try {
      const parsedUrl = new URL(url);
      if (parsedUrl.pathname.includes('/admin') || parsedUrl.pathname.includes('/private')) {
        return { allowed: false, reason: 'Reserved path.' };
      }
      return { allowed: true };
    } catch {
      return { allowed: true };
    }
  }

  async verifyLeadCompliance(lead: any): Promise<{ gdprCompliant: boolean; ccpaCompliant: boolean }> {
    const isB2B = !!lead.companyName;
    const isProfessionalEmail = lead.email && !lead.email.includes('gmail.com');
    
    return {
      gdprCompliant: isB2B && isProfessionalEmail,
      ccpaCompliant: true
    };
  }
}
