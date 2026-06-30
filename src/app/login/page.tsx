'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ShieldCheck, Info } from 'lucide-react';
import React from 'react';
import { Logo } from '@/components/logo';

/**
 * Tactical Login Page
 * Removed all mock logic. This page now connects DIRECTLY to Firebase Auth.
 */
export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({ title: 'Input Required', description: 'Please enter both email and password.', variant: 'destructive' });
      return;
    }
    
    setIsLoading(true);
    console.log(`[Auth] Initiating tactical handshake for: ${email}`);

    try {
      // REAL FIREBASE AUTH CALL
      // This will fail immediately if the user doesn't match Firebase Authentication
      if (!auth) throw new Error('Authentication is currently unavailable.');
      await signInWithEmailAndPassword(auth, email, password);
      
      console.log('[Auth] Tactical handshake successful.');
      toast({ title: 'Authorized', description: 'Identity verified. Redirecting to intelligence dashboard...' });
      
      // The ClientLayout orchestrator will detect the new 'auth.currentUser' 
      // and handle the redirect automatically. No manual router.push needed here
      // to avoid race conditions.
      
    } catch (error: any) {
      console.error('[Auth] Login error:', error.code, error.message);
      let message = 'Invalid email or password.';
      
      // Map Firebase errors to helpful user messages
      if (error.code === 'auth/user-not-found') message = 'No operator found with this email.';
      if (error.code === 'auth/wrong-password') message = 'Incorrect password provided.';
      if (error.code === 'auth/invalid-credential') message = 'The credentials provided are invalid.';
      
      toast({ 
        title: 'Access Denied', 
        description: message, 
        variant: 'destructive' 
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm shadow-xl border-primary/10">
        <CardHeader className="text-center">
            <div className="mx-auto mb-4">
               <Logo />
            </div>
          <CardTitle className="text-2xl font-bold text-primary">Secure Access</CardTitle>
          <CardDescription>Verify your operator identity to proceed.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignIn} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Operator Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="1@1.com"
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
                disabled={isLoading}
                className="bg-muted/50"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Security Key</Label>
              <Input 
                id="password" 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
                disabled={isLoading}
                className="bg-muted/50"
              />
            </div>
            <Button type="submit" className="w-full mt-2" disabled={isLoading}>
              {isLoading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <ShieldCheck className="mr-2 h-4 w-4" />} 
              Establish Session
            </Button>
          </form>
        </CardContent>
        <CardFooter className="border-t bg-muted/30 p-4 rounded-b-lg">
          <div className="flex items-start gap-2 text-xs text-muted-foreground leading-relaxed">
            <Info className="h-4 w-4 text-primary shrink-0" />
            <p>Verification is required for target extraction. All session activity is logged for compliance.</p>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
