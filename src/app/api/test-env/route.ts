import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    serperApiKeyLength: process.env.SERPER_API_KEY ? process.env.SERPER_API_KEY.length : 0,
    serperApiKeyDynamicLength: process.env['SERPER_API_KEY'] ? process.env['SERPER_API_KEY'].length : 0,
    nodeEnv: process.env.NODE_ENV,
    keys: Object.keys(process.env).filter(k => k.includes('SERPER') || k.includes('API'))
  });
}
