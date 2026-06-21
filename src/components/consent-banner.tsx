'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ShieldCheck } from 'lucide-react';

export function ConsentBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('leadAceConsent');
    if (!consent) setIsVisible(true);
  }, []);

  const handleAccept = () => {
    localStorage.setItem('leadAceConsent', 'true');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <Card className="shadow-2xl border-primary/20 bg-background/95 backdrop-blur-md">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-6 w-6 text-primary shrink-0" />
            <div className="text-sm font-bold">Tactical Privacy Notice</div>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Lead Ace extracts publicly available data in compliance with GDPR and CCPA standards. 
            By proceeding, you agree to our processing of professional intelligence.
          </p>
          <Button size="sm" className="w-full" onClick={handleAccept}>Accept Intelligence Policy</Button>
        </CardContent>
      </Card>
    </div>
  );
}
