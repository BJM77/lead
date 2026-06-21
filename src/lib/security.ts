import DOMPurify from 'isomorphic-dompurify';

export class SecurityUtils {
  /**
   * Sanitizes HTML content using DOMPurify
   */
  static sanitizeHtml(html: string): string {
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['p', 'br', 'b', 'i', 'strong', 'em'],
      ALLOWED_ATTR: []
    });
  }

  /**
   * Validates target URLs for scraping.
   * Ensures the protocol is http/https and blocks local loopback or dangerous hosts.
   */
  static validateUrl(urlStr: string): boolean {
    try {
      const parsed = new URL(urlStr);
      const allowedProtocols = ['http:', 'https:'];
      if (!allowedProtocols.includes(parsed.protocol)) {
        return false;
      }

      const hostname = parsed.hostname.toLowerCase();
      
      // Block loopbacks, locals, and dangerous hostnames
      const blockedHosts = ['localhost', '127.0.0.1', '0.0.0.0', '::1'];
      if (blockedHosts.includes(hostname) || hostname.endsWith('.local')) {
        return false;
      }

      return hostname.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Sanitizes input to mitigate basic prompt injection attempts.
   */
  static sanitizePromptInput(input: string): string {
    if (!input) return '';
    // Strip braces, brackets and characters commonly used for injection/delimiting
    return input.replace(/[<>{}|]/g, '').trim();
  }
}
