# Frontend Integration Example

This document shows how to integrate with the new connection management features from the frontend.

## Connection Health Monitoring

You can monitor connection health using the new statistics endpoint:

```typescript
// Check connection statistics
async function getConnectionStats() {
  try {
    const response = await fetch('/api/nats/connection/stats', {
      credentials: 'include' // Include cookies
    });
    
    if (response.ok) {
      const stats = await response.json();
      console.log('Connection stats:', stats);
      
      // Example response:
      // {
      //   "connection_id": "uuid-string",
      //   "last_activity": "2024-01-01T12:00:00Z",
      //   "idle_timeout": "30m0s", 
      //   "time_remaining": "25m30s",
      //   "is_healthy": true,
      //   "is_connected": true
      // }
      
      return stats;
    }
  } catch (error) {
    console.error('Failed to get connection stats:', error);
  }
}
```

## Automatic Reconnection Handling

The frontend doesn't need to change existing API calls. Reconnection happens transparently:

```typescript
// Existing API calls work as before
async function listStreams() {
  try {
    const response = await fetch('/api/nats/streams', {
      credentials: 'include'
    });
    
    if (response.status === 503) {
      // Connection unavailable - show user-friendly message
      throw new Error('Connection to NATS server is unavailable');
    }
    
    if (response.ok) {
      return await response.json();
    }
    
    throw new Error('Failed to fetch streams');
  } catch (error) {
    // Handle errors as usual
    console.error('Error fetching streams:', error);
    throw error;
  }
}
```

## Connection Status in UI

You can add a connection status indicator:

```typescript
interface ConnectionStatus {
  connected: boolean;
  healthy: boolean;
  timeRemaining: string;
  lastActivity: string;
}

function ConnectionStatusComponent() {
  const [status, setStatus] = useState<ConnectionStatus | null>(null);

  useEffect(() => {
    // Poll connection status periodically
    const interval = setInterval(async () => {
      try {
        const stats = await getConnectionStats();
        if (stats) {
          setStatus({
            connected: stats.is_connected,
            healthy: stats.is_healthy,
            timeRemaining: stats.time_remaining,
            lastActivity: stats.last_activity
          });
        }
      } catch (error) {
        setStatus(null);
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  if (!status) {
    return <div className="connection-status disconnected">Disconnected</div>;
  }

  return (
    <div className={`connection-status ${status.healthy ? 'healthy' : 'unhealthy'}`}>
      <span>Connection: {status.connected ? 'Connected' : 'Disconnected'}</span>
      {status.timeRemaining && (
        <span>Auto-close in: {status.timeRemaining}</span>
      )}
    </div>
  );
}
```

## Error Handling for Reconnection

Handle reconnection failures gracefully:

```typescript
async function apiCall(endpoint: string, options: RequestInit = {}) {
  try {
    const response = await fetch(endpoint, {
      ...options,
      credentials: 'include'
    });

    // Check for reconnection failure header
    const connectionStatus = response.headers.get('X-Connection-Status');
    if (connectionStatus === 'reconnect-failed') {
      console.warn('Connection reconnect failed - may need manual reconnection');
    }

    if (response.status === 503) {
      // Service unavailable - connection issues
      throw new Error('NATS server connection is currently unavailable. Please try again later.');
    }

    if (response.status === 401) {
      // Unauthorized - connection expired or invalid
      throw new Error('Connection expired. Please reconnect to the NATS server.');
    }

    return response;
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
}
```

## Benefits for Frontend

1. **No Breaking Changes**: Existing code continues to work
2. **Improved Reliability**: Automatic reconnection reduces connection errors  
3. **Better UX**: Users don't need to manually reconnect in most cases
4. **Monitoring**: New endpoints provide connection visibility
5. **Resource Efficiency**: Connections are cleaned up automatically

## Migration Notes

- **No code changes required** for existing API calls
- **Optional**: Add connection status monitoring for better UX
- **Optional**: Handle new 503 status codes for better error messages
- **Optional**: Use connection statistics for debugging