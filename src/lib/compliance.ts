import { logger } from './logger';
import fetch from 'node-fetch';

interface RobotsRules {
  allowed: boolean;
  disallowedPaths: string[];
  crawlDelay?: number;
}

export class ComplianceManager {
  private static instance: ComplianceManager;
  private cache = new Map<string, { rules: RobotsRules; timestamp: number }>();
  private cacheTTL = 3600000; // 1 hour TTL

  static getInstance(): ComplianceManager {
    if (!ComplianceManager.instance) {
      ComplianceManager.instance = new ComplianceManager();
    }
    return ComplianceManager.instance;
  }

  /**
   * Fetches and parses the robots.txt file for a given URL's origin.
   */
  async parseRobotsTxt(url: string): Promise<RobotsRules> {
    try {
      const origin = new URL(url).origin;
      const now = Date.now();

      // Check cache
      if (this.cache.has(origin)) {
        const cached = this.cache.get(origin)!;
        if (now - cached.timestamp < this.cacheTTL) {
          return cached.rules;
        }
      }

      const robotsUrl = `${origin}/robots.txt`;
      logger.info(`[ComplianceManager] Fetching robots.txt for: ${origin}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(robotsUrl, {
        signal: controller.signal as any,
        headers: { 'User-Agent': 'LeadAceBot/1.0' }
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        // No robots.txt or access denied - assume allowed
        const rules = { allowed: true, disallowedPaths: [] };
        this.cache.set(origin, { rules, timestamp: now });
        return rules;
      }

      const content = await response.text();
      const rules = this.parseRobotsContent(content);

      this.cache.set(origin, { rules, timestamp: now });
      return rules;
    } catch (error: any) {
      logger.warn(`[ComplianceManager] Failed to fetch robots.txt: ${error.message}`);
      // Default to allowed on error but don't cache forever
      return { allowed: true, disallowedPaths: [] };
    }
  }

  private parseRobotsContent(content: string): RobotsRules {
    const lines = content.split(/\r?\n/);
    let userAgentMatched = false;
    let allowed = true;
    const disallowedPaths: string[] = [];
    let crawlDelay: number | undefined;

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('#') || trimmed === '') continue;

      const parts = trimmed.split(':');
      if (parts.length < 2) continue;

      const key = parts[0].trim().toLowerCase();
      const value = parts.slice(1).join(':').trim();

      if (key === 'user-agent') {
        const agent = value.toLowerCase();
        // Match specific agent 'leadace' or wildcard '*'
        userAgentMatched = agent === '*' || agent.includes('leadace');
      }

      if (userAgentMatched) {
        if (key === 'disallow') {
          if (value === '/') {
            allowed = false;
          } else if (value !== '') {
            disallowedPaths.push(value);
          }
        } else if (key === 'crawl-delay') {
          const delay = parseInt(value, 10);
          if (!isNaN(delay)) {
            crawlDelay = Math.max(crawlDelay || 0, delay);
          }
        }
      }
    }

    return { allowed, disallowedPaths, crawlDelay };
  }

  /**
   * Check if a URL is allowed to be crawled according to robots.txt disallow rules.
   */
  async checkRobotsTxt(url: string): Promise<{ allowed: boolean; reason?: string; crawlDelay?: number }> {
    try {
      const parsedUrl = new URL(url);
      const path = parsedUrl.pathname + parsedUrl.search;

      // Always block administrative paths
      if (path.includes('/admin') || path.includes('/private') || path.includes('/login')) {
        return { allowed: false, reason: 'Reserved administrative path.' };
      }

      const rules = await this.parseRobotsTxt(url);
      if (!rules.allowed) {
        return { allowed: false, reason: 'Disallowed entirely by robots.txt.' };
      }

      for (const disallowed of rules.disallowedPaths) {
        const ruleRegex = new RegExp('^' + disallowed.replace(/\*/g, '.*').replace(/\?/g, '\\?'));
        if (ruleRegex.test(path)) {
          return { allowed: false, reason: `Disallowed by rule: Disallow: ${disallowed}`, crawlDelay: rules.crawlDelay };
        }
      }

      return { allowed: true, crawlDelay: rules.crawlDelay };
    } catch (e: any) {
      return { allowed: true, reason: `Error during evaluation: ${e.message}` };
    }
  }

  async verifyLeadCompliance(lead: any): Promise<{ gdprCompliant: boolean; ccpaCompliant: boolean }> {
    const isB2B = !!lead.companyName;
    const isProfessionalEmail = lead.email && !lead.email.includes('gmail.com') && !lead.email.includes('yahoo.com');

    return {
      gdprCompliant: isB2B && isProfessionalEmail,
      ccpaCompliant: true
    };
  }
}

export const complianceManager = ComplianceManager.getInstance();
