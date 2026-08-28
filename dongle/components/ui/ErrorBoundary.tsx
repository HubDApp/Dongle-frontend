"use client";

import React from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { logger } from "@/lib/logger";

type ErrorBoundaryProps = {
  children: React.ReactNode;
  operation: string;
  userAction: string;
  onReset?: () => void;
  fallback?: (retry: () => void, error: Error) => React.ReactNode;
};

type ErrorBoundaryState = { error: Error | null };

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    logger.error("Component error captured", {
      operation: this.props.operation,
      userAction: this.props.userAction,
      componentStack: info.componentStack,
    }, error);
  }

  private retry = (): void => {
    this.props.onReset?.();
    this.setState({ error: null });
  };

  render(): React.ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;
    if (this.props.fallback) return this.props.fallback(this.retry, error);

    return (
      <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-900 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-100">
        <AlertTriangle className="mb-3 h-6 w-6" aria-hidden="true" />
        <h2 className="font-semibold">This action could not be completed</h2>
        <p className="mt-1 text-sm opacity-80">Something went wrong while {this.props.userAction.toLowerCase()}.</p>
        <Button className="mt-4" variant="secondary" onClick={this.retry} leftIcon={<RotateCcw className="h-4 w-4" />}>
          Try again
        </Button>
      </div>
    );
  }
}
