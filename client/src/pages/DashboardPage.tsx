import { useNavigate } from 'react-router-dom';
import { useConnectionStatus, useNATSInfo, useAccountInfo, useDisconnectFromNATS } from '../hooks/useNATS';
import { Button } from '../components/ui/button';
import { ConnectionCard } from '../components/ConnectionCard';
import { ConnectionStats } from '../components/StatsCard';
import { formatTimestamp, getStatusColor } from '../lib/utils';

export function DashboardPage() {
  const navigate = useNavigate();
  const { data: status } = useConnectionStatus();
  const { data: natsInfo, isLoading: infoLoading, error: infoError } = useNATSInfo(status?.connected);
  const { data: accountInfo, isLoading: accountLoading } = useAccountInfo(status?.connected);
  const disconnectMutation = useDisconnectFromNATS();

  const handleDisconnect = async () => {
    try {
      await disconnectMutation.mutateAsync();
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Disconnect failed:', error);
      // Navigate anyway since the connection might be lost
      navigate('/', { replace: true });
    }
  };



  const isLoading = infoLoading || accountLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (infoError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-800 mb-4">Connection Error</h2>
          <p className="text-red-600 mb-6">{infoError.message}</p>
          <Button onClick={handleDisconnect} className="bg-red-600 hover:bg-red-700">
            Disconnect
          </Button>
        </div>
      </div>
    );
  }

  // Calculate connection stats
  const connections = accountInfo?.connection_limits?.connections || [];
  const totalMessages = connections.reduce((acc, conn) => acc + conn.in_msgs + conn.out_msgs, 0);
  const totalBytes = connections.reduce((acc, conn) => acc + conn.in_bytes + conn.out_bytes, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">HeyNATS Dashboard</h1>
              <p className="text-sm text-gray-500 mt-1">
                {accountInfo?.account_information ? (
                  <>Connected as <span className="font-medium">{accountInfo.account_information.user}</span> • Account: {accountInfo.account_information.account}</>
                ) : (
                  'Managing NATS server connections and monitoring'
                )}
              </p>
            </div>
            <Button 
              onClick={handleDisconnect} 
              variant="outline" 
              disabled={disconnectMutation.isPending}
              className="border-red-300 text-red-700 hover:bg-red-50"
            >
              {disconnectMutation.isPending ? 'Disconnecting...' : 'Disconnect'}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Server Information */}
            <div className="lg:col-span-1">
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
                  <dl className="space-y-4">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Server</dt>
                      <dd className="mt-1 text-sm text-gray-900 font-mono">
                        {accountInfo.account_information.server_name}
                      </dd>
                      <dd className="text-xs text-gray-500">
                        v{accountInfo.account_information.server_version}
                      </dd>
                    </div>
                    
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Connection</dt>
                      <dd className="mt-1 text-sm text-gray-900 font-mono">
                        {accountInfo.account_information.connected_url}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-sm font-medium text-gray-500">Client Info</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        ID: {accountInfo.account_information.client_id}
                      </dd>
                      <dd className="text-xs text-gray-500">
                        {accountInfo.account_information.client_ip} → {accountInfo.account_information.local_ip}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-sm font-medium text-gray-500">Performance</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        RTT: <span className="font-mono">{accountInfo.account_information.rtt}</span>
                      </dd>
                      <dd className="text-xs text-gray-500">
                        Max Payload: {accountInfo.account_information.max_payload}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-sm font-medium text-gray-500">Security</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        User: {accountInfo.account_information.user}
                      </dd>
                      <dd className="text-xs text-gray-500">
                        Headers: {accountInfo.account_information.header_supported ? 'Supported' : 'Not supported'}
                      </dd>
                    </div>
                  </dl>
                )}
              </div>
            </div>

            {/* Connections List */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
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

          {/* Quick Actions */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              NATS Management
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button variant="outline" className="h-24 flex flex-col items-center justify-center space-y-2 hover:bg-blue-50 hover:border-blue-300">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                <span className="text-sm font-medium">Publish</span>
              </Button>
              
              <Button variant="outline" className="h-24 flex flex-col items-center justify-center space-y-2 hover:bg-green-50 hover:border-green-300">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
                <span className="text-sm font-medium">Subscribe</span>
              </Button>
              
              <Button variant="outline" className="h-24 flex flex-col items-center justify-center space-y-2 hover:bg-purple-50 hover:border-purple-300">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span className="text-sm font-medium">Streams</span>
              </Button>
              
              <Button variant="outline" className="h-24 flex flex-col items-center justify-center space-y-2 hover:bg-orange-50 hover:border-orange-300">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                <span className="text-sm font-medium">Key-Value</span>
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}