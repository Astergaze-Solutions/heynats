import type { ConnectionCredentials } from "../lib/api";

/**
 * Represents a saved NATS connection context
 */
export interface NATSContext extends ConnectionCredentials {
  id: string; // Unique identifier (UUID)
  name: string; // User-friendly name for the context
  description?: string; // Optional description
  createdAt: number; // Timestamp
  updatedAt: number; // Timestamp
  isDefault?: boolean; // Mark as default context
}

/**
 * Response type for context operations
 */
export interface ContextOperationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Represents all saved contexts
 */
export interface NATSContextsStore {
  contexts: NATSContext[];
  defaultContextId?: string;
  version: number; // For schema versioning
}
