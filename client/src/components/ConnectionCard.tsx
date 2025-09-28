import type { Connection } from '../lib/api';
import { formatBytes, formatDuration, formatTimestamp, formatRTT } from '../lib/utils';

interface ConnectionCardProps {
  connection: Connection;
}

export function ConnectionCard({ connection }: ConnectionCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
          <h4 className="text-xs font-semibold text-gray-900">{connection.name}</h4>
        </div>
        <span className="inline-flex px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
          CID: {connection.cid}
        </span>
      </div>

      <div className="grid grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
        <div>
          <span className="text-gray-500 block">IP Address</span>
          <div className="font-mono text-gray-900 truncate">{connection.ip}:{connection.port}</div>
        </div>
        
        <div>
          <span className="text-gray-500 block">Language</span>
          <div className="font-medium text-gray-900 truncate">{connection.lang} v{connection.version}</div>
        </div>

        <div>
          <span className="text-gray-500 block">Messages</span>
          <div className="text-gray-900">
            <span className="text-green-600">↓{connection.in_msgs.toLocaleString()}</span>
            <span className="text-blue-600 ml-1">↑{connection.out_msgs.toLocaleString()}</span>
          </div>
        </div>

        <div>
          <span className="text-gray-500 block">Bytes</span>
          <div className="text-gray-900">
            <span className="text-green-600">↓{formatBytes(connection.in_bytes)}</span>
            <span className="text-blue-600 ml-1">↑{formatBytes(connection.out_bytes)}</span>
          </div>
        </div>

        <div className="lg:block hidden">
          <span className="text-gray-500 block">Uptime</span>
          <div className="font-medium text-gray-900">{formatDuration(connection.uptime)}</div>
        </div>

        <div className="lg:block hidden">
          <span className="text-gray-500 block">RTT</span>
          <div className="font-mono text-gray-900">{formatRTT(connection.rtt)}</div>
        </div>

        <div className="lg:block hidden">
          <span className="text-gray-500 block">Subs</span>
          <div className="font-medium text-gray-900">{connection.subscriptions}</div>
        </div>

        <div className="lg:block hidden">
          <span className="text-gray-500 block">Last Activity</span>
          <div className="font-medium text-gray-900 text-xs">{formatTimestamp(connection.last_activity)}</div>
        </div>
      </div>

      {connection.pending_bytes > 0 && (
        <div className="mt-2 p-1.5 bg-yellow-50 rounded border border-yellow-200">
          <div className="text-xs text-yellow-800">
            <span className="font-medium">Pending:</span> {formatBytes(connection.pending_bytes)}
          </div>
        </div>
      )}
    </div>
  );
}