/**
 * Event types for form interactions
 */
export type FormEventType = 
  | 'FORM_INIT' 
  | 'FIELD_FOCUS' 
  | 'FIELD_BLUR' 
  | 'FIELD_CHANGE' 
  | 'FORM_VALIDATION_ERROR' 
  | 'FORM_SUBMIT_START' 
  | 'FORM_SUBMIT_SUCCESS' 
  | 'FORM_SUBMIT_ERROR';

/**
 * Filter configuration for streaming form events
 */
export interface EventFilter {
  types?: FormEventType[];
  projectId?: string;
  walletAddress?: string;
  sessionId?: string;
  startTime?: number;
  endTime?: number;
}

/**
 * Core event payload structure
 */
export interface FormEventPayload {
  eventId: string;
  type: FormEventType;
  timestamp: number;
  sessionId: string;
  walletAddress?: string;
  projectId?: string;
  data: Record<string, unknown>;
}
