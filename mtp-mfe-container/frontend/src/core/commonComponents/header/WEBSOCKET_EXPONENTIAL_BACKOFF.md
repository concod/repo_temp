# WebSocket Exponential Backoff Reconnection Strategy

## Overview

This document explains the exponential backoff reconnection strategy implemented for WebSocket connections in the Header component. This feature prevents server overload by implementing intelligent retry logic when WebSocket connections fail or remain in a pending state.

## Problem Statement

### Previous Behavior

Previously, when a WebSocket connection failed or was in a pending state, the system would immediately attempt to reconnect without any delay. This caused:

- **Rapid retry storms**: Continuous connection attempts overwhelming the server
- **Server overload**: Excessive load during network issues or server downtime
- **Poor user experience**: High CPU usage and potential browser freezing
- **Resource waste**: Unnecessary network traffic and server processing

### Example of the Problem

```
Connection fails → onclose fires → createWebSocket() called immediately
Connection fails again → onclose fires → createWebSocket() called immediately
Connection fails again → onclose fires → createWebSocket() called immediately
... (infinite loop with no delay)
```

## Solution: Exponential Backoff

The exponential backoff strategy introduces increasing delays between reconnection attempts, following industry best practices for resilient network connections.

### How It Works

1. **Initial Delay**: First retry happens after 1 second
2. **Exponential Growth**: Each subsequent retry doubles the delay
3. **Maximum Cap**: Delays are capped at 60 seconds (1 minute)
4. **Jitter**: Random variation (±1 second) prevents synchronized retries
5. **Max Retries**: Stops after 10 attempts and notifies the user

### Delay Sequence Example

| Attempt # | Base Delay | With Jitter | Total Delay Range |
|-----------|------------|-------------|-------------------|
| 1         | 1s         | ±0.5s       | 0.5s - 1.5s      |
| 2         | 2s         | ±0.5s       | 1.5s - 2.5s      |
| 3         | 4s         | ±0.5s       | 3.5s - 4.5s      |
| 4         | 8s         | ±0.5s       | 7.5s - 8.5s      |
| 5         | 16s        | ±0.5s       | 15.5s - 16.5s    |
| 6         | 32s        | ±0.5s       | 31.5s - 32.5s    |
| 7+        | 60s (cap)  | ±0.5s       | 59.5s - 60.5s    |

## Architecture

### Key Components

#### 1. Reconnection State Management

```javascript
const reconnectAttemptsRef = useRef(0);        // Tracks retry count
const reconnectTimeoutRef = useRef(null);      // Stores timeout ID
const connectionTimeoutRef = useRef(null);      // Connection attempt timeout
const isConnectingRef = useRef(false);         // Prevents concurrent attempts
```

#### 2. Configuration Constants

```javascript
const INITIAL_DELAY_MS = 1000;        // 1 second initial delay
const MAX_DELAY_MS = 60000;          // 60 seconds maximum delay
const MAX_RETRIES = 10;              // Maximum retry attempts
const CONNECTION_TIMEOUT_MS = 10000;  // 10 seconds for pending connections
const JITTER_MS = 1000;              // ±1 second random jitter
```

### Core Functions

#### `calculateBackoffDelay()`

Calculates the delay for the next reconnection attempt using exponential backoff with jitter.

**Formula:**
```
exponentialDelay = min(INITIAL_DELAY_MS × 2^attempts, MAX_DELAY_MS)
jitter = random(-JITTER_MS/2, +JITTER_MS/2)
finalDelay = max(0, exponentialDelay + jitter)
```

**Purpose:**
- Prevents synchronized retries across multiple clients (thundering herd problem)
- Ensures delays increase exponentially
- Caps maximum delay to prevent excessive wait times

#### `scheduleReconnect()`

Schedules the next reconnection attempt with exponential backoff.

**Flow:**
1. Checks if tab is master and not already connecting
2. Validates retry count hasn't exceeded maximum
3. Calculates delay using exponential backoff
4. Increments retry counter
5. Schedules reconnection after calculated delay
6. Shows error notification if max retries reached

#### `createWebSocket()`

Enhanced WebSocket creation with timeout handling and error management.

