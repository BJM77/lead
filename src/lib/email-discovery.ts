export function generateEmailPermutations(name: string, domain: string): string[] {
  if (!name || !domain) return [];

  // Remove website prefixes
  let cleanDomain = domain.toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0]; // get only the host

  const nameParts = name.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(/\s+/);
  if (nameParts.length < 1) return [];

  const first = nameParts[0];
  const last = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';

  const emails = new Set<string>();

  if (first && last) {
    const f = first[0];
    const l = last[0];
    emails.add(`${first}.${last}@${cleanDomain}`);
    emails.add(`${f}${last}@${cleanDomain}`);
    emails.add(`${first}${l}@${cleanDomain}`);
    emails.add(`${first}_${last}@${cleanDomain}`);
    emails.add(`${first}${last}@${cleanDomain}`);
    emails.add(`${last}${first}@${cleanDomain}`);
    emails.add(`${last}.${first}@${cleanDomain}`);
    emails.add(`${first}@${cleanDomain}`);
  } else if (first) {
    emails.add(`${first}@${cleanDomain}`);
  }

  // Also add some role-based as fallback attempts if requested later, but for individuals we keep it strict
  return Array.from(emails);
}
