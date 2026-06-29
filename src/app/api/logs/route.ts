import { NextResponse } from 'next/server';
import { getServerLogs, clearServerLogs } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(getServerLogs());
}

export async function DELETE() {
  clearServerLogs();
  return NextResponse.json({ success: true });
}
