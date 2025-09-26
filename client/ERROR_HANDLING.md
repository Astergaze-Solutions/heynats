# Enhanced Error Handling Documentation

## Detailed Error Messages

The application now provides comprehensive error information in toast notifications to help users understand and troubleshoot issues effectively.

## Error Information Displayed

### 1. HTTP Status Codes
- **HTTP 400**: Invalid request data
- **HTTP 401**: Authentication required
- **HTTP 403**: Insufficient permissions
- **HTTP 404**: Resource not found
- **HTTP 409**: Conflict (e.g., stream name already exists)
- **HTTP 422**: Validation failed
- **HTTP 500**: Internal server error
- **HTTP 502**: Bad gateway
- **HTTP 503**: Service unavailable
- **HTTP 504**: Gateway timeout

### 2. Validation Errors
- Field-specific validation messages
- Multiple validation errors grouped together
- Clear indication of what needs to be fixed

### 3. Network Errors
- Connection timeouts
- Network unavailable
- DNS resolution failures
- SSL/TLS certificate errors

### 4. Server Response Details
- Error codes from NATS server
- Detailed error descriptions
- Context-specific information

## Example Error Messages

### Stream Creation Errors
```
HTTP 409: Stream name already exists

Details: A stream with the name 'my-stream' already exists. 
Please choose a different name or delete the existing stream first.
```

### Connection Errors
```
Network Error: Unable to connect to server

Details: TypeError: Failed to fetch - 
The server might be down or unreachable.
```

### Validation Errors
```
Validation Error:

• name: Stream name cannot be empty
• subjects: At least one subject is required
• max_msgs: Must be a positive number or -1
```

## Toast Configuration
- **Position**: Top-right corner
- **Duration**: 4-8 seconds (longer for errors)
- **Features**: 
  - Line breaks preserved for detailed messages
  - Close button available
  - Rich colors for different message types
  - Expandable for long messages

## Benefits
1. **Faster Debugging**: Users can see exact error details
2. **Better UX**: Clear feedback on what went wrong
3. **Self-Service**: Users can often fix issues without support
4. **Professional**: Consistent, well-formatted error presentation