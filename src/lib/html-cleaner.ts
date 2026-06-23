export function cleanHtml(html: string, maxLength: number = 35000): string {
  if (!html) return '';
  
  let cleaned = html
    // Remove script tags
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove style tags
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    // Remove SVG tags
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, '')
    // Remove link tags
    .replace(/<link\b[^>]*>/gi, '')
    // Remove comments
    .replace(/<!--[\s\S]*?-->/g, '')
    // Remove meta tags
    .replace(/<meta\b[^>]*>/gi, '')
    // Remove empty tags
    .replace(/<([a-z][a-z0-9]*)\b[^>]*>\s*<\/\1>/gi, '')
    // Remove extra whitespace
    .replace(/\s+/g, ' ')
    .trim();
  
  // Truncate to max length
  if (cleaned.length > maxLength) {
    cleaned = cleaned.substring(0, maxLength) + '... [truncated]';
  }
  
  return cleaned;
}
