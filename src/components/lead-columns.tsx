'use client';

import type { ColumnDef } from '@tanstack/react-table';
import {
  ArrowUpDown,
  MoreHorizontal,
  FileText,
  Trash2,
  AlertCircle
} from 'lucide-react';
import React from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import type { Lead } from '@/types';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { LeadDetails } from '@/components/lead-details';
import { deleteLead } from '@/lib/db';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { calculateCompleteness } from '@/lib/completeness';

type ColumnsProps = {
  onLeadDeleted: (leadId: string) => void;
};

const QualityBadge = ({ lead }: { lead: Lead }) => {
  const quality = lead.quality;
  let variant: 'default' | 'secondary' | 'destructive' = 'secondary';
  let text = 'Low Fit';
  if (quality > 85) {
    variant = 'default';
    text = 'Strategic Fit';
  } else if (quality > 60) {
    variant = 'secondary';
    text = 'Medium Fit';
  }

  return (
    <div className="flex items-center gap-2">
      <Badge variant={variant} className="capitalize whitespace-nowrap">
        {text} ({quality})
      </Badge>
      {lead.intelligenceInsights && lead.intelligenceInsights.length > 0 && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <AlertCircle className="h-4 w-4 text-accent animate-pulse cursor-help" />
            </TooltipTrigger>
            <TooltipContent>
              <div className="space-y-1">
                <p className="font-bold text-xs">AI Growth Signals:</p>
                {lead.intelligenceInsights.map((insight, i) => (
                  <p key={i} className="text-[10px]">• {insight}</p>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
};

export const columns = ({ onLeadDeleted }: ColumnsProps): ColumnDef<Lead>[] => [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && 'indeterminate')
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'name',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Company & Lead
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const lead = row.original;
      return (
        <div className="font-medium">
          <div className="text-sm font-bold text-primary">{lead.company.name}</div>
          <div className="text-xs text-muted-foreground">{lead.name}</div>
        </div>
      );
    },
  },
  {
    accessorKey: 'status',
    header: 'Pipeline',
    cell: ({ row }) => {
      const status = row.getValue('status') as string;
      return (
        <Badge variant="outline" className="capitalize text-[10px]">
          {status}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'quality',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Intelligence Score
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => <QualityBadge lead={row.original} />,
  },
  {
    id: 'completeness',
    header: 'Completeness',
    cell: ({ row }) => {
      const completeness = calculateCompleteness(row.original);
      let badgeVariant: 'default' | 'secondary' | 'destructive' = 'secondary';
      if (completeness.score === 100) badgeVariant = 'default';
      else if (completeness.score < 60) badgeVariant = 'destructive';
      
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant={badgeVariant} className="cursor-help">
                {completeness.score}%
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              {completeness.hasRequiredFields ? (
                <p>All required fields present.</p>
              ) : (
                <p>Missing: {completeness.missing.join(', ')}</p>
              )}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
  },
  {
    accessorKey: 'createdAt',
    header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Discovered
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const timestamp = row.getValue('createdAt') as number;
        if (!timestamp) return 'N/A';
        const date = new Date(timestamp);
        return <div className="text-xs text-muted-foreground">{date.toLocaleDateString()}</div>
      }
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const lead = row.original;
      const { toast } = useToast();

      const handleDelete = async () => {
        try {
          await deleteLead(lead.id);
          onLeadDeleted(lead.id);
          toast({
            title: 'Lead Removed',
            description: `${lead.name} purged from dashboard.`,
          });
        } catch (error) {
          toast({ variant: 'destructive', title: 'Error', description: 'Could not delete lead.' });
        }
      };

      return (
        <Sheet>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Intelligence Actions</DropdownMenuLabel>
              <SheetTrigger asChild>
                <DropdownMenuItem>
                  <FileText className="mr-2 h-4 w-4" />
                  View Lead Intelligence
                </DropdownMenuItem>
              </SheetTrigger>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={handleDelete}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Lead
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="text-primary">
                {lead.company.name} Intelligence
              </SheetTitle>
              <SheetDescription>
                Full extraction history, growth signals, and compliance metadata.
              </SheetDescription>
            </SheetHeader>
            <LeadDetails lead={lead} />
          </SheetContent>
        </Sheet>
      );
    },
  },
];
