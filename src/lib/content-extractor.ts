import * as cheerio from 'cheerio';

export interface ExtractedContent {
  emails: string[];
  phones: string[];
  addresses: string[];
  linkedin: string | null;
  twitter: string | null;
  facebook: string | null;
  instagram: string | null;
  youtube: string | null;
  companyName: string | null;
  companyDescription: string | null;
  foundedYear: string | null;
  employeeCount: string | null;
  revenue: string | null;
  techStack: string[];
  cms: string[];
  analytics: string[];
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  jsonLd: any[];
  keyPeople: Array<{ name: string; title: string }>;
  internalLinks: string[];
  externalLinks: string[];
  wordCount: number;
  readabilityScore: number;
}

export class ContentExtractor {
  extract(html: string, baseUrl: string): ExtractedContent {
    const $ = cheerio.load(html);
    const text = $('body').text();
    
    return {
      emails: this.extractEmails(text),
      phones: this.extractPhones(text),
      addresses: this.extractAddresses(text),
      
      linkedin: this.extractSocial($, 'linkedin'),
      twitter: this.extractSocial($, 'twitter'),
      facebook: this.extractSocial($, 'facebook'),
      instagram: this.extractSocial($, 'instagram'),
      youtube: this.extractSocial($, 'youtube'),
      
      companyName: this.extractCompanyName($),
      companyDescription: this.extractDescription($),
      foundedYear: this.extractFoundedYear(text),
      employeeCount: this.extractEmployeeCount(text),
      revenue: this.extractRevenue(text),
      
      techStack: this.detectTechStack(html),
      cms: this.detectCMS(html),
      analytics: this.detectAnalytics(html),
      
      ogTitle: this.extractOG($, 'og:title'),
      ogDescription: this.extractOG($, 'og:description'),
      ogImage: this.extractOG($, 'og:image'),
      
      jsonLd: this.extractJsonLd($),
      
      keyPeople: this.extractKeyPeople($),
      
      internalLinks: this.extractInternalLinks($, baseUrl),
      externalLinks: this.extractExternalLinks($, baseUrl),
      
      wordCount: text.split(/\s+/).length,
      readabilityScore: this.calculateReadability(text),
    };
  }

  private extractEmails(text: string): string[] {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const matches = text.match(emailRegex) || [];
    return [...new Set(matches)];
  }

  private extractPhones(text: string): string[] {
    const patterns = [
      /\+?[\d\s\-()]{10,15}/g,
      /\(\d{3}\)\s*\d{3}-\d{4}/g,
      /\d{3}-\d{3}-\d{4}/g,
      /\d{10}/g,
    ];
    
    const phones: string[] = [];
    for (const pattern of patterns) {
      const matches = text.match(pattern);
      if (matches) phones.push(...matches);
    }
    return [...new Set(phones)];
  }

  private extractAddresses(text: string): string[] {
    const patterns = [
      /\d+\s+[A-Za-z]+\s+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Way|Court|Ct)/gi,
      /[A-Za-z\s]+,\s*[A-Z]{2}\s*\d{5}/g,
    ];
    
