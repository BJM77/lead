import { NextResponse } from 'next/server';
import { discoverUrls } from '@/ai/flows/discover-urls';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const query = url.searchParams.get('q') || '(inurl:shipping OR inurl:"shipping-policy" OR intitle:"shipping information" OR intitle:"delivery information")';
    const result = await discoverUrls({ query, limit: 10, excludeUrls: [] });
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
}
