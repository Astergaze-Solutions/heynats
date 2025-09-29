# NATS Publishing Feature

This implementation provides a comprehensive UI for publishing messages to NATS subjects with the following capabilities:

## Features Implemented

### 1. Single Message Publishing
- **Subject input** with autocomplete suggestions from existing streams
- **Message data editor** (textarea) for JSON or plain text content
- **Custom headers** support with key-value pairs
- **Real-time validation** and error handling

### 2. Batch Message Publishing
- **Multiple messages** can be published at once
- **Individual subject and data** for each message
- **Bulk operations** with individual success/failure reporting
- **Dynamic message management** (add/remove messages)

### 3. Request-Reply Pattern
- **Request-response messaging** pattern support
- **Configurable timeout** (1-60 seconds)
- **Custom reply subject** (optional)
- **Headers support** for request messages
- **Response display** with formatted output

## Backend API Endpoints

### `/api/nats/publish/message` (POST)
Publishes a single message to a NATS subject.

**Request Body:**
```json
{
  "subject": "events.user.created",
  "data": "{\"user_id\": \"12345\", \"name\": \"John Doe\"}",
  "headers": {
    "Content-Type": "application/json",
    "X-Source": "web-ui"
  }
}
```

**Response:**
```json
{
  "success": true,
  "subject": "events.user.created"
}
```

### `/api/nats/publish/batch` (POST)
Publishes multiple messages in a single batch operation.

**Request Body:**
```json
{
  "messages": [
    {
      "subject": "events.user.created",
      "data": "{\"user_id\": \"12345\"}"
    },
    {
      "subject": "events.user.updated", 
      "data": "{\"user_id\": \"12345\", \"field\": \"email\"}"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "results": [
    {"success": true, "subject": "events.user.created"},
    {"success": true, "subject": "events.user.updated"}
  ],
  "total": 2,
  "succeeded": 2,
  "failed": 0
}
```

### `/api/nats/publish/request` (POST)
Sends a request and waits for a reply (request-reply pattern).

**Request Body:**
```json
{
  "subject": "api.user.get",
  "data": "{\"user_id\": \"12345\"}",
  "timeout": 10,
  "headers": {
    "Authorization": "Bearer token123"
  }
}
```

**Response:**
```json
{
  "success": true,
  "subject": "api.user.get",
  "reply_subject": "_INBOX.abc123",
  "request_data": "{\"user_id\": \"12345\"}",
  "reply_data": "{\"user\": {\"id\": \"12345\", \"name\": \"John Doe\"}}"
}
```

### `/api/nats/publish/subjects` (GET)
Returns available subjects for autocomplete suggestions.

**Response:**
```json
{
  "subjects": [
    "events.user.*",
    "events.order.*", 
    "logs.*",
    "metrics.*"
  ]
}
```

## UI Components

### 1. Single Message Tab
- Subject input with datalist for autocomplete
- Large textarea for message content
- Dynamic headers section (add/remove headers)
- Publish button with loading state
- Success/error feedback display

### 2. Batch Messages Tab  
- Multiple message cards
- Add/remove message functionality
- Bulk publish operation
- Detailed results showing per-message success/failure

### 3. Request-Reply Tab
- Request subject and data inputs
- Timeout configuration (1-60 seconds) 
- Optional reply subject override
- Headers support
- Response display with formatted JSON

## Key Implementation Details

### Frontend (TypeScript/React)
- **State Management**: Uses React hooks for form state
- **API Integration**: TanStack Query for server communication
- **UI Components**: Reusable components with consistent styling
- **Validation**: Real-time form validation and error handling
- **TypeScript**: Fully typed interfaces for all API operations

### Backend (Go)
- **API Structure**: Follows existing patterns (similar to KV and Stream APIs)
- **Error Handling**: Comprehensive error responses with details
- **NATS Integration**: Direct integration with NATS client
- **Headers Support**: Full NATS header functionality
- **Request-Reply**: Native NATS request-reply pattern implementation

## Usage Instructions

1. **Connect to NATS** server first using the connection page
2. **Navigate** to the Publish page from the sidebar
3. **Choose a tab** based on your use case:
   - Single Message: For one-off message publishing
   - Batch Messages: For publishing multiple messages at once
   - Request-Reply: For interactive request-response communication

### Single Message Example:
1. Enter subject: `events.user.login`
2. Enter data: `{"user_id": "123", "timestamp": "2024-01-01T10:00:00Z"}`
3. (Optional) Add headers like `{"X-Source": "web-ui"}`
4. Click "Publish Message"

### Batch Example:
1. Add multiple messages with different subjects
2. Fill in data for each message
3. Click "Publish Batch"
4. Review individual results

### Request-Reply Example:
1. Enter subject: `api.user.profile`
2. Enter request data: `{"user_id": "123"}`
3. Set timeout: `5` seconds
4. Click "Send Request"
5. View the response data

## Error Handling

- **Connection errors**: Handled with clear user feedback
- **Validation errors**: Real-time validation with helpful messages
- **NATS errors**: Server-side errors are displayed to the user
- **Timeout handling**: Request-reply timeouts are clearly indicated
- **Batch failures**: Individual message failures in batch operations are reported

This implementation provides a complete, production-ready NATS publishing interface with comprehensive error handling and user feedback.