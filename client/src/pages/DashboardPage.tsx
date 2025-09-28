import { useConnectionStatus, useNATSInfo, useAccountInfo } from '../hooks/useNATS';
import { ConnectionCard } from '../components/ConnectionCard';
import { ConnectionStats } from '../components/StatsCard';
import { formatTimestamp, getStatusColor } from '../lib/utils';

export function DashboardPage() {
  const { data: status } = useConnectionStatus();
  const { data: natsInfo, isLoading: infoLoading, error: infoError } = useNATSInfo(status?.connected);
  const { data: accountInfo, isLoading: accountLoading } = useAccountInfo(status?.connected);



  const isLoading = infoLoading || accountLoading;

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (infoError) {
    return (
      <div className="p-6 flex items-center justify-center h-96 bg-red-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-800 mb-4">Connection Error</h2>
          <p className="text-red-600 mb-6">{infoError.message}</p>
          <p className="text-sm text-red-500">Please try disconnecting and reconnecting.</p>
        </div>
      </div>
    );
  }

  // Calculate connection stats
  const connections = accountInfo?.connection_limits?.connections || [];
  const totalMessages = connections.reduce((acc, conn) => acc + conn.in_msgs + conn.out_msgs, 0);
  const totalBytes = connections.reduce((acc, conn) => acc + conn.in_bytes + conn.out_bytes, 0);

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="space-y-6">
          {/* Stats Overview */}
          {accountInfo && (
            <ConnectionStats
              totalConnections={accountInfo.connection_limits.total}
              activeConnections={accountInfo.connection_limits.num_connections}
              totalMessages={totalMessages}
              totalBytes={totalBytes}
            />
          )}

          <div>
            {/* Server Information */}
            <div>
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Server Information</h3>
                  {natsInfo && (
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(natsInfo.is_connected ? 'connected' : 'disconnected')}`}>
                      {natsInfo.is_connected ? 'Connected' : 'Disconnected'}
                    </span>
                  )}
                </div>
                
                {accountInfo?.account_information && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Server</h4>
                    <div className="text-sm text-gray-900 font-mono">
                    {accountInfo.account_information.server_name}
                    </div>
                    <div className="text-xs text-gray-500">
                    v{accountInfo.account_information.server_version}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Connection</h4>
                    <div className="text-sm text-gray-900 font-mono">
                    {accountInfo.account_information.connected_url}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Client Info</h4>
                    <div className="text-sm text-gray-900">
                    ID: {accountInfo.account_information.client_id}
                    </div>
                    <div className="text-xs text-gray-500">
                    {accountInfo.account_information.client_ip} → {accountInfo.account_information.local_ip}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Performance</h4>
                    <div className="text-sm text-gray-900">
                    RTT: <span className="font-mono">{accountInfo.account_information.rtt}</span>
                    </div>
                    <div className="text-xs text-gray-500">
                    Max Payload: {accountInfo.account_information.max_payload}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Security</h4>
                    <div className="text-sm text-gray-900">
                    User: {accountInfo.account_information.user}
                    </div>
                    <div className="text-xs text-gray-500">
                    Headers: {accountInfo.account_information.header_supported ? 'Supported' : 'Not supported'}
                    </div>
                  </div>
                  </div>
                )}
              </div>
            </div>

            {/* Connections List */}
            <div className="mt-6">
              <div className="bg-white rounded-lg border border-gray-200 p-6 overflow-y-auto" style={{ maxHeight: '600px' }}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Active Connections
                    {accountInfo && (
                      <span className="ml-2 text-sm font-normal text-gray-500">
                        ({accountInfo.connection_limits.num_connections} of {accountInfo.connection_limits.limit})
                      </span>
                    )}
                  </h3>
                  <div className="text-xs text-gray-500">
                    Updated: {accountInfo?.connection_limits.now ? formatTimestamp(accountInfo.connection_limits.now) : 'N/A'}
                  </div>
                </div>

                <div className="space-y-4">
                  {connections.length > 0 ? (
                    connections.map((connection) => (
                      <ConnectionCard key={connection.cid} connection={connection} />
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 00-2 2v2m0 0V9a2 2 0 012-2m0 0V7a2 2 0 012-2h10a2 2 0 012 2v2M7 7V6a3 3 0 016 0v1" />
                      </svg>
                      <p className="mt-2">No active connections found</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}