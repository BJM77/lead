import { ExtractedContent } from './content-extractor';

export interface LeadReport {
  summary: string;
  score: number;
  sections: {
    contact: string[];
    company: string[];
    technology: string[];
    insights: string[];
  };
  recommendations: string[];
}

export class ReportGenerator {
  generate(
    lead: any,
    content: ExtractedContent | null,
    score: number
  ): LeadReport {
    const sections = {
      contact: this._buildContactSection(lead, content),
      company: this._buildCompanySection(lead, content),
      technology: this._buildTechSection(content),
      insights: this._buildInsightsSection(lead, content),
    };

    return {
      summary: this._buildSummary(lead, sections),
      score,
      sections,
      recommendations: this._buildRecommendations(sections),
    };
  }

  private _buildContactSection(lead: any, content: ExtractedContent | null): string[] {
    const lines: string[] = [];
    
    if (lead.name) lines.push(`Name: ${lead.name}`);
    if (lead.title) lines.push(`Title: ${lead.title}`);
    if (lead.email) lines.push(`Email: ${lead.email}`);
    if (lead.phone) lines.push(`Phone: ${lead.phone}`);
    
    if (content) {
      if (content.emails.length > 1) {
        lines.push(`Alternative emails: ${content.emails.slice(1).join(', ')}`);
      }
      if (content.linkedin) lines.push(`LinkedIn: ${content.linkedin}`);
      if (content.twitter) lines.push(`Twitter: ${content.twitter}`);
    }
    
    return lines;
  }

  private _buildCompanySection(lead: any, content: ExtractedContent | null): string[] {
    const lines: string[] = [];
    const companyName = lead.company?.name || (content ? content.companyName : null);
    
    if (companyName) lines.push(`Company: ${companyName}`);
    if (lead.company?.industry) lines.push(`Industry: ${lead.company.industry}`);
    if (lead.company?.employeeCount) lines.push(`Employees: ${lead.company.employeeCount}`);
    
    if (content) {
      if (content.companyDescription) lines.push(`Description: ${content.companyDescription.slice(0, 200)}...`);
      if (content.foundedYear) lines.push(`Founded: ${content.foundedYear}`);
      if (content.revenue) lines.push(`Revenue: ${content.revenue}`);
      if (content.addresses && content.addresses.length > 0) lines.push(`Address: ${content.addresses.join(', ')}`);
    }
    
    return lines;
  }

  private _buildTechSection(content: ExtractedContent | null): string[] {
    const lines: string[] = [];
    
    if (!content) return lines;
    
    if (content.techStack.length > 0) {
      lines.push(`Tech Stack: ${content.techStack.join(', ')}`);
    }
    
    if (content.cms.length > 0) {
      lines.push(`CMS: ${content.cms.join(', ')}`);
    }
    
    if (content.analytics.length > 0) {
      lines.push(`Analytics: ${content.analytics.join(', ')}`);
    }
    
    return lines;
  }

  private _buildInsightsSection(lead: any, content: ExtractedContent | null): string[] {
    const insights: string[] = [];
    
    if (!content) return insights;
    
    if (content.wordCount > 500) {
      insights.push('Rich content with detailed information');
    } else if (content.wordCount > 100) {
      insights.push('Good amount of content available');
    } else {
      insights.push('Limited content, may need more research');
    }
    
    const socials = ['linkedin', 'twitter', 'facebook', 'instagram', 'youtube'];
    const found = socials.filter(s => content[s as keyof ExtractedContent]);
    if (found.length > 2) {
      insights.push(`Strong social presence (${found.join(', ')})`);
    } else if (found.length > 0) {
      insights.push(`Some social presence (${found.join(', ')})`);
    }
    
    if (content.techStack.length > 3) {
      insights.push('Modern tech stack with multiple frameworks');
    } else if (content.techStack.length > 0) {
      insights.push('Uses modern web technology');
    }
    
    if (content.readabilityScore > 60) {
      insights.push('Content is easy to read and understand');
    } else if (content.readabilityScore > 40) {
      insights.push('Content is moderately readable');
    }
    
    return insights;
  }

  private _buildSummary(lead: any, sections: any): string {
    const parts: string[] = [];
    
    const name = lead.name || 'Unknown lead';
    const company = lead.company?.name || 'Unknown company';
    const title = lead.title || 'Unknown role';
    
    parts.push(`Lead Analysis: ${name} at ${company}`);
    parts.push(`Role: ${title}`);
    
    if (sections.insights.length > 0) {
      parts.push(`Key Insight: ${sections.insights[0]}`);
    }
    
    return parts.join('. ');
  }

  private _buildRecommendations(sections: any): string[] {
    const recommendations: string[] = [];
    
    if (sections.contact.length === 0) {
      recommendations.push('No contact information found - need to find email/phone');
    }
    
    if (sections.company.length < 3) {
      recommendations.push('Limited company data - consider additional research');
    }
    
    if (sections.insights.length > 0) {
      recommendations.push(`Lead insight: ${sections.insights[0]}`);
    }
    
    if (sections.contact.some((c: string) => c.includes('Email'))) {
      recommendations.push('Send personalized outreach email');
    }
    if (sections.contact.some((c: string) => c.includes('LinkedIn'))) {
      recommendations.push('Connect on LinkedIn with personalized message');
    }
    
    return recommendations;
  }
}

export const reportGenerator = new ReportGenerator();
