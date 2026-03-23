import type { NATSContext, NATSContextsStore, ContextOperationResult } from "./types";

const DB_NAME = "HeyNATS";
const DB_VERSION = 1;
const STORE_NAME = "nats-contexts";
const FALLBACK_KEY = "nats-contexts-store";

/**
 * Service for managing NATS contexts with IndexDB and localStorage fallback
 */
export class NATSContextStorage {
  private db: IDBDatabase | null = null;
  private useIndexDB: boolean = false;
  private initPromise: Promise<void>;

  constructor() {
    this.initPromise = this.initialize();
  }

  /**
   * Initialize IndexDB or fall back to localStorage
   */
  private async initialize(): Promise<void> {
    try {
      if (!("indexedDB" in window)) {
        console.warn("IndexDB not available, using localStorage");
        this.useIndexDB = false;
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      await new Promise<void>((resolve) => {
        request.onerror = () => {
          console.warn("IndexDB initialization failed, falling back to localStorage");
          this.useIndexDB = false;
          resolve();
        };

        request.onsuccess = (event) => {
          this.db = (event.target as IDBOpenDBRequest).result;
          this.useIndexDB = true;
          resolve();
        };

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { keyPath: "id" });
          }
        };
      });
    } catch (error) {
      console.warn("IndexDB not available, using localStorage fallback", error);
      this.useIndexDB = false;
    }
  }

  /**
   * Ensure initialization is complete before operations
   */
  private async ensureInitialized(): Promise<void> {
    await this.initPromise;
  }

  /**
   * Get all contexts
   */
  async getAllContexts(): Promise<ContextOperationResult<NATSContext[]>> {
    await this.ensureInitialized();

    try {
      if (this.useIndexDB && this.db) {
        return await this.getFromIndexDB();
      } else {
        return this.getFromLocalStorage();
      }
    } catch (error) {
      console.error("Error getting contexts:", error);
      return { success: false, error: "Failed to retrieve contexts" };
    }
  }

  /**
   * Get a specific context by ID
   */
  async getContext(id: string): Promise<ContextOperationResult<NATSContext>> {
    await this.ensureInitialized();

    try {
      const result = await this.getAllContexts();
      if (!result.success || !result.data) {
        return { success: false, error: "Failed to retrieve contexts" };
      }

      const context = result.data.find((ctx) => ctx.id === id);
      if (!context) {
        return { success: false, error: "Context not found" };
      }

      return { success: true, data: context };
    } catch (error) {
      console.error("Error getting context:", error);
      return { success: false, error: "Failed to retrieve context" };
    }
  }

  /**
   * Save a new context
   */
  async saveContext(context: NATSContext): Promise<ContextOperationResult<NATSContext>> {
    await this.ensureInitialized();

    try {
      if (this.useIndexDB && this.db) {
        return await this.saveToIndexDB(context);
      } else {
        return this.saveToLocalStorage(context);
      }
    } catch (error) {
      console.error("Error saving context:", error);
      return { success: false, error: "Failed to save context" };
    }
  }

  /**
   * Update an existing context
   */
  async updateContext(
    id: string,
    updates: Partial<NATSContext>,
  ): Promise<ContextOperationResult<NATSContext>> {
    await this.ensureInitialized();

    try {
      const getResult = await this.getContext(id);
      if (!getResult.success || !getResult.data) {
        return { success: false, error: "Context not found" };
      }

      const updatedContext: NATSContext = {
        ...getResult.data,
        ...updates,
        id: getResult.data.id, // Ensure ID doesn't change
        createdAt: getResult.data.createdAt, // Preserve creation time
        updatedAt: Date.now(),
      };

      return await this.saveContext(updatedContext);
    } catch (error) {
      console.error("Error updating context:", error);
      return { success: false, error: "Failed to update context" };
    }
  }

  /**
   * Delete a context
   */
  async deleteContext(id: string): Promise<ContextOperationResult<void>> {
    await this.ensureInitialized();

    try {
      if (this.useIndexDB && this.db) {
        return await this.deleteFromIndexDB(id);
      } else {
        return this.deleteFromLocalStorage(id);
      }
    } catch (error) {
      console.error("Error deleting context:", error);
      return { success: false, error: "Failed to delete context" };
    }
  }

  /**
   * Set default context
   */
  async setDefaultContext(id: string): Promise<ContextOperationResult<void>> {
    await this.ensureInitialized();

    try {
      const getResult = await this.getContext(id);
      if (!getResult.success) {
        return { success: false, error: "Context not found" };
      }

      const allResult = await this.getAllContexts();
      if (!allResult.success || !allResult.data) {
        return { success: false, error: "Failed to retrieve contexts" };
      }

      if (this.useIndexDB && this.db) {
        return await this.setDefaultInIndexDB(id);
      } else {
        return this.setDefaultInLocalStorage(id);
      }
    } catch (error) {
      console.error("Error setting default context:", error);
      return { success: false, error: "Failed to set default context" };
    }
  }

  /**
   * Get default context
   */
  async getDefaultContext(): Promise<ContextOperationResult<NATSContext | null>> {
    await this.ensureInitialized();

    try {
      const allResult = await this.getAllContexts();
      if (!allResult.success || !allResult.data) {
        return { success: true, data: null };
      }

      const defaultContext = allResult.data.find((ctx) => ctx.isDefault);
      if (!defaultContext && allResult.data.length > 0) {
        // If no default set, return the first one
        return { success: true, data: allResult.data[0] };
      }

      return { success: true, data: defaultContext || null };
    } catch (error) {
      console.error("Error getting default context:", error);
      return { success: false, error: "Failed to retrieve default context" };
    }
  }

  /**
   * Clear all contexts
   */
  async clearAllContexts(): Promise<ContextOperationResult<void>> {
    await this.ensureInitialized();

    try {
      if (this.useIndexDB && this.db) {
        return await this.clearIndexDB();
      } else {
        localStorage.removeItem(FALLBACK_KEY);
        return { success: true };
      }
    } catch (error) {
      console.error("Error clearing contexts:", error);
      return { success: false, error: "Failed to clear contexts" };
    }
  }

  // ==================== Private Methods ====================

  /**
   * Get contexts from IndexDB
   */
  private getFromIndexDB(): Promise<ContextOperationResult<NATSContext[]>> {
    return new Promise((resolve) => {
      if (!this.db) {
        resolve({ success: false, error: "Database not initialized" });
        return;
      }

      try {
        const transaction = this.db.transaction([STORE_NAME], "readonly");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => {
          resolve({ success: true, data: request.result });
        };

        request.onerror = () => {
          resolve({ success: false, error: "Failed to retrieve from IndexDB" });
        };
      } catch (error) {
        resolve({ success: false, error: "Failed to access IndexDB" });
      }
    });
  }

  /**
   * Save to IndexDB
   */
  private saveToIndexDB(context: NATSContext): Promise<ContextOperationResult<NATSContext>> {
    return new Promise((resolve) => {
      if (!this.db) {
        resolve({ success: false, error: "Database not initialized" });
        return;
      }

      try {
        const transaction = this.db.transaction([STORE_NAME], "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(context);

        request.onsuccess = () => {
          resolve({ success: true, data: context });
        };

        request.onerror = () => {
          resolve({ success: false, error: "Failed to save to IndexDB" });
        };
      } catch (error) {
        resolve({ success: false, error: "Failed to access IndexDB" });
      }
    });
  }

  /**
   * Delete from IndexDB
   */
  private deleteFromIndexDB(id: string): Promise<ContextOperationResult<void>> {
    return new Promise((resolve) => {
      if (!this.db) {
        resolve({ success: false, error: "Database not initialized" });
        return;
      }

      try {
        const transaction = this.db.transaction([STORE_NAME], "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);

        request.onsuccess = () => {
          resolve({ success: true });
        };

        request.onerror = () => {
          resolve({ success: false, error: "Failed to delete from IndexDB" });
        };
      } catch (error) {
        resolve({ success: false, error: "Failed to access IndexDB" });
      }
    });
  }

  /**
   * Clear IndexDB
   */
  private clearIndexDB(): Promise<ContextOperationResult<void>> {
    return new Promise((resolve) => {
      if (!this.db) {
        resolve({ success: false, error: "Database not initialized" });
        return;
      }

      try {
        const transaction = this.db.transaction([STORE_NAME], "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.clear();

        request.onsuccess = () => {
          resolve({ success: true });
        };

        request.onerror = () => {
          resolve({ success: false, error: "Failed to clear IndexDB" });
        };
      } catch (error) {
        resolve({ success: false, error: "Failed to access IndexDB" });
      }
    });
  }

  /**
   * Get localStorage store
   */
  private getLocalStorageStore(): NATSContextsStore {
    const stored = localStorage.getItem(FALLBACK_KEY);
    if (!stored) {
      return { contexts: [], version: 1 };
    }

    try {
      return JSON.parse(stored);
    } catch (error) {
      console.error("Failed to parse localStorage:", error);
      return { contexts: [], version: 1 };
    }
  }

  /**
   * Get contexts from localStorage
   */
  private getFromLocalStorage(): ContextOperationResult<NATSContext[]> {
    try {
      const store = this.getLocalStorageStore();
      return { success: true, data: store.contexts || [] };
    } catch (error) {
      console.error("Error getting from localStorage:", error);
      return { success: false, error: "Failed to retrieve from localStorage" };
    }
  }

  /**
   * Save to localStorage
   */
  private saveToLocalStorage(context: NATSContext): ContextOperationResult<NATSContext> {
    try {
      const store = this.getLocalStorageStore();
      const index = store.contexts.findIndex((ctx) => ctx.id === context.id);

      if (index !== -1) {
        store.contexts[index] = context;
      } else {
        store.contexts.push(context);
      }

      localStorage.setItem(FALLBACK_KEY, JSON.stringify(store));
      return { success: true, data: context };
    } catch (error) {
      console.error("Error saving to localStorage:", error);
      return { success: false, error: "Failed to save to localStorage" };
    }
  }

  /**
   * Delete from localStorage
   */
  private deleteFromLocalStorage(id: string): ContextOperationResult<void> {
    try {
      const store = this.getLocalStorageStore();
      store.contexts = store.contexts.filter((ctx) => ctx.id !== id);

      if (store.defaultContextId === id) {
        store.defaultContextId = undefined;
      }

      localStorage.setItem(FALLBACK_KEY, JSON.stringify(store));
      return { success: true };
    } catch (error) {
      console.error("Error deleting from localStorage:", error);
      return { success: false, error: "Failed to delete from localStorage" };
    }
  }

  /**
   * Set default in IndexDB
   */
  private setDefaultInIndexDB(id: string): Promise<ContextOperationResult<void>> {
    return new Promise((resolve) => {
      if (!this.db) {
        resolve({ success: false, error: "Database not initialized" });
        return;
      }

      try {
        const transaction = this.db.transaction([STORE_NAME], "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const getAllRequest = store.getAll();

        getAllRequest.onsuccess = () => {
          const allContexts = getAllRequest.result as NATSContext[];

          // Clear all defaults and set new one
          for (const ctx of allContexts) {
            ctx.isDefault = ctx.id === id;
            store.put(ctx);
          }

          transaction.oncomplete = () => {
            resolve({ success: true });
          };

          transaction.onerror = () => {
            resolve({ success: false, error: "Failed to set default in IndexDB" });
          };
        };

        getAllRequest.onerror = () => {
          resolve({ success: false, error: "Failed to retrieve contexts from IndexDB" });
        };
      } catch (error) {
        resolve({ success: false, error: "Failed to access IndexDB" });
      }
    });
  }

  /**
   * Set default in localStorage
   */
  private setDefaultInLocalStorage(id: string): ContextOperationResult<void> {
    try {
      const store = this.getLocalStorageStore();
      for (const ctx of store.contexts) {
        ctx.isDefault = ctx.id === id;
      }
      store.defaultContextId = id;
      localStorage.setItem(FALLBACK_KEY, JSON.stringify(store));
      return { success: true };
    } catch (error) {
      console.error("Error setting default in localStorage:", error);
      return { success: false, error: "Failed to set default in localStorage" };
    }
  }
}

// Export singleton instance
export const contextStorage = new NATSContextStorage();
