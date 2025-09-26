# NATS Streams UI

This directory contains a comprehensive React-based user interface for managing NATS JetStream streams.

## Features

### 📊 Streams Overview
- **Dashboard View**: See all streams at a glance with key statistics
- **Real-time Stats**: Total streams, messages, consumers, and subjects
- **Search & Filter**: Find streams by name or subject patterns
- **Auto-refresh**: Automatic updates every 30 seconds

### 📋 Stream Management
- **Create Streams**: Full-featured stream creation with advanced configuration
- **View Details**: Comprehensive stream information including:
  - Configuration settings (storage, retention, limits)
  - Current state (message counts, sizes, sequences)
  - Subject listings with visual organization
  - Advanced options (direct access, TTL, compression)
- **Delete Streams**: Safe deletion with confirmation dialogs

### 🎨 User Interface
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Modern UI**: Clean, professional interface using Tailwind CSS
- **Interactive Components**: Hover effects, loading states, error handling
- **Accessibility**: Keyboard navigation and screen reader support

## Components

### Core Pages
- **StreamsPage**: Main streams management interface
  - Lists all streams with search functionality
  - Displays aggregate statistics
  - Handles stream operations (create, view, delete)

### UI Components
- **StreamCard**: Individual stream display card
  - Shows key metrics and configuration
  - Quick action buttons (view details, delete)
  - Visual indicators for storage type and retention policy

- **StreamDetailModal**: Comprehensive stream information
  - Full configuration display
  - Subject listings with organization
  - Advanced settings and state information
  - Responsive layout for different screen sizes

- **CreateStreamModal**: Stream creation interface
  - Form validation and error handling
  - Advanced configuration options
  - Help text and tooltips for complex settings

## API Integration

### Stream Operations
```typescript
// Get all streams
const streams = await streamsApi.getStreams();

// Get specific stream
const stream = await streamsApi.getStream('stream_name');

// Create new stream
const newStream = await streamsApi.createStream({
  name: 'my_stream',
  subjects: ['orders.*'],
  storage: 'file',
  retention: 'limits'
});

// Delete stream
await streamsApi.deleteStream('stream_name');
```

### Data Types
```typescript
interface Stream {
  config: StreamConfig;
  created: string;
  state: StreamState;
}

interface StreamConfig {
  name: string;
  subjects: string[];
  retention: 'limits' | 'interest' | 'workqueue';
  storage: 'file' | 'memory';
  // ... other configuration options
}
```

## Usage Examples

### Basic Stream Creation
```json
{
  "name": "orders_stream",
  "subjects": ["orders.*", "orders.created"],
  "storage": "file",
  "retention": "limits",
  "max_msgs": 100000,
  "max_bytes": 104857600
}
```

### Advanced Stream Configuration
```json
{
  "name": "metrics_stream",
  "subjects": ["metrics.cpu", "metrics.memory"],
  "storage": "memory",
  "retention": "workqueue",
  "max_age": 3600000000000,
  "num_replicas": 3,
  "allow_direct": false,
  "compression": "s2"
}
```

## UI Screenshots (Conceptual)

### Streams List View
- Grid layout showing multiple stream cards
- Search bar at the top
- Statistics overview cards
- Create stream button prominently displayed

### Stream Detail Modal
- Tabbed or sectioned layout showing:
  - Overview statistics
  - Complete subject listing
  - Configuration details
  - Advanced settings

### Create Stream Form
- Multi-step or sectioned form with:
  - Basic configuration (name, subjects)
  - Limits and constraints
  - Advanced options
  - Validation and help text

## Error Handling

The interface includes comprehensive error handling:
- **Connection Errors**: Clear messaging when backend is unavailable
- **Validation Errors**: Form-level validation with specific error messages  
- **Operation Errors**: User-friendly error messages for failed operations
- **Loading States**: Spinner and skeleton loading indicators

## Responsive Design

The interface adapts to different screen sizes:
- **Desktop**: Full-width cards with detailed information
- **Tablet**: Responsive grid layout with collapsed details
- **Mobile**: Stacked layout with simplified cards

## Performance

- **Efficient Queries**: Uses React Query for caching and background updates
- **Optimistic Updates**: Immediate UI feedback with background synchronization
- **Lazy Loading**: Components load only when needed
- **Debounced Search**: Efficient search with user input debouncing

## Future Enhancements

Potential future features:
- **Consumer Management**: View and manage stream consumers
- **Message Browser**: Browse and replay stream messages
- **Metrics Dashboard**: Advanced analytics and monitoring
- **Bulk Operations**: Multi-select for bulk stream operations
- **Export/Import**: Stream configuration backup and restore