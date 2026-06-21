'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AnalyticsCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  description?: string;
  onClick?: () => void;
  isActive?: boolean;
}

export function AnalyticsCard({
  title,
  value,
  icon: Icon,
  description,
  onClick,
  isActive = false,
}: AnalyticsCardProps) {

  const cardClasses = cn(
    "transition-all w-full text-left",
    isActive && "ring-2 ring-primary bg-primary/10"
  );
  
  const cardContent = (
    <Card className={cardClasses}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  );

  if (onClick) {
    return (
      <button onClick={onClick} className="w-full h-full hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 rounded-lg">
          {cardContent}
      </button>
    )
  }

  return <div>{cardContent}</div>;
}
