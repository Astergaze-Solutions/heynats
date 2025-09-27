import { useState } from 'react';
import { KVBucket } from '../lib/api';
import { Button } from './ui/button';
import { HardDrive, Hash, Clock, Archive, Trash2, Eye } from 'lucide-react';

interface BucketCardProps {
  bucket: KVBucket;
  onView: (bucketName: string) => void;
  onDelete: (bucketName: string) => void;
}

export function BucketCard({ bucket, onView, onDelete }: BucketCardProps) {
  const [isDeleteConfirming, setIsDeleteConfirming] = useState(false);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTTL = (ttl: string): string => {
    if (ttl === '0s' || ttl === '0') return 'No TTL';
    return ttl;
  };

  const handleDeleteClick = () => {
    if (isDeleteConfirming) {
      onDelete(bucket.bucket);
      setIsDeleteConfirming(false);
    } else {
      setIsDeleteConfirming(true);
      // Reset confirmation after 3 seconds
      setTimeout(() => setIsDeleteConfirming(false), 3000);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {bucket.bucket}
            </h3>
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <div className="flex items-center space-x-1">
                <Hash className="w-3 h-3" />
                <span>{bucket.values.toLocaleString()} entries</span>
              </div>
              <div className="flex items-center space-x-1">
                <HardDrive className="w-3 h-3" />
                <span>{formatBytes(bucket.bytes)}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              onClick={() => onView(bucket.bucket)}
              size="sm"
              variant="outline"
              className="text-gray-600 hover:text-gray-900"
            >
              <Eye className="w-3 h-3 mr-1" />
              View
            </Button>
            <Button
              onClick={handleDeleteClick}
              size="sm"
              variant="outline"
              className={`${
                isDeleteConfirming 
                  ? 'text-red-600 border-red-300 hover:bg-red-50' 
                  : 'text-gray-600 hover:text-red-600'
              }`}
            >
              <Trash2 className="w-3 h-3 mr-1" />
              {isDeleteConfirming ? 'Confirm' : 'Delete'}
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center space-x-2 text-sm">
            <Archive className="w-4 h-4 text-gray-400" />
            <div>
              <div className="text-gray-500">History</div>
              <div className="font-medium">{bucket.history} revisions</div>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-sm">
            <Clock className="w-4 h-4 text-gray-400" />
            <div>
              <div className="text-gray-500">TTL</div>
              <div className="font-medium">{formatTTL(bucket.ttl)}</div>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-sm">
            <HardDrive className="w-4 h-4 text-gray-400" />
            <div>
              <div className="text-gray-500">Storage</div>
              <div className="font-medium capitalize">{bucket.backing_store}</div>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-sm">
            <Archive className="w-4 h-4 text-gray-400" />
            <div>
              <div className="text-gray-500">Compression</div>
              <div className="font-medium">{bucket.is_compressed ? 'Enabled' : 'Disabled'}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}