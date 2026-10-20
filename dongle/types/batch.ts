/**
 * Types for batch form submission
 */

export interface BatchSubmissionItem<T = unknown> {
  id: string;
  data: T;
}

export interface BatchSubmissionRequest<T = unknown> {
  items: BatchSubmissionItem<T>[];
  mode?: "atomic" | "individual";
}

export interface BatchSubmissionResult {
  id: string;
  success: boolean;
  data?: unknown;
  error?: {
    code: string;
    message: string;
  };
}

export interface BatchSubmissionResponse {
  success: boolean;
  mode: "atomic" | "individual";
  results: BatchSubmissionResult[];
  successCount: number;
  failureCount: number;
  timestamp: string;
}

export interface BatchProgressEvent {
  type: "progress" | "complete" | "error";
  completed: number;
  total: number;
  currentItem?: string;
  error?: string;
}
