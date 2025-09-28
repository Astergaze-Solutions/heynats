import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConnectionStatus } from '../hooks/useNATS';
import { useKVBuckets, useCreateKVBucket, useDeleteKVBucket } from '../hooks/useKV';
import { BucketCard } from '../components/BucketCard';
import { CreateBucketModal } from '../components/CreateBucketModal';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { StatsCard } from '../components/StatsCard';
import { Database, Search, Plus, Archive, HardDrive, Hash } from 'lucide-react';

export function KeyValuePage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  // Check connection status
  const { data: connectionStatus } = useConnectionStatus();
  const isConnected = connectionStatus?.connected || false;

  // Fetch KV buckets
  const { 
    data: bucketsData, 
    isLoading, 
    error,
    refetch 
  } = useKVBuckets();

  // Mutations
  const createBucketMutation = useCreateKVBucket();
  const deleteBucketMutation = useDeleteKVBucket();

  const buckets = bucketsData?.buckets || [];
  
  // Filter buckets based on search term
  const filteredBuckets = buckets.filter(bucket =>
    bucket.bucket.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate stats
  const totalBuckets = buckets.length;
  const totalEntries = buckets.reduce((sum, bucket) => sum + bucket.values, 0);
  const totalBytes = buckets.reduce((sum, bucket) => sum + bucket.bytes, 0);
  const compressedBuckets = buckets.filter(bucket => bucket.is_compressed).length;

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleCreateBucket = (config: any) => {
    createBucketMutation.mutate(config, {
      onSuccess: () => {
        setIsCreateModalOpen(false);
      },
    });
  };

  const handleViewBucket = (bucketName: string) => {
    // Navigate to bucket detail page
    navigate(`/dashboard/kv/${bucketName}`);
  };

  const handleDeleteBucket = (bucketName: string) => {
    deleteBucketMutation.mutate(bucketName);
  };

  // Show connection required message
  if (!isConnected) {
    return (
      <div className="p-3">
        <div className="max-w-full">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-gray-900">Key-Value Store</h2>
            <p className="text-sm text-gray-600">Manage NATS Key-Value buckets and operations</p>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 p-8">
            <div className="text-center">
              <Database className="mx-auto h-16 w-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Connection Required</h3>
              <p className="text-gray-500 mb-6">
                Please connect to a NATS server to access Key-Value store features.
              </p>
              <Button onClick={() => navigate('/dashboard')}>
                Go to Connection Settings
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="p-3">
        <div className="max-w-full">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-gray-900">Key-Value Store</h2>
            <p className="text-sm text-gray-600">Manage NATS Key-Value buckets and operations</p>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Loading Buckets</h3>
              <p className="text-gray-500">Fetching KV buckets...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="p-3">
        <div className="max-w-full">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-gray-900">Key-Value Store</h2>
            <p className="text-sm text-gray-600">Manage NATS Key-Value buckets and operations</p>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 p-8">
            <div className="text-center">
              <svg className="mx-auto h-16 w-16 text-red-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Buckets</h3>
              <p className="text-gray-500 mb-6">
                Failed to load KV buckets. Please check your connection.
              </p>
              <div className="mt-4">
                <Button onClick={() => refetch()} size="sm" variant="outline">
                  Try Again
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3">
      <div className="max-w-full">
        {/* Header */}
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Key-Value Store</h2>
              <p className="text-sm text-gray-600">Manage NATS Key-Value buckets and operations</p>
            </div>
            <Button onClick={() => setIsCreateModalOpen(true)} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Create Bucket
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        {!isLoading && buckets.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <StatsCard
              title="Total Buckets"
              value={totalBuckets}
              icon={<Database className="w-4 h-4 text-indigo-600" />}
            />
            <StatsCard
              title="Total Entries"
              value={totalEntries.toLocaleString()}
              icon={<Hash className="w-4 h-4 text-indigo-600" />}
            />
            <StatsCard
              title="Storage Used"
              value={formatBytes(totalBytes)}
              icon={<HardDrive className="w-4 h-4 text-indigo-600" />}
            />
            <StatsCard
              title="Compressed"
              value={`${compressedBuckets}/${totalBuckets}`}
              icon={<Archive className="w-4 h-4 text-indigo-600" />}
            />
          </div>
        )}

        {/* Search and Filters */}
        {buckets.length > 0 && (
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search buckets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        )}

        {/* Buckets List */}
        {buckets.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8">
            <div className="text-center">
              <Database className="mx-auto h-16 w-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Buckets Found</h3>
              <p className="text-gray-500 mb-6">
                Create your first KV bucket to start storing key-value pairs.
              </p>
              <Button onClick={() => setIsCreateModalOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Bucket
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredBuckets.map((bucket) => (
              <BucketCard
                key={bucket.bucket}
                bucket={bucket}
                onView={handleViewBucket}
                onDelete={handleDeleteBucket}
              />
            ))}
          </div>
        )}

        {/* No search results */}
        {buckets.length > 0 && filteredBuckets.length === 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-8">
            <div className="text-center">
              <Search className="mx-auto h-16 w-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Buckets Match Your Search</h3>
              <p className="text-gray-500 mb-6">
                Try adjusting your search term or create a new bucket.
              </p>
              <Button onClick={() => setSearchTerm('')} variant="outline">
                Clear Search
              </Button>
            </div>
          </div>
        )}

        {/* Create Bucket Modal */}
        <CreateBucketModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSubmit={handleCreateBucket}
          isLoading={createBucketMutation.isPending}
        />
      </div>
    </div>
  );
}