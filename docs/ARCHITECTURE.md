# HeyNATS - Modern React Router v7 + TanStack Query Architecture

This document outlines the new architecture using React Router v7 and TanStack React Query for improved state management and routing.

## 🏗️ Architecture Overview

### Frontend Stack
- **React 19** - Latest React with improved performance
- **TypeScript** - Type safety and better DX
- **React Router v7** - Modern routing with loader patterns
- **TanStack React Query** - Server state management
- **TailwindCSS 4** - Utility-first CSS framework
- **Vite** - Fast build tool and dev server

### Backend Stack
- **Go** - High-performance backend
- **Gin** - Web framework
- **NATS Go Client** - NATS server integration

## 📁 Project Structure

```
src/
├── components/           # Reusable UI components
│   ├── ui/              # Base UI components (shadcn/ui)
│   ├── layouts/         # Layout components
│   ├── ConnectionForm.tsx
│   ├── ProtectedRoute.tsx
│   ├── ErrorBoundary.tsx
│   └── DevTools.tsx
├── pages/               # Page components
│   ├── LoginPage.tsx
│   └── DashboardPage.tsx
├── hooks/               # Custom React hooks
│   └── useNATS.ts       # NATS-related hooks
├── lib/                 # Utility libraries
│   ├── api.ts           # API client functions
│   └── utils.ts         # General utilities
├── providers/           # Context providers
│   └── QueryProvider.tsx
├── router/              # Router configuration
│   └── index.tsx
├── App.tsx              # Root App component
└── main.tsx             # Application entry point
```

## 🔄 State Management with TanStack Query

### Query Keys
All queries use structured query keys for better cache management:

```typescript
export const queryKeys = {
  nats: {
    all: ['nats'] as const,
    status: () => [...queryKeys.nats.all, 'status'] as const,
    info: () => [...queryKeys.nats.all, 'info'] as const,
    account: () => [...queryKeys.nats.all, 'account'] as const,
  },
};
```

### Custom Hooks

#### `useConnectionStatus()`
- Checks NATS connection status
- Auto-refreshes every 5 seconds
- Used for route protection

#### `useNATSInfo(enabled)`
- Fetches NATS server information
- Only runs when connected
- Auto-refreshes every 5 seconds

#### `useAccountInfo(enabled)`
- Fetches account information
- Only runs when connected
- Auto-refreshes every 5 seconds

#### `useConnectToNATS()`
- Mutation for connecting to NATS
- Automatically invalidates related queries on success
- Handles connection errors

#### `useDisconnectFromNATS()`
- Mutation for disconnecting from NATS
- Updates cache immediately
- Handles cleanup

## 🛣️ Routing with React Router v7

### Route Structure
```
/ (RootLayout)
├── / (LoginPage) - Connection form
└── /dashboard (DashboardPage) - Protected dashboard
```

### Protection Pattern
Routes are protected using the `ProtectedRoute` component:

```typescript
{
  path: 'dashboard',
  element: (
    <ProtectedRoute>
      <DashboardPage />
    </ProtectedRoute>
  ),
}
```

### Navigation Flow
1. User starts at `/` (LoginPage)
2. On successful connection, redirects to `/dashboard`
3. Dashboard is protected - redirects to `/` if not connected
4. On disconnect, returns to `/`

## 🔌 API Integration

### Type-Safe API Client
All API calls are type-safe with proper error handling:

```typescript
// Connection with credentials
const result = await natsApi.connect(credentials);

// Get server info
const info = await natsApi.getInfo();

// Check status
const status = await natsApi.getStatus();
```

### Error Handling
- Custom `ApiError` class for structured error handling
- Automatic retry logic for transient errors
- No retry for 4xx client errors
- React Query error boundaries

## 🔄 Data Flow

1. **Authentication Flow**
   ```
   LoginPage → useConnectToNATS → API → Success → Navigate to Dashboard
   ```

2. **Dashboard Data Flow**
   ```
   DashboardPage → useNATSInfo/useAccountInfo → Auto-refresh every 5s
   ```

3. **Disconnection Flow**
   ```
   Dashboard → useDisconnectFromNATS → API → Navigate to Login
   ```

## 🎯 Benefits of New Architecture

### React Router v7
- **Modern routing patterns** with better type safety
- **Automatic code splitting** for better performance
- **Error boundaries** for graceful error handling
- **Protected routes** with clean patterns

### TanStack React Query
- **Automatic background refetching** keeps data fresh
- **Intelligent caching** reduces unnecessary API calls
- **Optimistic updates** for better UX
- **Loading and error states** handled automatically
- **DevTools integration** for debugging

### Type Safety
- **End-to-end TypeScript** from API to UI
- **Structured error handling** with proper types
- **IntelliSense support** throughout the codebase

## 🚀 Development Workflow

1. **Start NATS Server**
   ```bash
   docker-compose up -d nats
   ```

2. **Start Backend**
   ```bash
   go run .
   ```

3. **Start Frontend**
   ```bash
   cd client && pnpm run dev
   ```

4. **Access Application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:5000/api
   - React Query DevTools: Available in development

## 🔧 Key Features

- **Real-time updates** with automatic polling
- **Offline-first** with intelligent caching
- **Type-safe** API calls and responses
- **Error boundaries** for graceful error handling
- **Loading states** handled automatically
- **Optimistic updates** for mutations
- **Development tools** for debugging

## 📈 Performance Optimizations

- **Query deduplication** - Multiple components requesting same data share a single request
- **Background refetching** - Data stays fresh without user intervention
- **Intelligent retries** - Automatic retry for network errors, no retry for client errors
- **Cache invalidation** - Proper cache management for data consistency
- **Code splitting** - Routes loaded on demand

This architecture provides a solid foundation for building complex NATS management features with excellent developer experience and user performance.