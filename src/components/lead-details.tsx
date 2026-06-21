'use client';

import * as React from 'react';
import {
  Loader2,
  Sparkles,
  Mail,
  Phone,
  Calendar,
  Building,
  Briefcase,
  CloudUpload,
  CheckCircle2,
  ShieldCheck,
  Zap,
  MessageSquare,
  TrendingUp,
  Lightbulb,
  Search,
  Code
} from 'lucide-react';
import type { Lead } from '@/types';
import { summarizeLead } from '@/ai/flows/lead-summary';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { useToast } from '@/hooks/use-toast';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';

interface LeadDetailsProps {
  lead: Lead;
}

export function LeadDetails({ lead }: LeadDetailsProps) {
  const [summary, setSummary] = React.useState('');
  const [isLoadingSummary, setIsLoadingSummary] = React.useState(false);
  const { toast } = useToast();

  const handleGenerateSummary = async () => {
    setIsLoadingSummary(true);
    try {
      const result = await summarizeLead({ leadDetails: lead.details });
      setSummary(result.summary);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Summary Failed', description: 'Could not generate briefing.' });
    } finally {
      setIsLoadingSummary(false);
    }
  };

  return (
    <div className="grid gap-6 py-6">
      {/* Top Level Intelligence Metrics */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="p-4 pb-1">
            <CardTitle className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Zap className="h-3 w-3 text-primary" /> Extraction Confidence
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">{lead.confidenceScore || 'N/A'}%</div>
          </CardContent>
        </Card>
        <Card className="bg-green-500/5 border-green-500/20">
          <CardHeader className="p-4 pb-1">
            <CardTitle className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <ShieldCheck className="h-3 w-3 text-green-500" /> Compliance
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 flex gap-1 flex-wrap">
            {lead.compliance?.gdprCompliant ? <Badge variant="outline" className="text-[10px] border-green-200 text-green-600 bg-green-50">GDPR</Badge> : <Badge variant="outline" className="text-[10px]">GDPR?</Badge>}
            {lead.compliance?.ccpaCompliant && <Badge variant="outline" className="text-[10px] border-green-200 text-green-600 bg-green-50">CCPA</Badge>}
          </CardContent>
        </Card>
      </div>

      {/* Extraction Evidence */}
      {lead.intentEvidence && Object.keys(lead.intentEvidence).length > 0 && (
        <Card className="border-primary/20 bg-muted/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs flex items-center gap-2">
              <Search className="h-3 w-3 text-primary" /> Extraction Evidence
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {Object.entries(lead.intentEvidence).map(([field, reason]) => (
              <div key={field} className="flex justify-between text-[11px]">
                <span className="font-semibold capitalize text-muted-foreground">{field}:</span>
                <span className="italic">{reason}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Intelligence Insights */}
      {lead.intelligenceInsights && lead.intelligenceInsights.length > 0 && (
        <Card className="border-accent/30 bg-accent/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs flex items-center gap-2">
              <Lightbulb className="h-3 w-3 text-accent" /> Strategic Signals
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {lead.intelligenceInsights.map((insight, i) => (
              <div key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                <TrendingUp className="h-3 w-3 mt-0.5 shrink-0 text-accent" />
                <span>{insight}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Technical Stack */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs flex items-center gap-2">
            <Code className="h-3 w-3 text-primary" /> Detected Technical Stack
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-1">
           {lead.company.techStack?.length ? lead.company.techStack.map(tech => (
             <Badge key={tech} variant="secondary" className="text-[10px]">{tech}</Badge>
           )) : <span className="text-xs text-muted-foreground">No fingerprints detected.</span>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AI-Powered Summary</CardTitle>
        </CardHeader>
        <CardContent>
          {summary ? (
            <p className="text-sm text-muted-foreground leading-relaxed italic">"{summary}"</p>
          ) : (
            <Button onClick={handleGenerateSummary} disabled={isLoadingSummary} className="w-full">
                {isLoadingSummary ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Generate Briefing
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Building className="h-5 w-5 text-primary" /> Firmographics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Market Industry</span>
            <span className="font-medium">{lead.company.industry || 'N/A'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Headcount</span>
            <span className="font-medium">{lead.company.employeeCount?.toLocaleString() || 'N/A'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Est. Annual Revenue</span>
            <span className="font-medium text-green-600">{lead.company.revenue ? `$${(lead.company.revenue / 1000000).toFixed(1)}M` : 'N/A'}</span>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Briefcase className="h-5 w-5 text-primary" /> Lead Persona
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Professional Title</span>
            <span className="font-medium">{lead.title || 'N/A'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Lead Source</span>
            <Badge variant="outline">{lead.source}</Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Pipeline Status</span>
            <Badge>{lead.status}</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
