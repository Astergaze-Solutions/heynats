import { Stream } from '../lib/api';
import { formatBytes, formatTimestamp } from '../lib/utils';
import { Button } from './ui/button';

interface StreamDetailModalProps {
  stream: Stream | null;
  isOpen: boolean;
  onClose: () => void;
}

export function StreamDetailModal({ stream, isOpen, onClose }: StreamDetailModalProps) {
  if (!isOpen || !stream) return null;

  const { config, state, created } = stream;

  const formatAge = (ageNs: number) => {
    if (ageNs === 0) return 'No limit';
    const seconds = ageNs / 1000000000;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m`;
    } else {
      return `${Math.floor(seconds)}s`;
    }
  };

  const formatLimit = (value: number) => {
    return value === -1 ? 'No limit' : value.toLocaleString();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{config?.name}</h2>
            <p className="text-gray-600">Stream Details</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Button>
        </div>

        <div className="p-6">
          {/* Overview */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Overview</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-gray-900">{state?.messages?.toLocaleString()}</div>
                <div className="text-sm text-gray-600">Total Messages</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-gray-900">{formatBytes(state?.bytes || 0)}</div>
                <div className="text-sm text-gray-600">Total Size</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-gray-900">{state?.consumer_count}</div>
                <div className="text-sm text-gray-600">Active Consumers</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-gray-900">{config?.subjects?.length}</div>
                <div className="text-sm text-gray-600">Subjects</div>
              </div>
            </div>
          </div>

          {/* Subjects List */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Subjects</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              {(config?.subjects?.length || 0) > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {config?.subjects?.map((subject, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-white rounded border">
                      <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c1.31 0 2.38.83 2.83 2M15 3h2a2 2 0 012 2v13a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2h3m0 0v2a2 2 0 002 2v0a2 2 0 002-2V3m-6 0V1" />
                      </svg>
                      <span className="text-sm font-mono text-gray-900 truncate">{subject}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p>No subjects configured</p>
                </div>
              )}
            </div>
          </div>

          {/* Configuration */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Configuration</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Storage Type</label>
                  <div className="mt-1 flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2v0" />
                    </svg>
                    <span className="text-sm text-gray-900 capitalize">{config?.storage}</span>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Retention Policy</label>
                  <div className="mt-1">
                    <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 capitalize">
                      {config?.retention}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Discard Policy</label>
                  <div className="mt-1">
                    <span className="text-sm text-gray-900 capitalize">{config?.discard}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Replicas</label>
                  <div className="mt-1">
                    <span className="text-sm text-gray-900">{config?.num_replicas}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Max Messages</label>
                  <div className="mt-1">
                    <span className="text-sm text-gray-900">{formatLimit(config?.max_msgs || 0)}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Max Bytes</label>
                  <div className="mt-1">
                    <span className="text-sm text-gray-900">{config?.max_bytes === -1 ? 'No limit' : formatBytes(config?.max_bytes || 0)}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Max Age</label>
                  <div className="mt-1">
                    <span className="text-sm text-gray-900">{formatAge(config?.max_age || 0)}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Max Consumers</label>
                  <div className="mt-1">
                    <span className="text-sm text-gray-900">{formatLimit(config?.max_consumers || 0)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stream State */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Stream State</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">First Sequence</label>
                  <div className="mt-1">
                    <span className="text-sm text-gray-900">{state?.first_seq}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Last Sequence</label>
                  <div className="mt-1">
                    <span className="text-sm text-gray-900">{state?.last_seq}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Deleted Messages</label>
                  <div className="mt-1">
                    <span className="text-sm text-gray-900">{state?.num_deleted}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">First Message Time</label>
                  <div className="mt-1">
                    <span className="text-sm text-gray-900">
                      {state?.first_ts && state.first_ts !== '0001-01-01T00:00:00Z' 
                        ? formatTimestamp(state.first_ts)
                        : 'N/A'
                      }
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Last Message Time</label>
                  <div className="mt-1">
                    <span className="text-sm text-gray-900">
                      {state?.last_ts && state.last_ts !== '0001-01-01T00:00:00Z'
                        ? formatTimestamp(state.last_ts)
                        : 'N/A'
                      }
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Created</label>
                  <div className="mt-1">
                    <span className="text-sm text-gray-900">{formatTimestamp(created || '')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Advanced Options */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Advanced Options</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <span className="text-sm font-medium text-gray-700">Allow Direct</span>
                <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                  config?.allow_direct ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {config?.allow_direct ? 'Enabled' : 'Disabled'}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <span className="text-sm font-medium text-gray-700">Mirror Direct</span>
                <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                  config?.mirror_direct ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {config?.mirror_direct ? 'Enabled' : 'Disabled'}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <span className="text-sm font-medium text-gray-700">Allow Message TTL</span>
                <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                  config?.allow_msg_ttl ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {config?.allow_msg_ttl ? 'Enabled' : 'Disabled'}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <span className="text-sm font-medium text-gray-700">Compression</span>
                <span className="text-sm text-gray-900 capitalize">{config?.compression}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}