import { useState, useEffect, useCallback } from "react";
import { contextStorage } from "../services/contextStorage";
import type { NATSContext, ContextOperationResult } from "../services/types";

interface UseNATSContextsReturn {
  contexts: NATSContext[];
  isLoading: boolean;
  error: string | null;
  addContext: (context: NATSContext) => Promise<ContextOperationResult<NATSContext>>;
  updateContext: (
    id: string,
    updates: Partial<NATSContext>,
  ) => Promise<ContextOperationResult<NATSContext>>;
  deleteContext: (id: string) => Promise<ContextOperationResult<void>>;
  setDefaultContext: (id: string) => Promise<ContextOperationResult<void>>;
  getDefaultContext: () => Promise<ContextOperationResult<NATSContext | null>>;
  refreshContexts: () => Promise<void>;
}

/**
 * Hook for managing NATS contexts
 * Provides CRUD operations and persistence
 */
export function useNATSContexts(): UseNATSContextsReturn {
  const [contexts, setContexts] = useState<NATSContext[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadContexts = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await contextStorage.getAllContexts();

      if (result.success && result.data) {
        setContexts(result.data);
      } else {
        setError(result.error || "Failed to load contexts");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load contexts on mount
  useEffect(() => {
    loadContexts();
  }, [loadContexts]);

  const addContext = useCallback(
    async (context: NATSContext) => {
      try {
        setError(null);
        const result = await contextStorage.saveContext(context);

        if (result.success) {
          await loadContexts();
        } else {
          setError(result.error || "Failed to add context");
        }

        return result;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error occurred";
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }
    },
    [loadContexts],
  );

  const updateContext = useCallback(
    async (id: string, updates: Partial<NATSContext>) => {
      try {
        setError(null);
        const result = await contextStorage.updateContext(id, updates);

        if (result.success) {
          await loadContexts();
        } else {
          setError(result.error || "Failed to update context");
        }

        return result;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error occurred";
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }
    },
    [loadContexts],
  );

  const deleteContext = useCallback(
    async (id: string) => {
      try {
        setError(null);
        const result = await contextStorage.deleteContext(id);

        if (result.success) {
          await loadContexts();
        } else {
          setError(result.error || "Failed to delete context");
        }

        return result;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error occurred";
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }
    },
    [loadContexts],
  );

  const setDefaultContext = useCallback(
    async (id: string) => {
      try {
        setError(null);
        const result = await contextStorage.setDefaultContext(id);

        if (result.success) {
          await loadContexts();
        } else {
          setError(result.error || "Failed to set default context");
        }

        return result;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error occurred";
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }
    },
    [loadContexts],
  );

  const getDefaultContext = useCallback(async () => {
    try {
      setError(null);
      const result = await contextStorage.getDefaultContext();

      if (!result.success) {
        setError(result.error || "Failed to get default context");
      }

      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error occurred";
      setError(errorMsg);
      return { success: false, error: errorMsg, data: null };
    }
  }, []);

  const refreshContexts = useCallback(async () => {
    await loadContexts();
  }, [loadContexts]);

  return {
    contexts,
    isLoading,
    error,
    addContext,
    updateContext,
    deleteContext,
    setDefaultContext,
    getDefaultContext,
    refreshContexts,
  };
}
