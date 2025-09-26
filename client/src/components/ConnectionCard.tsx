import type { Connection } from '../lib/api';
import { formatBytes, formatDuration, formatTimestamp, formatRTT } from '../lib/utils';

interface ConnectionCardProps {
  connection: Connection;
}

export function ConnectionCard({ connection }: ConnectionCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <h4 className="text-sm font-semibold text-gray-900">{connection.name}</h4>
        </div>
        <span className="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
          CID: {connection.cid}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="space-y-2">
          <div>
            <span className="text-gray-500">IP Address:</span>
            <div className="font-mono text-gray-900">{connection.ip}:{connection.port}</div>
          </div>
          <div>
            <span className="text-gray-500">Language:</span>
            <div className="font-medium text-gray-900">{connection.lang} v{connection.version}</div>
          </div>
          <div>
            <span className="text-gray-500">Uptime:</span>
            <div className="font-medium text-gray-900">{formatDuration(connection.uptime)}</div>
          </div>
          <div>
            <span className="text-gray-500">RTT:</span>
            <div className="font-mono text-gray-900">{formatRTT(connection.rtt)}</div>
          </div>
        </div>

        <div className="space-y-2">
          <div>
            <span className="text-gray-500">Messages:</span>
            <div className="text-gray-900">
              <span className="text-green-600">↓{connection.in_msgs.toLocaleString()}</span>
              {' / '}
              <span className="text-blue-600">↑{connection.out_msgs.toLocaleString()}</span>
            </div>
          </div>
          <div>
            <span className="text-gray-500">Bytes:</span>
            <div className="text-gray-900">
              <span className="text-green-600">↓{formatBytes(connection.in_bytes)}</span>
              {' / '}
              <span className="text-blue-600">↑{formatBytes(connection.out_bytes)}</span>
            </div>
          </div>
          <div>
            <span className="text-gray-500">Subscriptions:</span>
            <div className="font-medium text-gray-900">{connection.subscriptions}</div>
          </div>
          <div>
            <span className="text-gray-500">Last Activity:</span>
            <div className="font-medium text-gray-900">{formatTimestamp(connection.last_activity)}</div>
          </div>
        </div>
      </div>

      {connection.pending_bytes > 0 && (
        <div className="mt-3 p-2 bg-yellow-50 rounded border border-yellow-200">
          <div className="text-xs text-yellow-800">
            <span className="font-medium">Pending:</span> {formatBytes(connection.pending_bytes)}
          </div>
        </div>
      )}
    </div>
  );
}