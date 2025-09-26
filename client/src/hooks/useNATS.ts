import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { natsApi, type ConnectionCredentials } from '../lib/api';

// Query keys
export const queryKeys = {
  nats: {
    all: ['nats'] as const,
    status: () => [...queryKeys.nats.all, 'status'] as const,
    info: () => [...queryKeys.nats.all, 'info'] as const,
    account: () => [...queryKeys.nats.all, 'account'] as const,
  },
};

// Connection status query
export function useConnectionStatus() {
  return useQuery({
    queryKey: queryKeys.nats.status(),
    queryFn: natsApi.getStatus,
    staleTime: 1000, // Consider data stale after 1 second
    refetchInterval: 5000, // Refetch every 5 seconds
    retry: false, // Don't retry on connection errors
  });
}

// NATS server info query (only when connected)
export function useNATSInfo(enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.nats.info(),
    queryFn: natsApi.getInfo,
    enabled,
    staleTime: 2000,
    refetchInterval: 5000,
    retry: 1,
  });
}

// Account info query (only when connected)
export function useAccountInfo(enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.nats.account(),
    queryFn: natsApi.getAccountInfo,
    enabled,
    staleTime: 2000,
    refetchInterval: 5000,
    retry: 1,
  });
}

// Connection mutation
export function useConnectToNATS() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (credentials: ConnectionCredentials) => natsApi.connect(credentials),
    onSuccess: () => {
      // Invalidate and refetch connection status
      queryClient.invalidateQueries({ queryKey: queryKeys.nats.status() });
      // Invalidate other NATS queries to trigger refetch when enabled
      queryClient.invalidateQueries({ queryKey: queryKeys.nats.all });
    },
    onError: (error) => {
      console.error('Connection failed:', error);
    },
  });
}

// Disconnect mutation
export function useDisconnectFromNATS() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: natsApi.disconnect,
    onSuccess: () => {
      // Update connection status immediately
      queryClient.setQueryData(queryKeys.nats.status(), { connected: false });
      // Invalidate all NATS-related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.nats.all });
    },
    onError: (error) => {
      console.error('Disconnect failed:', error);
      // Even if disconnect API fails, update local state
      queryClient.setQueryData(queryKeys.nats.status(), { connected: false });
    },
  });
}