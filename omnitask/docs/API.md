# OmniTask API Documentation

## Overview

OmniTask provides a comprehensive REST API for executing natural language commands, monitoring performance, and managing security. All endpoints return JSON responses and include proper error handling.

## Base URL

```
http://localhost:3000/api
```

## Authentication

Currently, OmniTask operates in local-first mode without authentication. Future versions may include API key authentication for remote access.

## Command Execution API

### Execute Command

Execute a natural language command through the OmniTask engine.

**Endpoint**: `POST /api/commands/execute`

**Request Body**:
```json
{
  "command": "search for laptops under $1000",
  "options": {
    "dryRun": false,
    "priority": "normal",
    "timeout": 30000
  }
}
```

**Parameters**:
- `command` (string, required): Natural language command to execute
- `options.dryRun` (boolean, optional): If true, validates command without executing
- `options.priority` (string, optional): Task priority - "low", "normal", "high"
- `options.timeout` (number, optional): Execution timeout in milliseconds

**Response**:
```json
{
  "success": true,
  "taskId": "task-1703123456789-abc123",
  "status": "queued",
  "parsedCommand": {
    "type": "web",
    "category": "shopping",
    "action": "search",
    "parameters": {
      "searchTerm": "laptops",
      "maxPrice": 1000
    },
    "confidence": 0.95
  },
  "estimatedDuration": 15000
}
```

### Get Task Status

Check the status of an executing or completed task.

**Endpoint**: `GET /api/commands/status/{taskId}`

**Response**:
```json
{
  "success": true,
  "task": {
    "id": "task-1703123456789-abc123",
    "status": "completed",
    "progress": 100,
    "result": {
      "type": "search_results",
      "data": [
        {
          "title": "Dell Laptop - $899",
          "price": 899,
          "url": "https://example.com/laptop1"
        }
      ]
    },
    "executionTime": 12500,
    "createdAt": "2023-12-21T10:30:45.123Z",
    "completedAt": "2023-12-21T10:30:57.623Z"
  }
}
```

### List Tasks

Get a list of recent tasks with optional filtering.

**Endpoint**: `GET /api/commands/tasks`

**Query Parameters**:
- `status` (string, optional): Filter by status - "queued", "running", "completed", "failed"
- `type` (string, optional): Filter by type - "web", "desktop"
- `limit` (number, optional): Maximum number of tasks to return (default: 50)
- `offset` (number, optional): Number of tasks to skip (default: 0)

**Response**:
```json
{
  "success": true,
  "tasks": [
    {
      "id": "task-1703123456789-abc123",
      "command": "search for laptops under $1000",
      "status": "completed",
      "type": "web",
      "createdAt": "2023-12-21T10:30:45.123Z"
    }
  ],
  "total": 42,
  "hasMore": true
}
```

## Performance Monitoring API

### Get Performance Report

Retrieve comprehensive performance metrics and recommendations.

**Endpoint**: `GET /api/performance?action=report`

**Response**:
```json
{
  "success": true,
  "data": {
    "current": {
      "timestamp": 1703123456789,
      "commandParsing": {
        "cacheHitRate": 0.85,
        "avgParsingTime": 0.8,
        "totalCommands": 1250,
        "cacheSize": 450
      },
      "memory": {
        "heapUsed": 125.6,
        "heapTotal": 256.0,
        "external": 45.2,
        "rss": 180.4,
        "taskQueueSize": 3
      },
      "browser": {
        "browsers": 2,
        "contexts": 4,
        "pages": 7,
        "activePages": 2
      }
    },
    "trends": {
      "memory": {
        "values": [120.5, 125.6, 130.2],
        "trend": "up",
        "avgValue": 125.4
      }
    },
    "alerts": [
      {
        "level": "warning",
        "metric": "memory.heapUsed",
        "message": "Memory usage trending upward",
        "timestamp": 1703123456789
      }
    ],
    "recommendations": [
      "Consider increasing task cleanup frequency",
      "Monitor memory usage trends"
    ]
  }
}
```

### Get Real-time Metrics

Get current performance metrics without historical data.

**Endpoint**: `GET /api/performance?action=metrics`

### Get Performance Alerts

Retrieve current performance alerts with optional filtering.

**Endpoint**: `GET /api/performance?action=alerts&level=warning`

**Query Parameters**:
- `level` (string, optional): Filter by alert level - "warning", "error", "critical"

### Get Cache Statistics

Retrieve command parsing cache performance data.

**Endpoint**: `GET /api/performance?action=cache-stats`

**Response**:
```json
{
  "success": true,
  "data": {
    "size": 450,
    "maxSize": 1000,
    "hitRate": 0.85,
    "entries": [
      {
        "command": "search for laptops",
        "hitCount": 12,
        "lastAccessed": 1703123456789
      }
    ]
  }
}
```

