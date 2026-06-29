'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Copy, Trash2 } from 'lucide-react';
import { logger, type LogEntry } from '@/lib/logger';
import { SystemStatus } from '@/components/system-status';

export default function DebugPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    let clientLogs: LogEntry[] = [];
    let intervalId: NodeJS.Timeout;

    const fetchServerLogs = async () => {
      try {
        const response = await fetch('/api/logs');
        if (response.ok) {
          const serverLogs = await response.json();
          // Merge and sort
          const merged = [...clientLogs, ...serverLogs].sort((a, b) => b.timestamp - a.timestamp);
          setLogs(merged);
        }
      } catch (err) {
        console.error('Failed to fetch server logs', err);
      }
    };

    const unsubscribe = logger.listenToLogs((newLogs) => {
      clientLogs = newLogs;
      // Trigger a fetch to immediately merge
      fetchServerLogs();
    });

    intervalId = setInterval(fetchServerLogs, 2000);

    return () => {
      unsubscribe();
      clearInterval(intervalId);
    };
  }, []);

  const handleCopyLogs = () => {
    const logText = logs
      .map(
        (log) =>
          `[${new Date(log.timestamp).toISOString()}] [${log.level.toUpperCase()}] ${log.message}`
      )
      .join('\n');
    navigator.clipboard.writeText(logText);
    toast({
      title: 'Logs Copied',
      description: 'The logs have been copied to your clipboard.',
    });
  };
  
  const handleClearLogs = async () => {
    try {
      await logger.clearLogs();
      await fetch('/api/logs', { method: 'DELETE' });
      setLogs([]); // instantly clear UI
      toast({
        title: 'Logs Cleared',
        description: 'The server logs have been cleared.',
      });
    } catch (error: any) {
       toast({
        title: 'Error Clearing Logs',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-4 md:gap-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Application Debug
            </h1>
            <p className="text-muted-foreground">
              System status and a real-time stream of server-side events.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClearLogs}>
              <Trash2 className="mr-2 h-4 w-4" />
              Clear Logs
            </Button>
            <Button onClick={handleCopyLogs}>
              <Copy className="mr-2 h-4 w-4" />
              Copy Logs
            </Button>
          </div>
        </div>

        <SystemStatus />

        <Card className="flex-1 flex flex-col">
          <CardHeader>
            <CardTitle>Server Logs</CardTitle>
            <CardDescription>Newest logs appear at the top.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 p-0">
            <ScrollArea className="h-[60vh] p-6 pt-0">
              <pre className="text-sm bg-muted/50 p-4 rounded-lg">
                <code
                  dangerouslySetInnerHTML={{
                    __html: logs.length > 0
                      ? logs
                          .map(
                            (log) =>
                              `<span class="${
                                log.level === 'error'
                                  ? 'text-destructive'
                                  : 'text-muted-foreground'
                              }">[${new Date(
                                log.timestamp
                              ).toLocaleTimeString()}]</span> <span class="font-semibold">[${log.level.toUpperCase()}]</span> ${
                                log.message
                              }`
                          )
                          .join('\n\n')
                      : 'No logs yet. Perform an action like "Discover New Leads" to generate logs.'
                  }}
                />
              </pre>
            </ScrollArea>
          </CardContent>
        </Card>
    </div>
  );
}
