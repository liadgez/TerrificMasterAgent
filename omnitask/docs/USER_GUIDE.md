# OmniTask User Guide

## Table of Contents

1. [Getting Started](#getting-started)
2. [Understanding Commands](#understanding-commands)
3. [Web Automation](#web-automation)
4. [Desktop Automation](#desktop-automation)
5. [Performance Monitoring](#performance-monitoring)
6. [Security Features](#security-features)
7. [Advanced Usage](#advanced-usage)
8. [Troubleshooting](#troubleshooting)

## Getting Started

### First Steps

After installation, follow these steps to get familiar with OmniTask:

1. **Launch the application**:
   ```bash
   npm run dev
   ```
   Navigate to http://localhost:3000

2. **Try your first command**:
   Type: `"search google for today's weather"`
   
3. **Monitor execution**:
   Watch the task status update in real-time

4. **View results**:
   See the extracted information displayed in the interface

### Interface Overview

The OmniTask interface consists of:

- **Command Input**: Natural language text input
- **Task Status**: Real-time execution progress
- **Results Panel**: Command outputs and data
- **Performance Dashboard**: System metrics and alerts
- **History**: Previous commands and results

## Understanding Commands

### Command Structure

OmniTask understands natural language commands with these patterns:

**Action + Target + Parameters**
- "Search for laptops under $1000"
- "Open Spotify and play jazz music"
- "Create a folder called Projects on Desktop"

### Command Types

#### Web Commands
- Shopping and product searches
- Form filling and submissions
- Data extraction and web scraping
- Social media interactions
- Research and information gathering

#### Desktop Commands
- Application control
- File and folder operations
- System settings modifications
- Notification management
- Process automation

### Command Confidence

OmniTask assigns confidence scores to parsed commands:
- **0.9-1.0**: High confidence - executes immediately
- **0.7-0.9**: Medium confidence - may request confirmation
- **0.5-0.7**: Low confidence - requires user verification
- **0.0-0.5**: Very low confidence - suggests alternatives

## Web Automation

### Shopping Commands

OmniTask can automate online shopping across multiple platforms:

#### Amazon Shopping
```
"Search for wireless headphones under $200 on Amazon"
"Find the best rated laptop deals on Amazon"
"Look for iPhone cases with 4+ star ratings"
```

**Features**:
- Price filtering and comparison
- Rating-based filtering
- Multi-page result aggregation
- Product detail extraction

#### General Shopping
```
"Compare laptop prices across shopping sites"
"Find deals on iPad Pro"
"Search for running shoes size 10"
```

### Form Automation

Automate form filling on websites:

```
"Fill out the contact form on example.com with my details"
"Submit a job application form on company-website.com"
"Complete the survey on feedback-site.org"
```

**Supported Fields**:
- Text inputs (name, email, address)
- Dropdown selections
- Checkboxes and radio buttons
- File uploads
- Date pickers

### Data Extraction

Extract information from websites:

```
"Get the latest news headlines from CNN"
"Extract product reviews from this page"
"Scrape contact information from company website"
```

**Data Types**:
- News articles and headlines
- Product information and reviews
- Contact details and business info
- Social media posts and metrics
- Financial data and stock prices

### Browser Management

OmniTask automatically manages browsers for optimal performance:

- **Multi-browser support**: Chromium, Firefox, WebKit
- **Context isolation**: Separate browsing contexts for security
- **Resource pooling**: Efficient browser instance reuse
- **Automatic cleanup**: Idle browser termination

## Desktop Automation

### Application Control

Control macOS applications with natural language:

#### Music and Media
```
"Open Spotify and play my workout playlist"
"Pause the current song"
"Skip to the next track"
"Set volume to 50%"
```

#### Productivity Apps
```
"Open VSCode and create a new TypeScript file"
"Launch Chrome and open Gmail"
"Open Terminal and run npm test"
```

#### System Apps
```
"Open Finder and navigate to Downloads"
"Launch System Preferences"
"Open Calculator"
```

### File Operations

Manage files and folders through commands:

#### File Management
```
"Create a new folder called Projects on Desktop"
"Move all PDF files from Downloads to Documents"
"Delete empty folders in Downloads"
"Organize photos by date in Pictures folder"
```

#### File Creation
```
"Create a new text file called notes.txt on Desktop"
"Make a backup of the Documents folder"
"Create a project structure for a React app"
```

### System Control

Control macOS system functions:

#### Power Management
```
"Lock my computer"
"Put the computer to sleep in 10 minutes"
"Restart the system"
"Set energy saver to better performance"
```

#### Display and Audio
```
"Set brightness to 75%"
"Increase volume by 20%"
"Mute all audio"
"Switch to dark mode"
```

#### Notifications
```
"Show me a notification in 30 minutes to take a break"
"Display a reminder to drink water every hour"
"Notify me when this download completes"
```

### Security Considerations

Desktop automation includes safety features:

- **Sandboxed execution**: Commands run in isolated environment
- **User confirmation**: Dangerous operations require approval
- **Path validation**: File operations limited to user directories
- **Command filtering**: Malicious patterns automatically blocked

## Performance Monitoring

### Real-time Metrics

Monitor OmniTask performance through the dashboard:

#### Command Parsing
- Cache hit rate and efficiency
- Average parsing time
- Command confidence distribution
- Popular command patterns

#### Memory Usage
- Heap memory consumption
- Garbage collection frequency
- Task queue size
- Memory leak detection

#### Browser Resources
- Active browser instances
- Open contexts and pages
- Resource utilization
- Cleanup effectiveness

### Performance Optimization

OmniTask automatically optimizes performance:

#### Intelligent Caching
- **Command Cache**: Stores parsed commands for instant reuse
- **LRU Eviction**: Removes least-used entries automatically
- **Cache Warming**: Preloads common command patterns

#### Memory Management
- **Automatic Cleanup**: Removes completed tasks periodically
- **Memory Monitoring**: Tracks usage and triggers cleanup
- **Resource Limits**: Prevents excessive memory consumption

#### Browser Pooling
- **Instance Reuse**: Shares browser instances across tasks
- **Context Isolation**: Maintains security while sharing resources
- **Idle Timeout**: Closes unused browsers automatically

### Performance Alerts

Get notified about performance issues:

- **Memory Warnings**: High memory usage alerts
- **Slow Parsing**: Command processing delays
- **Resource Exhaustion**: Browser or system limits reached
- **Cache Misses**: Low cache efficiency warnings

## Security Features

### Input Validation

All commands undergo comprehensive validation:

#### Syntax Checking
- Command structure validation
- Parameter type verification
- Range and format checking
- Encoding and injection prevention

#### Pattern Detection
- Malicious command identification
- Dangerous operation flagging
- Suspicious URL detection
- File system access validation

### Execution Sandboxing

Commands execute in controlled environments:

#### Web Automation Security
- Domain whitelisting/blacklisting
- Request monitoring and filtering
- Cookie and session isolation
- Download restriction enforcement

#### Desktop Automation Security
- Path traversal prevention
- System command filtering
- Process execution limits
- User permission verification

### Audit Logging

Comprehensive logging for security monitoring:

#### Event Tracking
- All command executions logged
- Security violations recorded
- Performance alerts captured
- User actions tracked

#### Log Analysis
- Pattern recognition for threats
- Anomaly detection algorithms
- Risk assessment scoring
- Automated alerting system

## Advanced Usage

### Custom Command Patterns

Extend OmniTask with custom command patterns:

#### Adding New Patterns
```javascript
// Add to commandParser.ts
const CUSTOM_PATTERNS = {
  development: [
    /(?:deploy|push).*(?:to|on).*(?:staging|production)/i,
    /run.*(?:tests|build|lint).*(?:for|in)/i
  ]
};
```

#### Parameter Extraction
```javascript
function extractDevParameters(command) {
  const envMatch = command.match(/(?:to|on)\s+(staging|production)/i);
  const actionMatch = command.match(/(deploy|push|run)\s+/i);
  
  return {
    environment: envMatch?.[1],
    action: actionMatch?.[1]
  };
}
```

### Performance Tuning

Optimize OmniTask for your specific use case:

#### Cache Configuration
```javascript
// Adjust cache settings in commandCache.ts
const cacheConfig = {
  maxSize: 2000,    // Increase for more commands
  maxAge: 7200000,  // 2 hours cache TTL
  enabled: true
};
```

#### Memory Limits
```javascript
// Configure in memoryManager.ts
const memoryConfig = {
  maxTaskAge: 3600000,      // 1 hour
  maxCompletedTasks: 100,   // Keep last 100
  cleanupInterval: 300000   // 5 minutes
};
```

#### Browser Pool Settings
```javascript
// Customize in browserPool.ts
const poolConfig = {
  maxBrowsers: 5,           // More concurrent browsers
  maxContextsPerBrowser: 8, // More contexts per browser
  browserIdleTimeout: 600000 // 10 minutes idle timeout
};
```

### Integration Examples

#### Webhook Integration
```javascript
// Add webhook notifications for completed tasks
app.post('/api/webhook/task-complete', (req, res) => {
  const { taskId, result } = req.body;
  
  // Send to external service
  fetch('https://your-service.com/webhook', {
    method: 'POST',
    body: JSON.stringify({ taskId, result })
  });
});
```

#### Slack Integration
```javascript
// Send task results to Slack
async function sendToSlack(result) {
  await fetch(process.env.SLACK_WEBHOOK_URL, {
    method: 'POST',
    body: JSON.stringify({
      text: `Task completed: ${result.summary}`,
      attachments: [{ 
        color: 'good',
        text: JSON.stringify(result.data, null, 2)
      }]
    })
  });
}
```

### Scheduled Commands

Implement command scheduling:

```javascript
// Simple cron-like scheduling
const schedule = require('node-cron');

schedule.schedule('0 9 * * *', () => {
  omniTask.execute('check my calendar for today');
});

schedule.schedule('*/30 * * * *', () => {
  omniTask.execute('get performance metrics');
});
```

## Troubleshooting

### Common Issues

#### Commands Not Executing
**Symptoms**: Commands remain in "queued" status
**Solutions**:
1. Check browser installation: `npx playwright install`
2. Verify macOS automation permissions
3. Check console for error messages
4. Restart the application

#### Slow Performance
**Symptoms**: Commands take long time to complete
**Solutions**:
1. Check memory usage in performance dashboard
2. Clear command cache if hit rate is low
3. Reduce number of concurrent tasks
4. Close idle browser instances

#### High Memory Usage
**Symptoms**: System becomes slow, memory alerts
**Solutions**:
1. Enable automatic cleanup
2. Reduce task retention period
3. Clear completed tasks manually
4. Restart application if persistent

#### Security Warnings
**Symptoms**: Commands blocked by security system
**Solutions**:
1. Review command for dangerous patterns
2. Check audit log for specific violations
3. Adjust security settings if necessary
4. Use alternative command phrasing

### Debug Mode

Enable detailed logging for troubleshooting:

```bash
# Start with debug logging
DEBUG=omnitask:* npm run dev

# Filter specific components
DEBUG=omnitask:parser,omnitask:queue npm run dev

# Enable performance profiling
NODE_ENV=development PROFILE=true npm run dev
```

### Log Analysis

Check application logs for issues:

#### Command Parser Logs
```
omnitask:parser Parsing command: "search for laptops"
omnitask:parser Matched pattern: shopping
omnitask:parser Confidence: 0.95
omnitask:parser Parameters: {"searchTerm": "laptops"}
```

#### Task Queue Logs
```
omnitask:queue Adding task: task-123
omnitask:queue Processing task: task-123
omnitask:queue Task completed: task-123 (success)
```

#### Browser Logs
```
omnitask:browser Creating new browser instance
omnitask:browser Browser ready: browser-456
omnitask:browser Navigating to: https://example.com
omnitask:browser Page loaded successfully
```

### Getting Help

If you encounter issues not covered in this guide:

1. **Check the GitHub Issues**: Search for similar problems
2. **Enable Debug Mode**: Gather detailed logs
3. **Performance Dashboard**: Check system metrics
4. **Security Audit Log**: Review blocked operations
5. **Create Issue**: Report with logs and reproduction steps

### Performance Optimization Tips

1. **Use Specific Commands**: More specific commands parse faster
2. **Monitor Cache Hit Rate**: Aim for >80% cache efficiency
3. **Limit Concurrent Tasks**: Keep queue size reasonable
4. **Regular Cleanup**: Clear old tasks and cache periodically
5. **Browser Management**: Close unused browsers manually if needed

### Best Practices

1. **Command Structure**: Use clear, specific language
2. **Security Awareness**: Avoid commands with sensitive data
3. **Resource Management**: Monitor memory and browser usage
4. **Regular Updates**: Keep OmniTask and dependencies updated
5. **Backup Configuration**: Save custom settings and patterns