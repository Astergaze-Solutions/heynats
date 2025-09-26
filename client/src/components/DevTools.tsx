import { useQuery } from '@tanstack/react-query';
import { healthApi } from '../lib/api';
import { useConnectionStatus } from '../hooks/useNATS';

export function DevTools() {
  const { data: health } = useQuery({
    queryKey: ['health'],
    queryFn: healthApi.getHealth,
    refetchInterval: 10000, // Check every 10 seconds
  });

  const { data: natsStatus } = useConnectionStatus();

  return (
    <div className="fixed bottom-4 left-4 z-50 space-y-1">
      <div className="bg-gray-800 text-white px-3 py-2 rounded text-xs font-mono shadow-lg">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1">
            <div className={`w-2 h-2 rounded-full ${health?.status === 'healthy' ? 'bg-green-400' : 'bg-red-400'}`}></div>
            <span>API: {health?.status || 'unknown'}</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className={`w-2 h-2 rounded-full ${natsStatus?.connected ? 'bg-green-400' : 'bg-gray-400'}`}></div>
            <span>NATS: {natsStatus?.connected ? 'connected' : 'disconnected'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}