### Export Performance Data

Export performance data in CSV format for analysis.

**Endpoint**: `GET /api/performance?action=report&format=csv`

**Response**: CSV file download with performance metrics

## Performance Management API

### Clear Command Cache

Clear the command parsing cache to force fresh parsing.

**Endpoint**: `POST /api/performance`

**Request Body**:
```json
{
  "action": "clear-cache"
}
```

### Force Memory Cleanup

Trigger immediate memory cleanup and garbage collection.

**Endpoint**: `POST /api/performance`

**Request Body**:
```json
{
  "action": "force-cleanup"
}
```

### Clear Old Alerts

Remove alerts older than specified age.

**Endpoint**: `POST /api/performance`

**Request Body**:
```json
{
  "action": "clear-alerts",
  "maxAge": 3600000
}
```

## Security API

### Get Security Status

Retrieve current security status and threat assessment.

**Endpoint**: `GET /api/security/status`

**Response**:
```json
{
  "success": true,
  "status": {
    "threatLevel": "low",
    "activeThreats": 0,
    "recentBlocks": 2,
    "lastScan": "2023-12-21T10:30:45.123Z",
    "validationRules": {
      "enabled": true,
      "strictMode": false,
      "patterns": 47
    }
  }
}
```

### Get Audit Log

Retrieve security audit log with optional filtering.

**Endpoint**: `GET /api/security/audit-log`

**Query Parameters**:
- `level` (string, optional): Filter by level - "info", "warning", "error"
- `limit` (number, optional): Maximum entries to return
- `since` (string, optional): ISO timestamp to filter from

**Response**:
```json
{
  "success": true,
  "entries": [
    {
      "timestamp": "2023-12-21T10:30:45.123Z",
      "level": "warning",
      "event": "suspicious_command",
      "command": "delete system files",
      "action": "blocked",
      "details": {
        "reason": "potentially_dangerous",
        "pattern": "file_deletion"
      }
    }
  ],
  "total": 156
}
```

### Update Security Settings

Modify security validation settings.

**Endpoint**: `POST /api/security/settings`

**Request Body**:
```json
{
  "strictMode": true,
  "allowedDomains": ["example.com", "trusted-site.org"],
  "blockedPatterns": ["rm -rf", "format c:"],
  "maxExecutionTime": 60000
}
```

## Error Handling

All API endpoints follow consistent error response format:

```json
{
  "success": false,
  "error": "Invalid command syntax",
  "code": "INVALID_COMMAND",
  "details": {
    "command": "invalid syntax here",
    "position": 15,
    "suggestion": "Try: 'search for products on Amazon'"
  },
  "timestamp": "2023-12-21T10:30:45.123Z"
}
```

### Common Error Codes

- `INVALID_COMMAND`: Command syntax or content is invalid
- `EXECUTION_TIMEOUT`: Task exceeded maximum execution time
- `RATE_LIMITED`: Too many requests in time window
- `SECURITY_VIOLATION`: Command blocked by security rules
- `RESOURCE_EXHAUSTED`: System resources unavailable
- `BROWSER_ERROR`: Browser automation failure
- `SYSTEM_ERROR`: macOS automation failure

## Rate Limiting

API endpoints are rate limited to prevent abuse:

- Command execution: 60 requests/minute
- Performance monitoring: 120 requests/minute
- Security endpoints: 30 requests/minute

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1703123516
```

## WebSocket API (Future)

Real-time updates will be available via WebSocket connection:

```javascript
const ws = new WebSocket('ws://localhost:3000/api/ws');

ws.on('message', (data) => {
  const event = JSON.parse(data);
  console.log('Real-time update:', event);
});
```

Event types:
- `task_status_update`: Task progress updates
- `performance_alert`: Performance threshold exceeded
- `security_event`: Security-related notifications

## SDK Usage Examples

### JavaScript/Node.js

```javascript
const omniTask = new OmniTaskClient('http://localhost:3000/api');

// Execute command
const result = await omniTask.execute('search for laptops under $1000');

// Monitor task
const task = await omniTask.getTask(result.taskId);

// Get performance metrics
const metrics = await omniTask.getPerformance();
```

### Python

```python
import requests

# Execute command
response = requests.post('http://localhost:3000/api/commands/execute', 
  json={'command': 'search for laptops under $1000'})

result = response.json()
print(f"Task ID: {result['taskId']}")
```

### cURL

```bash
# Execute command
curl -X POST http://localhost:3000/api/commands/execute \
  -H "Content-Type: application/json" \
  -d '{"command": "search for laptops under $1000"}'

# Get performance report
curl http://localhost:3000/api/performance?action=report
```