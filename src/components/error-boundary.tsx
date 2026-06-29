'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <Alert variant="destructive" className="m-4">
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription className="flex flex-col gap-4">
            <p>We're sorry, but there was an error loading this component.</p>
            <Button 
              onClick={() => this.setState({ hasError: false })}
              variant="outline"
              className="w-fit"
            >
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      );
    }

    return this.props.children;
  }
}