    const addresses: string[] = [];
    for (const pattern of patterns) {
      const matches = text.match(pattern);
      if (matches) addresses.push(...matches);
    }
    return [...new Set(addresses)];
  }

  private extractSocial($: cheerio.CheerioAPI, platform: string): string | null {
    const selectors = [
      `a[href*="${platform}.com"]`,
      `meta[property="og:${platform}"]`,
      `meta[name="${platform}:site"]`,
    ];
    
    for (const selector of selectors) {
      const el = $(selector).first();
      if (el.length) {
        const href = el.attr('href') || el.attr('content');
        if (href) return href;
      }
    }
    return null;
  }

  private extractCompanyName($: cheerio.CheerioAPI): string | null {
    const sources = [
      $('meta[property="og:site_name"]').attr('content'),
      $('meta[name="application-name"]').attr('content'),
      $('title').text(),
      $('h1').first().text(),
      $('.company-name, .brand, .logo').text(),
    ];
    
    for (const source of sources) {
      if (source && source.length > 1) {
        return source.trim();
      }
    }
    return null;
  }

  private extractDescription($: cheerio.CheerioAPI): string | null {
    const sources = [
      $('meta[name="description"]').attr('content'),
      $('meta[property="og:description"]').attr('content'),
      $('p').first().text(),
    ];
    
    for (const source of sources) {
      if (source && source.length > 10) {
        return source.trim();
      }
    }
    return null;
  }

  private detectTechStack(html: string): string[] {
    const techs: string[] = [];
    
    const patterns: Record<string, RegExp[]> = {
      'React': [/react/i, /_next\/static/i, /data-reactroot/i],
      'Vue': [/vue/i, /data-v-/i, /v-for/i],
      'Angular': [/ng-/i, /_ngcontent/i],
      'jQuery': [/jquery/i],
      'Bootstrap': [/bootstrap/i],
      'Tailwind': [/tailwind/i],
      'Svelte': [/svelte/i],
      'Alpine': [/alpine/i],
      'HTMX': [/htmx/i],
    };
    
    for (const [tech, techPatterns] of Object.entries(patterns)) {
      for (const pattern of techPatterns) {
        if (pattern.test(html)) {
          techs.push(tech);
          break;
        }
      }
    }
    
    return techs;
  }

  private detectCMS(html: string): string[] {
    const cms: string[] = [];
    
    if (html.includes('wp-content') || html.includes('wordpress')) cms.push('WordPress');
    if (html.includes('cdn.shopify.com')) cms.push('Shopify');
    if (html.includes('woocommerce')) cms.push('WooCommerce');
    if (html.includes('magento')) cms.push('Magento');
    if (html.includes('drupal')) cms.push('Drupal');
    if (html.includes('joomla')) cms.push('Joomla');
    if (html.includes('webflow')) cms.push('Webflow');
    if (html.includes('squarespace')) cms.push('Squarespace');
    if (html.includes('wix')) cms.push('Wix');
    
    return cms;
  }

  private detectAnalytics(html: string): string[] {
    const analytics: string[] = [];
    
    if (html.includes('google-analytics') || html.includes('gtag')) analytics.push('Google Analytics');
    if (html.includes('mixpanel')) analytics.push('Mixpanel');
    if (html.includes('amplitude')) analytics.push('Amplitude');
    if (html.includes('segment')) analytics.push('Segment');
    if (html.includes('hotjar')) analytics.push('Hotjar');
    if (html.includes('clarity')) analytics.push('Microsoft Clarity');
    if (html.includes('facebook') && html.includes('pixel')) analytics.push('Facebook Pixel');
    if (html.includes('linkedin') && html.includes('insight')) analytics.push('LinkedIn Insight');
    
    return analytics;
  }

  private extractOG($: cheerio.CheerioAPI, property: string): string | null {
    const value = $(`meta[property="${property}"]`).attr('content');
    return value || null;
  }

  private extractJsonLd($: cheerio.CheerioAPI): any[] {
    const items: any[] = [];
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const json = JSON.parse($(el).html() || '{}');
        items.push(json);
      } catch (e) {
        // Invalid JSON, skip
      }
    });
    return items;
  }

  private extractKeyPeople($: cheerio.CheerioAPI): Array<{ name: string; title: string }> {
    const people: Array<{ name: string; title: string }> = [];
    
    $('.team, .people, .staff, .about').each((_, section) => {
      $(section).find('.member, .person, .employee, .profile').each((_, person) => {
        const name = $(person).find('.name, h3, h4').text().trim();
        const title = $(person).find('.title, .role, .position').text().trim();
        if (name) people.push({ name, title });
      });
    });
    
    return people.slice(0, 10);
  }

  private extractInternalLinks($: cheerio.CheerioAPI, baseUrl: string): string[] {
    const links: string[] = [];
    let base: URL;
    try {
      base = new URL(baseUrl);
    } catch {
      return [];
    }
    
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      if (!href) return;
      
      try {
        const url = new URL(href, baseUrl);
        if (url.hostname === base.hostname) {
          links.push(url.pathname);
        }
      } catch (e) {
        // Invalid URL
      }
    });
    
    return [...new Set(links)].slice(0, 50);
  }

  private extractExternalLinks($: cheerio.CheerioAPI, baseUrl: string): string[] {
    const links: string[] = [];
    let base: URL;
    try {
      base = new URL(baseUrl);
    } catch {
      return [];
    }
    
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      if (!href) return;
      
      try {
        const url = new URL(href, baseUrl);
        if (url.hostname !== base.hostname) {
          links.push(url.toString());
        }
      } catch (e) {
        // Invalid URL
      }
    });
    
    return [...new Set(links)].slice(0, 50);
  }

  private extractFoundedYear(text: string): string | null {
    const patterns = [
      /founded\s+in\s+(\d{4})/i,
      /established\s+(\d{4})/i,
      /since\s+(\d{4})/i,
      /found(?:ed)?\s+(\d{4})/i,
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[1];
    }
    return null;
  }

  private extractEmployeeCount(text: string): string | null {
    const patterns = [
      /(\d+)\s*[-–]\s*(\d+)\s+employees?/i,
      /(\d+)\s+employees?/i,
      /employee\s+count\s*[:=]\s*(\d+)/i,
      /team\s+of\s+(\d+)/i,
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[0];
    }
    return null;
  }

  private extractRevenue(text: string): string | null {
    const patterns = [
      /\$(\d+\.?\d*)\s*(?:million|M|billion|B)/i,
      /revenue\s+[:=]\s*\$(\d+\.?\d*)/i,
      /annual\s+revenue\s+[:=]\s*\$(\d+\.?\d*)/i,
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[0];
    }
    return null;
  }

  private calculateReadability(text: string): number {
    const words = text.split(/\s+/).length;
    const sentences = text.split(/[.!?]+/).length;
    const syllables = text.match(/[aeiou]/gi)?.length || 0;
    
    if (sentences === 0 || words === 0) return 0;
    
    return 206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words);
  }
}

export const contentExtractor = new ContentExtractor();