**New Features:**
- Prevents concurrent connection attempts
- Closes existing connections before creating new ones
- Sets connection timeout for pending states
- Handles errors gracefully
- Resets retry counter on successful connection

## Implementation Details

### Connection Lifecycle

```
1. createWebSocket() called
   ↓
2. Check if already connecting → Exit if yes
   ↓
3. Close existing connection if any
   ↓
4. Set isConnectingRef = true
   ↓
5. Create new WebSocket instance
   ↓
6. Set connection timeout (10 seconds)
   ↓
7. Wait for connection...
   ↓
   ├─→ onopen: Success
   │   ├─ Clear timeouts
   │   ├─ Reset retry counter
   │   └─ Store socket reference
   │
   ├─→ onerror: Error occurred
   │   ├─ Clear connection timeout
   │   └─ onclose will handle retry
   │
   └─→ onclose: Connection closed
       ├─ Check if clean close (code 1000/1001) → Don't retry
       ├─ Check if master tab → scheduleReconnect()
       └─ Otherwise → No action
```

### Pending Connection Handling

If a connection remains in "connecting" state for more than 10 seconds:

```javascript
connectionTimeoutRef.current = setTimeout(() => {
  if (newSocket.readyState !== 1) {  // Not OPEN
    newSocket.close();  // Force close to trigger onclose
  }
}, CONNECTION_TIMEOUT_MS);
```

This ensures pending connections don't hang indefinitely and trigger the retry mechanism.

### Clean Close Detection

The system distinguishes between different close codes:

- **Code 1000 (Normal Closure)**: Intentional close, no retry
- **Code 1001 (Going Away)**: Server/network going away, no retry
- **Other codes**: Unexpected closure, retry with backoff

```javascript
if (event.code === 1000 || event.code === 1001) {
  console.log("WebSocket: Clean close, not reconnecting");
  reconnectAttemptsRef.current = 0;
  return;
}
```

## Master-Slave Architecture Preservation

**Important**: The exponential backoff implementation fully preserves the master-slave architecture.

### Master Tab Responsibilities

- Only master tab creates WebSocket connection
- Only master tab handles reconnection logic
- Master tab broadcasts received data to all tabs

### Slave Tab Behavior

- Slave tabs never create WebSocket connections
- Slave tabs communicate through BroadcastChannel
- Slave tabs receive updates via BroadcastChannel

### Verification Points

1. **Reconnection Guard**: `scheduleReconnect()` checks `isMasterRef.current`
2. **onclose Handler**: Only reconnects if `isMasterRef.current === true`
3. **Master Transfer**: New master resets retry counter and creates connection
4. **Slave Cleanup**: Non-master tabs properly clean up without reconnecting

## Configuration

### Adjusting Backoff Parameters

To modify the backoff behavior, update these constants in `index.js`:

```javascript
const INITIAL_DELAY_MS = 1000;        // Start with 1 second
const MAX_DELAY_MS = 60000;          // Cap at 60 seconds
const MAX_RETRIES = 10;              // Stop after 10 attempts
const CONNECTION_TIMEOUT_MS = 10000; // 10 second timeout
const JITTER_MS = 1000;              // ±1 second jitter
```

### Recommended Values

| Use Case | Initial Delay | Max Delay | Max Retries | Notes |
|----------|---------------|-----------|-------------|-------|
| **Standard** | 1s | 60s | 10 | Current implementation |
| **Aggressive** | 500ms | 30s | 15 | Faster recovery, more server load |
| **Conservative** | 2s | 120s | 5 | Slower recovery, less server load |
| **High Traffic** | 2s | 60s | 8 | Balanced for high-load scenarios |

## Error Handling

### Maximum Retries Reached

When `MAX_RETRIES` is reached:

1. Reconnection attempts stop
2. Error logged to console
3. User notification displayed via snackbar
4. User can manually refresh the page

```javascript
if (reconnectAttemptsRef.current >= MAX_RETRIES) {
  console.error("Maximum reconnection attempts reached");
  dispatch(addSnack({
    message: "WebSocket connection failed after multiple attempts. Please refresh the page.",
    options: { variant: "error" }
  }));
  return;
}
```

