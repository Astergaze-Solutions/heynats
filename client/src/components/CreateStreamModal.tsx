import { useState } from 'react';
import { StreamConfig } from '../lib/api';
import { Button } from './ui/button';
import { TagInput } from './ui/tag-input';

interface CreateStreamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (config: Partial<StreamConfig>) => Promise<void>;
  isLoading?: boolean;
}

export function CreateStreamModal({ isOpen, onClose, onSubmit, isLoading = false }: CreateStreamModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    subjects: [] as string[],
    storage: 'file' as 'file' | 'memory',
    retention: 'limits' as 'limits' | 'interest' | 'workqueue',
    max_msgs: '-1',
    max_bytes: '-1',
    max_age: '-1',
    max_consumers: '-1',
    num_replicas: 1,
    discard: 'old' as 'old' | 'new',
    allow_direct: true,
    allow_msg_ttl: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubjectsChange = (subjects: string[]) => {
    setFormData({
      ...formData,
      subjects
    });
    // Clear subject error if it exists
    if (errors.subjects) {
      const { subjects: _, ...restErrors } = errors;
      setErrors(restErrors);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Stream name is required';
    } else if (!/^[a-zA-Z0-9_-]+$/.test(formData.name)) {
      newErrors.name = 'Stream name can only contain letters, numbers, underscores, and hyphens';
    }

    if (formData.subjects.length === 0) {
      newErrors.subjects = 'At least one subject is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Prepare config
    const config: Partial<StreamConfig> = {
      name: formData.name,
      subjects: formData.subjects,
      storage: formData.storage,
      retention: formData.retention,
      discard: formData.discard,
      num_replicas: formData.num_replicas,
      allow_direct: formData.allow_direct,
      allow_msg_ttl: formData.allow_msg_ttl,
    };

    // Add limits if specified
    if (formData.max_msgs) {
      config.max_msgs = parseInt(formData.max_msgs) || -1;
    }
    if (formData.max_bytes) {
      config.max_bytes = parseInt(formData.max_bytes) || -1;
    }
    if (formData.max_age) {
      config.max_age = parseInt(formData.max_age) * 1000000000 || 0; // Convert seconds to nanoseconds
    }
    if (formData.max_consumers) {
      config.max_consumers = parseInt(formData.max_consumers) || -1;
    }

    try {
      await onSubmit(config);
      handleClose();
    } catch (error) {
      console.error('Failed to create stream:', error);
      // Error toast is handled by the parent component's mutation
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      subjects: [],
      storage: 'file',
      retention: 'limits',
      max_msgs: '',
      max_bytes: '',
      max_age: '',
      max_consumers: '',
      num_replicas: 1,
      discard: 'old',
      allow_direct: true,
      allow_msg_ttl: false,
    });
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Create New Stream</h2>
            <p className="text-gray-600">Configure a new JetStream stream</p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleClose} disabled={isLoading}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Configuration */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Basic Configuration</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Stream Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.name ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="my_stream"
                disabled={isLoading}
              />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subjects *
              </label>
              <TagInput
                value={formData.subjects}
                onChange={handleSubjectsChange}
                placeholder="Enter subject (e.g., orders.created, orders.*)"
                disabled={isLoading}
                error={errors.subjects}
              />
              <p className="text-gray-500 text-sm mt-1">
                Type subjects and press Enter to add them as chips. Use commas to separate multiple subjects at once.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Storage Type
                </label>
                <select
                  value={formData.storage}
                  onChange={(e) => setFormData({ ...formData, storage: e.target.value as 'file' | 'memory' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isLoading}
                >
                  <option value="file">File</option>
                  <option value="memory">Memory</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Retention Policy
                </label>
                <select
                  value={formData.retention}
                  onChange={(e) => setFormData({ ...formData, retention: e.target.value as 'limits' | 'interest' | 'workqueue' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isLoading}
                >
                  <option value="limits">Limits</option>
                  <option value="interest">Interest</option>
                  <option value="workqueue">Work Queue</option>
                </select>
              </div>
            </div>
          </div>

          {/* Limits */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Limits</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Messages
                </label>
                <input
                  type="number"
                  value={formData.max_msgs}
                  onChange={(e) => setFormData({ ...formData, max_msgs: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="No limit"
                  min="-1"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Bytes
                </label>
                <input
                  type="number"
                  value={formData.max_bytes}
                  onChange={(e) => setFormData({ ...formData, max_bytes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="No limit"
                  min="-1"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Age (seconds)
                </label>
                <input
                  type="number"
                  value={formData.max_age}
                  onChange={(e) => setFormData({ ...formData, max_age: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="No limit"
                  min="-1"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Consumers
                </label>
                <input
                  type="number"
                  value={formData.max_consumers}
                  onChange={(e) => setFormData({ ...formData, max_consumers: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="No limit"
                  min="-1"
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>

          {/* Advanced Options */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Advanced Options</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Replicas
                </label>
                <input
                  type="number"
                  value={formData.num_replicas}
                  onChange={(e) => setFormData({ ...formData, num_replicas: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="1"
                  max="5"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Discard Policy
                </label>
                <select
                  value={formData.discard}
                  onChange={(e) => setFormData({ ...formData, discard: e.target.value as 'old' | 'new' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isLoading}
                >
                  <option value="old">Old</option>
                  <option value="new">New</option>
                </select>
              </div>
            </div>

            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.allow_direct}
                  onChange={(e) => setFormData({ ...formData, allow_direct: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  disabled={isLoading}
                />
                <span className="ml-2 text-sm text-gray-700">Allow Direct Access</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.allow_msg_ttl}
                  onChange={(e) => setFormData({ ...formData, allow_msg_ttl: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  disabled={isLoading}
                />
                <span className="ml-2 text-sm text-gray-700">Allow Message TTL</span>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Stream'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}