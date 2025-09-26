import { useState, useEffect } from "react";
import { Button } from "./ui/button";

interface NATSInfo {
  server_info: {
    server_id: string;
    server_name: string;
    connected_url: string;
    last_error: string | null;
  };
  stats: {
    in_msgs: number;
    out_msgs: number;
    in_bytes: number;
    out_bytes: number;
    reconnects: number;
  };
  is_connected: boolean;
  connected_url: string;
}

interface AccountInfo {
  connection_limits: Record<string, any>;
  stats: Record<string, any>;
  jetstream_info?: {
    memory: number;
    store: number;
    streams: number;
    consumers: number;
  };
}

interface DashboardProps {
  onDisconnect: () => void;
}

export function Dashboard({ onDisconnect }: DashboardProps) {
  const [natsInfo, setNatsInfo] = useState<NATSInfo | null>(null);
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNATSInfo = async () => {
    try {
      const response = await fetch("/api/nats/info");
      if (response.ok) {
        const data = await response.json();
        setNatsInfo(data);
        setError(null);
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to fetch NATS info");
      }
    } catch (err) {
      setError("Network error while fetching NATS info");
      console.error("Error fetching NATS info:", err);
    }
  };

  const fetchAccountInfo = async () => {
    try {
      const response = await fetch("/api/nats/account");
      if (response.ok) {
        const data = await response.json();
        setAccountInfo(data);
      } else {
        const errorData = await response.json();
        console.warn("Could not fetch account info:", errorData.error);
      }
    } catch (err) {
      console.error("Error fetching account info:", err);
    }
  };

  const handleDisconnect = async () => {
    try {
      await fetch("/api/nats/disconnect", { method: "POST" });
      onDisconnect();
    } catch (err) {
      console.error("Error disconnecting:", err);
      onDisconnect(); // Disconnect anyway
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchNATSInfo(), fetchAccountInfo()]);
      setLoading(false);
    };

    loadData();
    
    // Refresh data every 5 seconds
    const interval = setInterval(() => {
      fetchNATSInfo();
      fetchAccountInfo();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-800 mb-4">Connection Error</h2>
          <p className="text-red-600 mb-6">{error}</p>
          <Button onClick={handleDisconnect} className="bg-red-600 hover:bg-red-700">
            Disconnect
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">HeyNATS Dashboard</h1>
            <Button onClick={handleDisconnect} variant="outline">
              Disconnect
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Server Information */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Server Information
                </h3>
                {natsInfo && (
                  <dl className="space-y-3">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Connection Status</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          natsInfo.is_connected 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {natsInfo.is_connected ? 'Connected' : 'Disconnected'}
                        </span>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Server URL</dt>
                      <dd className="mt-1 text-sm text-gray-900">{natsInfo.connected_url}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Server ID</dt>
                      <dd className="mt-1 text-sm text-gray-900 font-mono">{natsInfo.server_info.server_id}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Server Name</dt>
                      <dd className="mt-1 text-sm text-gray-900">{natsInfo.server_info.server_name || 'N/A'}</dd>
                    </div>
                  </dl>
                )}
              </div>
            </div>

            {/* Connection Statistics */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Connection Statistics
                </h3>
                {natsInfo && (
                  <dl className="space-y-3">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Messages In</dt>
                      <dd className="mt-1 text-sm text-gray-900">{natsInfo.stats.in_msgs.toLocaleString()}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Messages Out</dt>
                      <dd className="mt-1 text-sm text-gray-900">{natsInfo.stats.out_msgs.toLocaleString()}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Bytes In</dt>
                      <dd className="mt-1 text-sm text-gray-900">{formatBytes(natsInfo.stats.in_bytes)}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Bytes Out</dt>
                      <dd className="mt-1 text-sm text-gray-900">{formatBytes(natsInfo.stats.out_bytes)}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Reconnects</dt>
                      <dd className="mt-1 text-sm text-gray-900">{natsInfo.stats.reconnects}</dd>
                    </div>
                  </dl>
                )}
              </div>
            </div>

            {/* Account Information */}
            {accountInfo && (
              <div className="bg-white overflow-hidden shadow rounded-lg md:col-span-2">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Account Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-2">Connection Stats</h4>
                      <dl className="space-y-2">
                        {Object.entries(accountInfo.stats).map(([key, value]) => (
                          <div key={key}>
                            <dt className="text-xs text-gray-400 capitalize">{key.replace(/_/g, ' ')}</dt>
                            <dd className="text-sm text-gray-900">
                              {typeof value === 'number' ? value.toLocaleString() : String(value)}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-2">Connection Limits</h4>
                      <dl className="space-y-2">
                        {Object.entries(accountInfo.connection_limits).map(([key, value]) => (
                          <div key={key}>
                            <dt className="text-xs text-gray-400 capitalize">{key.replace(/_/g, ' ')}</dt>
                            <dd className="text-sm text-gray-900">
                              {typeof value === 'number' ? value.toLocaleString() : String(value)}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="bg-white overflow-hidden shadow rounded-lg md:col-span-2">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Quick Actions
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Button variant="outline" className="h-20 flex flex-col items-center justify-center space-y-2">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    <span className="text-sm">Publish</span>
                  </Button>
                  <Button variant="outline" className="h-20 flex flex-col items-center justify-center space-y-2">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4.02 13.01c-.02 0-.02.01-.02.03v2.96c0 .55.45 1 1 1h8c.55 0 1-.45 1-1v-2.96c0-.02 0-.03-.02-.03H4.02z" />
                    </svg>
                    <span className="text-sm">Subscribe</span>
                  </Button>
                  <Button variant="outline" className="h-20 flex flex-col items-center justify-center space-y-2">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <span className="text-sm">Streams</span>
                  </Button>
                  <Button variant="outline" className="h-20 flex flex-col items-center justify-center space-y-2">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span className="text-sm">Key-Value</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}