### Connection Errors

Errors during connection creation are caught and handled:

```javascript
catch (error) {
  console.error("WebSocket: Error creating connection", error);
  clearConnectionTimeout();
  isConnectingRef.current = false;
  
  if (isMasterRef.current) {
    scheduleReconnect();  // Schedule retry with backoff
  }
}
```

## Cleanup and Resource Management

### Component Unmount

When the component unmounts or master changes:

```javascript
const updateSocketConnetcions = () => {
  clearReconnectTimeout();      // Cancel pending reconnection
  clearConnectionTimeout();    // Cancel connection timeout
  isConnectingRef.current = false;
  // ... other cleanup
  reconnectAttemptsRef.current = 0;  // Reset counter
};
```

### Master Tab Change

When a new master is elected:

1. Old master stops reconnection attempts
2. Cleans up WebSocket connection
3. Resets retry counter
4. New master starts fresh (counter = 0)

## Testing Scenarios

### Scenario 1: Temporary Network Issue

```
Time 0s:  Connection fails
Time 1s:  Retry attempt #1 (fails)
Time 3s:  Retry attempt #2 (fails)
Time 7s:  Retry attempt #3 (fails)
Time 15s: Retry attempt #4 (succeeds)
Result: Connection restored after 15 seconds
```

### Scenario 2: Server Down

```
Time 0s:   Connection fails
Time 1s:   Retry #1 (fails)
Time 3s:   Retry #2 (fails)
Time 7s:   Retry #3 (fails)
Time 15s:  Retry #4 (fails)
Time 31s:  Retry #5 (fails)
Time 63s:  Retry #6 (fails)
Time 123s: Retry #7 (fails)
... (continues until MAX_RETRIES)
Time ~10min: Max retries reached, user notified
```

### Scenario 3: Pending Connection

```
Time 0s:   Connection attempt starts
Time 10s:  Connection still pending → Timeout triggered
Time 10s:  Connection closed, onclose fires
Time 11s:  Retry attempt #1 scheduled
```

## Benefits

1. **Reduced Server Load**: Exponential delays prevent retry storms
2. **Better Resource Usage**: Less CPU and network bandwidth consumption
3. **Improved User Experience**: No browser freezing or excessive resource usage
4. **Industry Standard**: Follows best practices used by major platforms
5. **Configurable**: Easy to adjust parameters based on needs
6. **Resilient**: Handles various failure scenarios gracefully

## Monitoring and Debugging

### Console Logs

The implementation includes helpful console logs:

- `"WebSocket: Connection established successfully"` - Successful connection
- `"WebSocket: Scheduling reconnection attempt #X in Yms"` - Retry scheduled
- `"WebSocket: Connection attempt timed out"` - Pending connection timeout
- `"WebSocket: Maximum reconnection attempts reached"` - Max retries exceeded
- `"WebSocket: Clean close, not reconnecting"` - Intentional close

### Network Tab Monitoring

In browser DevTools Network tab:
- Filter by "WS" (WebSocket)
- Observe connection attempts with increasing delays
- Check connection status (Pending, 101 Switching Protocols, etc.)

## Future Enhancements

Potential improvements for future consideration:

1. **Adaptive Backoff**: Adjust based on server response times
2. **Health Check Endpoint**: Verify server availability before retrying
3. **User Preference**: Allow users to manually trigger reconnection
4. **Metrics Collection**: Track reconnection success rates
5. **Progressive Backoff**: Different strategies for different error types

## References

- [WebSocket API Specification](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [Exponential Backoff Best Practices](https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/)
- [WebSocket Reconnection Strategies](https://docs.accelbyte.io/gaming-services/knowledge-base/sdk-tools/sdk-guides/websocket-reconnection-strategy/)

## Related Files

- `frontend/src/core/commonComponents/header/index.js` - Main implementation
- `frontend/src/core/broadcastChannelContext/index.jsx` - BroadcastChannel setup
- `frontend/src/config/api/index.js` - WebSocket URL configuration

---

**Last Updated**: January 2025  
**Version**: 1.0  
**Author**: Development Team

