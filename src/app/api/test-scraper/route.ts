import { NextResponse } from 'next/server';
import { performWebSearch } from '@/lib/scraper';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const query = url.searchParams.get('q') || 'test search';
    const results = await performWebSearch(query, 5);
    
    return NextResponse.json({
      success: true,
      resultCount: results.length,
      results: results.slice(0, 3),
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}
