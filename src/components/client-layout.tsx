'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { AppLayout } from '@/components/app-layout';
import { Loader2 } from 'lucide-react';

/**
 * Intelligence Orchestrator
 * Master gatekeeper for all authenticated sessions and routing.
 */
export function ClientLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    console.log('[Orchestrator] Initializing session listener...');
    
    // Primary Firebase Observer
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      console.log(`[Orchestrator] Session Status Update: ${currentUser ? 'AUTHENTICATED (' + currentUser.email + ')' : 'ANONYMOUS'}`);
      setUser(currentUser);
      setIsInitializing(false);
    });

    return () => unsubscribe();
  }, []);

  const isAuthPage = pathname === '/login' || pathname === '/signup';

  useEffect(() => {
    if (isInitializing) return;

    // Tactical Routing Logic
    // If logged in and on a public page, move to dashboard
    if (user && isAuthPage) {
      console.log('[Orchestrator] Active session detected on public page. Transitioning to Dashboard.');
      router.replace('/dashboard');
    } 
    // If not logged in and on a protected page, force login
    else if (!user && !isAuthPage) {
      console.log('[Orchestrator] Anonymous access denied. Forcing Login sequence.');
      router.replace('/login');
    }
  }, [user, isInitializing, isAuthPage, router]);

  // Prevent UI flickering during auth resolution
  if (isInitializing) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-center">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-pulse" />
          <Loader2 className="relative h-12 w-12 animate-spin text-primary" />
        </div>
        <div className="mt-8 space-y-2">
            <h2 className="text-lg font-bold tracking-tight">Intelligence Gateway</h2>
            <p className="text-sm text-muted-foreground">Synchronizing tactical session data...</p>
        </div>
      </div>
    );
  }

  // Handle transition state: If user state changed but redirect hasn't completed yet
  // We show a loader to avoid showing dashboard to logged-out users (or login to logged-in users)
  if (user && isAuthPage) return <div className="min-h-screen bg-background" />;
  if (!user && !isAuthPage) return <div className="min-h-screen bg-background" />;

  // Render the secure Shell if authenticated
  if (user && !isAuthPage) {
    return <AppLayout>{children}</AppLayout>;
  }

  // Render the unauthenticated page (Login/Signup)
  return <div className="min-h-screen bg-background">{children}</div>;
}
