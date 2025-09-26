import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ConnectionForm } from '../components/ConnectionForm';
import { useConnectionStatus, useConnectToNATS } from '../hooks/useNATS';
import type { ConnectionCredentials } from '../lib/api';

export function LoginPage() {
  const navigate = useNavigate();
  const { data: status } = useConnectionStatus();
  const connectMutation = useConnectToNATS();

  // Redirect to dashboard if already connected
  useEffect(() => {
    if (status?.connected) {
      navigate('/dashboard', { replace: true });
    }
  }, [status?.connected, navigate]);

  const handleConnect = async (credentials: ConnectionCredentials) => {
    try {
      await connectMutation.mutateAsync(credentials);
      // Navigation will happen automatically via useEffect when status updates
    } catch (error) {
      // Error is already handled by the mutation and can be accessed via mutation state
      console.error('Connection failed:', error);
    }
  };

  return (
    <div>
      <ConnectionForm 
        onConnect={handleConnect} 
        isLoading={connectMutation.isPending} 
      />
      {connectMutation.error && (
        <div className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded max-w-md">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">
            {connectMutation.error.message || 'Failed to connect to NATS server'}
          </span>
        </div>
      )}
    </div>
  );
}