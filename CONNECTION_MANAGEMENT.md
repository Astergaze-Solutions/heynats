# Connection Management Feature

This document describes the automatic connection management feature implemented in HeyNATS.

## Overview

The connection management system automatically handles NATS connections by:
1. **Activity Tracking**: Monitoring when connections are last used
2. **Idle Timeout**: Automatically closing connections after a period of inactivity
3. **Automatic Reconnection**: Reconnecting when the frontend sends new requests

## Configuration

### Default Settings
- **Idle Timeout**: 30 minutes (connections are closed after 30 minutes of inactivity)
- **Check Interval**: 5 minutes (system checks for idle connections every 5 minutes)

### Customizing Settings
You can customize the connection management settings by modifying the `NewNatsConnection()` call in `main.go`:

```go
// Custom configuration example
config := api.ConnectionStoreConfig{
    IdleTimeout:   15 * time.Minute, // Close after 15 minutes
    CheckInterval: 2 * time.Minute,  // Check every 2 minutes
}
natsConnections := api.NewNatsConnectionWithConfig(config)
```

## How It Works

### 1. Activity Tracking
- Every API request updates the `LastActivity` timestamp for the connection
- The middleware automatically handles this tracking
- No changes needed in existing API handlers

### 2. Idle Connection Cleanup
- A background goroutine runs every `checkInterval` minutes
- It checks all connections for inactivity exceeding `idleTimeout`
- Idle connections are gracefully closed and removed from the store

### 3. Automatic Reconnection
- When a request comes in for a closed/dead connection:
  - The system attempts to reconnect using stored credentials
  - If successful, the connection is restored transparently
  - If reconnection fails, appropriate error responses are returned

## API Endpoints

### Connection Statistics
**GET** `/api/nats/connection/stats`

Returns information about the current connection:
```json
{
  "connection_id": "uuid-string",
  "last_activity": "2024-01-01T12:00:00Z",
  "idle_timeout": "30m0s",
  "time_remaining": "25m30s",
  "is_healthy": true,
  "is_connected": true
}
```

### Existing Endpoints
All existing NATS endpoints continue to work as before, with automatic connection management happening transparently.

## Benefits

1. **Resource Efficiency**: Prevents accumulation of unused connections
2. **Automatic Recovery**: Seamless reconnection when needed
3. **Transparent Operation**: Existing frontend code requires no changes
4. **Configurable**: Timeout values can be adjusted based on usage patterns
5. **Monitoring**: Connection statistics available for debugging

## Implementation Details

### Connection Store Structure
```go
type ConnectionInfo struct {
    Connection   *pkg.NATSCredential
    LastActivity time.Time
    Config       *pkg.ConnectionRequest // For reconnection
}
```

### Key Methods
- `GetOrReconnect()`: Retrieves connection, reconnecting if necessary
- `UpdateActivity()`: Updates last activity timestamp
- `cleanupIdleConnections()`: Background cleanup process

### Connection Health Checks
The system uses enhanced health checking:
- Basic connectivity test
- Ping/flush timeout validation
- Connection state verification

## Monitoring and Debugging

### Logs
The system logs important connection events:
- Connection cleanups
- Reconnection attempts
- Health check failures

### Connection Statistics Endpoint
Use `/api/nats/connection/stats` to monitor:
- Connection health status
- Time until idle timeout
- Last activity timestamp

## Graceful Shutdown
The application handles graceful shutdown by:
1. Stopping the cleanup goroutine
2. Closing all active connections
3. Cleaning up resources properly