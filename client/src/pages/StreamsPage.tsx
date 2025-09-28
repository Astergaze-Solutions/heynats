import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { streamsApi, Stream, StreamConfig } from '../lib/api';
import { StreamCard } from '../components/StreamCard';
import { CreateStreamModal } from '../components/CreateStreamModal';
import { Button } from '../components/ui/button';
import { StatsCard } from '../components/StatsCard';
import { showErrorToast, showSuccessToast } from '../lib/error-utils';

export function StreamsPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  const queryClient = useQueryClient();

  // Fetch streams
  const { 
    data: streamsData, 
    isLoading, 
    error,
    refetch 
  } = useQuery({
    queryKey: ['streams'],
    queryFn: streamsApi.getStreams,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Create stream mutation
  const createStreamMutation = useMutation({
    mutationFn: streamsApi.createStream,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['streams'] });
      setIsCreateModalOpen(false);
      showSuccessToast('Stream created successfully!', 'The new stream is now available for publishing messages');
    },
    onError: (error) => {
      console.error('Failed to create stream:', error);
      showErrorToast('create stream', error, 'Failed to create stream. Please try again.');
    },
  });

  // Delete stream mutation
  const deleteStreamMutation = useMutation({
    mutationFn: streamsApi.deleteStream,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['streams'] });
      showSuccessToast('Stream deleted successfully!', 'All associated messages and consumers have been removed');
    },
    onError: (error) => {
      console.error('Failed to delete stream:', error);
      showErrorToast('delete stream', error, 'Failed to delete stream. Please try again.');
    },
  });

  const streams = streamsData?.streams || [];
  const filteredStreams = streams.filter(stream =>
    (stream.config?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    stream.config?.subjects?.some(subject => 
      subject.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  // Calculate aggregate statistics
  const totalMessages = streams.reduce((sum, stream) => sum + (stream.state?.messages || 0), 0);
  const totalConsumers = streams.reduce((sum, stream) => sum + (stream.state?.consumer_count || 0), 0);
  const totalSubjects = streams.reduce((sum, stream) => sum + (stream.config?.subjects?.length || 0), 0);

  const handleViewDetails = (stream: Stream) => {
    const streamName = stream.config?.name;
    if (streamName) {
      navigate(`/dashboard/streams/${encodeURIComponent(streamName)}`);
    }
  };

  const handleCreateStream = async (config: Partial<StreamConfig>) => {
    await createStreamMutation.mutateAsync(config);
  };

  const handleDeleteStream = async (streamName: string) => {
    if (window.confirm(`Are you sure you want to delete stream "${streamName}"? This action cannot be undone.`)) {
      await deleteStreamMutation.mutateAsync(streamName);
    }
  };

  if (error) {
    return (
      <div className="p-3">
        <div className="max-w-full">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error loading streams</h3>
                <p className="mt-2 text-sm text-red-700">
                  {error instanceof Error ? error.message : 'Failed to load streams'}
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
              <h2 className="text-xl font-bold text-gray-900">Streams</h2>
              <p className="text-sm text-gray-600">Manage JetStream streams and consumers</p>
            </div>
            <Button onClick={() => setIsCreateModalOpen(true)} size="sm">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Stream
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        {!isLoading && streams.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <StatsCard
              title="Total Streams"
              value={streams.length}
              icon={
                <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              }
            />
            <StatsCard
              title="Total Messages"
              value={totalMessages.toLocaleString()}
              icon={
                <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              }
            />
            <StatsCard
              title="Total Consumers"
              value={totalConsumers}
              icon={
                <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              }
            />
            <StatsCard
              title="Total Subjects"
              value={totalSubjects}
              icon={
                <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c1.31 0 2.38.83 2.83 2M15 3h2a2 2 0 012 2v13a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2h3m0 0v2a2 2 0 002 2v0a2 2 0 002-2V3m-6 0V1" />
                </svg>
              }
            />
          </div>
        )}

        {/* Search and Filters */}
        {!isLoading && streams.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Search streams by name or subject..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button variant="outline" onClick={() => refetch()}>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </Button>
            </div>
          </div>
        )}

        {/* Streams List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center space-x-2">
              <svg className="animate-spin h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-gray-500">Loading streams...</span>
            </div>
          </div>
        ) : filteredStreams.length > 0 ? (
          <div className="space-y-6">
            {filteredStreams.map((stream, streamIndex) => (
              <StreamCard
                key={stream.config?.name || `stream-${streamIndex}`}
                stream={stream}
                onViewDetails={handleViewDetails}
                onDelete={handleDeleteStream}
              />
            ))}
          </div>
        ) : streams.length === 0 ? (
          // Empty state
          <div className="bg-white rounded-lg border border-gray-200 p-12">
            <div className="text-center">
              <svg className="mx-auto h-16 w-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No streams found</h3>
              <p className="text-gray-500 mb-6">
                Get started by creating your first JetStream stream to begin processing messages.
              </p>
              <Button onClick={() => setIsCreateModalOpen(true)}>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Your First Stream
              </Button>
            </div>
          </div>
        ) : (
          // No search results
          <div className="bg-white rounded-lg border border-gray-200 p-12">
            <div className="text-center">
              <svg className="mx-auto h-16 w-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No streams match your search</h3>
              <p className="text-gray-500 mb-6">
                Try adjusting your search terms or create a new stream.
              </p>
              <div className="flex justify-center gap-3">
                <Button variant="outline" onClick={() => setSearchTerm('')}>
                  Clear Search
                </Button>
                <Button onClick={() => setIsCreateModalOpen(true)}>
                  Create Stream
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Modals */}
        <CreateStreamModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSubmit={handleCreateStream}
          isLoading={createStreamMutation.isPending}
        />
      </div>
    </div>
  );
}