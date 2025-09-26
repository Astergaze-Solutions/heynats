import { useState, useEffect } from "react";
import { ConnectionForm, type ConnectionCredentials } from "./components/ConnectionForm";
import { Dashboard } from "./components/Dashboard";

interface ConnectionStatus {
  connected: boolean;
  host?: string;
  port?: string;
  username?: string;
}

function App() {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({ connected: false });
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check connection status on app load
  useEffect(() => {
    checkConnectionStatus();
  }, []);

  const checkConnectionStatus = async () => {
    try {
      const response = await fetch('/api/nats/status');
      if (response.ok) {
        const status = await response.json();
        setConnectionStatus(status);
      }
    } catch (error) {
      console.error('Error checking connection status:', error);
    }
  };

  const handleConnect = async (credentials: ConnectionCredentials) => {
    setIsConnecting(true);
    setError(null);

    try {
      const response = await fetch('/api/nats/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (response.ok) {
        setConnectionStatus({
          connected: true,
          host: credentials.host,
          port: credentials.port,
          username: credentials.username,
        });
        setError(null);
      } else {
        setError(data.error || 'Failed to connect to NATS server');
      }
    } catch (error) {
      setError('Network error. Please check if the server is running.');
      console.error('Connection error:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await fetch('/api/nats/disconnect', { method: 'POST' });
    } catch (error) {
      console.error('Error during disconnect:', error);
    } finally {
      setConnectionStatus({ connected: false });
      setError(null);
    }
  };

  // Show connection form if not connected
  if (!connectionStatus.connected) {
    return (
      <div>
        <ConnectionForm 
          onConnect={handleConnect} 
          isLoading={isConnecting} 
        />
        {error && (
          <div className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded max-w-md">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{error}</span>
          </div>
        )}
      </div>
    );
  }

  // Show dashboard if connected
  return <Dashboard onDisconnect={handleDisconnect} />;
}

export default App;
