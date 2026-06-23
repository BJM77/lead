// src/app/api/system-status/route.ts
import { NextResponse } from 'next/server';
import { getFirestore, collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { app } from '@/lib/firebase';
import { healthCheck } from '@/ai/flows/health-check';

export const dynamic = 'force-dynamic';

async function checkFirebase() {
  try {
    const db = getFirestore(app);
    const logsCollection = collection(db, 'logs');
    const q = query(logsCollection, orderBy('timestamp', 'desc'), limit(1));
    await getDocs(q);
    return { status: 'ok', message: 'Successfully connected and queried Firestore.' };
  } catch (error: any) {
    if (error.code === 'permission-denied' || error.message.includes('Missing or insufficient permissions')) {
      return { status: 'ok', message: 'Connected to Firestore (read restricted by security rules).' };
    }
    return { status: 'error', message: `Firestore connection failed: ${error.message}` };
  }
}

async function checkAI() {
  try {
    const response = await healthCheck({ ping: 'hello' });
    if (response.pong === 'hello') {
      return { status: 'ok', message: 'AI text model is responsive.' };
    }
    return { status: 'error', message: 'AI health check failed with unexpected response.' };
  } catch (error: any) {
    return { status: 'error', message: `AI health check failed: ${error.message}` };
  }
}

async function checkOutbound() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5-second timeout
    const response = await fetch('https://example.com', { signal: controller.signal as any });
    clearTimeout(timeoutId);
    if (response.ok) {
      return { status: 'ok', message: 'Server can make outbound requests.' };
    }
    return { status: 'error', message: `Outbound request failed with status: ${response.status}` };
  } catch (error: any) {
    return { status: 'error', message: `Outbound request failed: ${error.message}` };
  }
}


import { checkPuppeteerHealth } from '@/lib/puppeteer-health';

async function checkPuppeteer() {
  return await checkPuppeteerHealth();
}

export async function GET() {
  const [firebaseStatus, aiStatus, outboundStatus, puppeteerStatus] = await Promise.all([
    checkFirebase(),
    checkAI(),
    checkOutbound(),
    checkPuppeteer(),
  ]);

  const overallStatus =
    firebaseStatus.status === 'ok' && 
    aiStatus.status === 'ok' && 
    outboundStatus.status === 'ok' &&
    puppeteerStatus.status === 'ok'
      ? 'ok'
      : 'error';

  return NextResponse.json({
    overallStatus,
    checks: {
      firebase: firebaseStatus,
      ai: aiStatus,
      outbound: outboundStatus,
      puppeteer: puppeteerStatus,
    },
  });
}
