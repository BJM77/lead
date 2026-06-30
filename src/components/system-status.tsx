'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from './ui/button';
import { Loader2, RefreshCw, Server, BrainCircuit, Wifi } from 'lucide-react';
import { Badge } from './ui/badge';

type Status = 'loading' | 'ok' | 'error';
type CheckResult = {
  status: 'ok' | 'error';
  message: string;
};

type SystemStatusState = {
  firebase: CheckResult;
  ai: CheckResult;
  outbound: CheckResult;
};

const StatusIndicator = ({ status }: { status: Status }) => {
  if (status === 'loading') {
    return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
  }
  if (status === 'ok') {
    return <div className="h-3 w-3 rounded-full bg-green-500" />;
  }
  return <div className="h-3 w-3 rounded-full bg-red-500" />;
};

const StatusItem = ({ name, icon: Icon, status, message }: { name: string; icon: React.ElementType, status: Status, message: string }) => (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 w-full">
        <div className="flex items-center justify-center w-5 h-5 shrink-0">
            <StatusIndicator status={status} />
        </div>
        <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 flex-1 min-w-0">
            <span className="font-medium shrink-0">{name}</span>
            <p className="text-sm text-muted-foreground truncate" title={message}>{message}</p>
        </div>
    </div>
);


export function SystemStatus() {
  const [status, setStatus] = useState<SystemStatusState | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const runChecks = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/system-status');
      const data = await response.json();
      setStatus(data.checks);
    } catch (error) {
      // Handle fetch error for the status check itself
      const errorMessage = 'Failed to fetch system status.';
      setStatus({
          firebase: { status: 'error', message: errorMessage },
          ai: { status: 'error', message: errorMessage },
          outbound: { status: 'error', message: errorMessage },
      })
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    runChecks();
  }, []);
  
  const overallStatus: Status = isLoading ? 'loading' : (status && Object.values(status).every(s => s.status === 'ok') ? 'ok' : 'error');

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="space-y-1">
            <CardTitle>System Status</CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                { overallStatus === 'ok' && <><Badge variant="default" className="bg-green-500 hover:bg-green-500">All systems operational</Badge></> }
                { overallStatus === 'error' && <><Badge variant="destructive">One or more systems are down</Badge></> }
                { overallStatus === 'loading' && <p>Running checks...</p> }
            </div>
        </div>
        <Button variant="outline" size="sm" onClick={runChecks} disabled={isLoading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Re-run Checks
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        <StatusItem 
            name="Firebase"
            icon={Server}
            status={isLoading ? 'loading' : status?.firebase.status ?? 'error'}
            message={isLoading ? 'Checking...' : status?.firebase.message ?? 'Error loading status.'}
        />
        <StatusItem 
            name="AI Services"
            icon={BrainCircuit}
            status={isLoading ? 'loading' : status?.ai.status ?? 'error'}
            message={isLoading ? 'Checking...' : status?.ai.message ?? 'Error loading status.'}
        />
        <StatusItem 
            name="Outbound Connection"
            icon={Wifi}
            status={isLoading ? 'loading' : status?.outbound.status ?? 'error'}
            message={isLoading ? 'Checking...' : status?.outbound.message ?? 'Error loading status.'}
        />
      </CardContent>
    </Card>
  );
}
