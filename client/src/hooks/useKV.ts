import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { kvApi, CreateBucketRequest } from '../lib/api';
import { showErrorToast, showSuccessToast } from '../lib/error-utils';

// Query keys for KV operations
export const kvQueryKeys = {
  kv: {
    all: ['kv'] as const,
    buckets: () => [...kvQueryKeys.kv.all, 'buckets'] as const,
    bucket: (bucketName: string) => [...kvQueryKeys.kv.all, 'bucket', bucketName] as const,
    bucketKeys: (bucketName: string) => [...kvQueryKeys.kv.all, 'bucketKeys', bucketName] as const,
    key: (bucketName: string, key: string) => [...kvQueryKeys.kv.all, 'key', bucketName, key] as const,
  },
};

// Get all KV buckets
export function useKVBuckets() {
  return useQuery({
    queryKey: kvQueryKeys.kv.buckets(),
    queryFn: kvApi.getBuckets,
    staleTime: 30000, // Consider data stale after 30 seconds
    refetchInterval: 60000, // Refetch every minute
    retry: 1,
  });
}

// Get specific bucket details
export function useKVBucket(bucketName: string, enabled: boolean = true) {
  return useQuery({
    queryKey: kvQueryKeys.kv.bucket(bucketName),
    queryFn: () => kvApi.getBucket(bucketName),
    enabled: enabled && !!bucketName,
    staleTime: 30000,
    refetchInterval: 60000,
    retry: 1,
  });
}

// Get all keys in a bucket
export function useKVBucketKeys(bucketName: string, enabled: boolean = true) {
  return useQuery({
    queryKey: kvQueryKeys.kv.bucketKeys(bucketName),
    queryFn: () => kvApi.getBucketKeys(bucketName),
    enabled: enabled && !!bucketName,
    staleTime: 10000, // Keys might change more frequently
    refetchInterval: 30000,
    retry: 1,
  });
}

// Get specific key value
export function useKVKey(bucketName: string, key: string, enabled: boolean = true) {
  return useQuery({
    queryKey: kvQueryKeys.kv.key(bucketName, key),
    queryFn: () => kvApi.getKey(bucketName, key),
    enabled: enabled && !!bucketName && !!key,
    staleTime: 5000, // Values might change frequently
    refetchInterval: 15000,
    retry: 1,
  });
}

// Create bucket mutation
export function useCreateKVBucket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (config: CreateBucketRequest) => kvApi.createBucket(config),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: kvQueryKeys.kv.buckets() });
      showSuccessToast(
        'KV Bucket created successfully!', 
        `Bucket "${data.bucket}" is now ready for key-value operations`
      );
    },
    onError: (error) => {
      console.error('Failed to create KV bucket:', error);
      showErrorToast('create KV bucket', error, 'Failed to create KV bucket. Please try again.');
    },
  });
}

// Delete bucket mutation
export function useDeleteKVBucket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (bucketName: string) => kvApi.deleteBucket(bucketName),
    onSuccess: (_, bucketName) => {
      queryClient.invalidateQueries({ queryKey: kvQueryKeys.kv.buckets() });
      queryClient.removeQueries({ queryKey: kvQueryKeys.kv.bucket(bucketName) });
      queryClient.removeQueries({ queryKey: kvQueryKeys.kv.bucketKeys(bucketName) });
      showSuccessToast(
        'KV Bucket deleted successfully!', 
        `Bucket "${bucketName}" and all its keys have been removed`
      );
    },
    onError: (error) => {
      console.error('Failed to delete KV bucket:', error);
      showErrorToast('delete KV bucket', error, 'Failed to delete KV bucket. Please try again.');
    },
  });
}

// Set key mutation
export function useSetKVKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ bucketName, key, value }: { bucketName: string; key: string; value: string }) =>
      kvApi.setKey(bucketName, key, value),
    onSuccess: (_, { bucketName, key }) => {
      queryClient.invalidateQueries({ queryKey: kvQueryKeys.kv.bucketKeys(bucketName) });
      queryClient.invalidateQueries({ queryKey: kvQueryKeys.kv.key(bucketName, key) });
      queryClient.invalidateQueries({ queryKey: kvQueryKeys.kv.bucket(bucketName) });
      showSuccessToast(
        'Key updated successfully!', 
        `Key "${key}" has been set in bucket "${bucketName}"`
      );
    },
    onError: (error) => {
      console.error('Failed to set key:', error);
      showErrorToast('set key', error, 'Failed to set key value. Please try again.');
    },
  });
}

// Delete key mutation
export function useDeleteKVKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ bucketName, key }: { bucketName: string; key: string }) =>
      kvApi.deleteKey(bucketName, key),
    onSuccess: (_, { bucketName, key }) => {
      queryClient.invalidateQueries({ queryKey: kvQueryKeys.kv.bucketKeys(bucketName) });
      queryClient.removeQueries({ queryKey: kvQueryKeys.kv.key(bucketName, key) });
      queryClient.invalidateQueries({ queryKey: kvQueryKeys.kv.bucket(bucketName) });
      showSuccessToast(
        'Key deleted successfully!', 
        `Key "${key}" has been removed from bucket "${bucketName}"`
      );
    },
    onError: (error) => {
      console.error('Failed to delete key:', error);
      showErrorToast('delete key', error, 'Failed to delete key. Please try again.');
    },
  });
}