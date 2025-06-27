# OmniTask Deployment Guide

## Table of Contents

1. [Production Deployment](#production-deployment)
2. [Environment Configuration](#environment-configuration)
3. [Performance Optimization](#performance-optimization)
4. [Security Hardening](#security-hardening)
5. [Monitoring and Logging](#monitoring-and-logging)
6. [Backup and Recovery](#backup-and-recovery)
7. [Scaling Considerations](#scaling-considerations)
8. [Maintenance](#maintenance)

## Production Deployment

### System Requirements

**Minimum Requirements**:
- macOS 10.15 or later
- Node.js 18.0 or later
- 8GB RAM
- 50GB free disk space
- Stable internet connection

**Recommended Requirements**:
- macOS 12.0 or later
- Node.js 20.0 or later
- 16GB RAM
- 100GB SSD storage
- High-speed internet connection

### Installation Steps

#### 1. System Preparation

```bash
# Update system
sudo softwareupdate -ia

# Install Xcode Command Line Tools
xcode-select --install

# Install Node.js (using nvm recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20
```

#### 2. Application Deployment

```bash
# Clone repository
git clone https://github.com/liadgez/TerrificMasterAgent.git
cd omnitask

# Install production dependencies
npm ci --production

# Install Playwright browsers
npx playwright install

# Build application
npm run build

# Verify installation
npm run test:smoke
```

#### 3. Process Management

Use PM2 for production process management:

```bash
# Install PM2 globally
npm install -g pm2

# Create PM2 ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'omnitask',
    script: 'npm',
    args: 'start',
    cwd: '/path/to/omnitask',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '2G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
}
EOF

# Start application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup startup script
pm2 startup
```

#### 4. Reverse Proxy Setup (Optional)

Configure nginx for SSL and load balancing:

```nginx
# /usr/local/etc/nginx/nginx.conf
upstream omnitask {
    server 127.0.0.1:3000;
}

server {
    listen 80;
    server_name omnitask.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name omnitask.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://omnitask;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Environment Configuration

### Environment Variables

Create a production environment file:

```bash
# .env.production
NODE_ENV=production
PORT=3000

# Performance Settings
CACHE_MAX_SIZE=2000
CACHE_TTL=7200000
MEMORY_CLEANUP_INTERVAL=300000
BROWSER_POOL_SIZE=5

# Security Settings
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=900000
SECURITY_STRICT_MODE=true
AUDIT_LOG_RETENTION_DAYS=90

# Monitoring
PERFORMANCE_MONITORING=true
TELEMETRY_ENDPOINT=https://your-monitoring.com/api/metrics
ALERT_WEBHOOK_URL=https://your-alerts.com/webhook

# Browser Settings
BROWSER_HEADLESS=true
BROWSER_TIMEOUT=30000
BROWSER_IDLE_TIMEOUT=300000

# File System
DATA_DIRECTORY=/opt/omnitask/data
LOG_DIRECTORY=/opt/omnitask/logs
BACKUP_DIRECTORY=/opt/omnitask/backups
```

### Configuration Files

#### Performance Configuration

```javascript
// config/production.js
module.exports = {
  cache: {
    maxSize: process.env.CACHE_MAX_SIZE || 2000,
    ttl: process.env.CACHE_TTL || 7200000,
    enabled: true
  },
  
  memory: {
    maxTaskAge: 3600000,        // 1 hour
    maxCompletedTasks: 200,     // Keep more in production
    cleanupInterval: 300000,    // 5 minutes
    memoryThreshold: 1024 * 1024 * 1024 // 1GB
  },
  
  browserPool: {
    maxBrowsers: 5,
    maxContextsPerBrowser: 10,
    maxPagesPerContext: 15,
    browserIdleTimeout: 600000, // 10 minutes
    contextIdleTimeout: 300000, // 5 minutes
    pageIdleTimeout: 180000     // 3 minutes
  },
  
  security: {
    strictMode: true,
    rateLimiting: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100                   // requests per window
    },
    auditLog: {
      enabled: true,
      retentionDays: 90
    }
  }
};
```

#### Logging Configuration

```javascript
// config/logging.js
const winston = require('winston');

module.exports = {
  transports: [
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    }),
    
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    }),
    
    new winston.transports.Console({
      level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
};
```

## Performance Optimization

### System-Level Optimizations

#### macOS Settings

```bash
# Increase file descriptor limits
echo 'kern.maxfiles=65536' | sudo tee -a /etc/sysctl.conf
echo 'kern.maxfilesperproc=32768' | sudo tee -a /etc/sysctl.conf

# Optimize memory management
echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf

# Apply changes
sudo sysctl -p
```

#### Node.js Optimization

```bash
# Increase heap size for production
export NODE_OPTIONS="--max-old-space-size=4096"

# Enable V8 optimizations
export NODE_OPTIONS="$NODE_OPTIONS --optimize-for-size"

# Adjust garbage collection
export NODE_OPTIONS="$NODE_OPTIONS --expose-gc"
```

### Application-Level Optimizations

#### 1. Build Optimization

```javascript
// next.config.js
module.exports = {
  experimental: {
    serverComponentsExternalPackages: ['playwright']
  },
  
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push('playwright');
    }
    
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          }
        }
      }
    };
    
    return config;
  },
  
  compress: true,
  poweredByHeader: false,
  
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          }
        ]
      }
    ];
  }
};
```

#### 2. Database Optimization

```javascript
// lib/database.js (if using SQLite)
const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('/opt/omnitask/data/omnitask.db', (err) => {
  if (err) {
    console.error('Database connection error:', err);
  }
});

// Optimize SQLite for production
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA synchronous = NORMAL;
  PRAGMA cache_size = 1000000;
  PRAGMA temp_store = memory;
  PRAGMA mmap_size = 268435456;
`);
```

#### 3. Caching Strategy

```javascript
// lib/cache/redis.js (if using Redis)
const redis = require('redis');

const client = redis.createClient({
  host: 'localhost',
  port: 6379,
  db: 0,
  retry_strategy: (options) => {
    if (options.error?.code === 'ECONNREFUSED') {
      return new Error('Redis server refused connection');
    }
    if (options.total_retry_time > 1000 * 60 * 60) {
      return new Error('Retry time exhausted');
    }
    if (options.attempt > 10) {
      return undefined;
    }
    return Math.min(options.attempt * 100, 3000);
  }
});

module.exports = client;
```

## Security Hardening

### System Security

#### 1. User and Permissions

```bash
# Create dedicated user
sudo dscl . -create /Users/omnitask
sudo dscl . -create /Users/omnitask UserShell /bin/bash
sudo dscl . -create /Users/omnitask RealName "OmniTask Service"
sudo dscl . -create /Users/omnitask UniqueID 501
sudo dscl . -create /Users/omnitask PrimaryGroupID 20

# Set directory permissions
sudo mkdir -p /opt/omnitask/{data,logs,backups}
sudo chown -R omnitask:staff /opt/omnitask
sudo chmod -R 750 /opt/omnitask
```

#### 2. Firewall Configuration

```bash
# Enable macOS firewall
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --setglobalstate on

# Allow specific ports
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add /usr/local/bin/node
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --unblockapp /usr/local/bin/node
```

### Application Security

#### 1. Environment Hardening

```javascript
// middleware/security.js
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many requests',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
    });
  }
});

module.exports = [
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"]
      }
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  }),
  limiter
];
```

#### 2. Input Validation

```javascript
// lib/security/validator.js
const Joi = require('joi');

const commandSchema = Joi.object({
  command: Joi.string().min(1).max(1000).required()
    .pattern(/^[a-zA-Z0-9\s\-_.,!?]+$/)
    .messages({
      'string.pattern.base': 'Command contains invalid characters'
    }),
  
  options: Joi.object({
    dryRun: Joi.boolean().default(false),
    priority: Joi.string().valid('low', 'normal', 'high').default('normal'),
    timeout: Joi.number().min(1000).max(300000).default(30000)
  }).default({})
});

module.exports = { commandSchema };
```

#### 3. Audit Logging

```javascript
// lib/audit.js
const winston = require('winston');

const auditLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: '/opt/omnitask/logs/audit.log'
    })
  ]
});

function logSecurityEvent(event, details) {
  auditLogger.info({
    type: 'security_event',
    event,
    details,
    timestamp: new Date().toISOString(),
    pid: process.pid
  });
}

module.exports = { logSecurityEvent };
```

## Monitoring and Logging

### Application Monitoring

#### 1. Health Checks

```javascript
// api/health/route.js
export async function GET() {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version
  };

  try {
    // Check database connectivity
    await db.ping();
    health.database = 'connected';

    // Check browser availability
    const browsers = await globalBrowserPool.getStats();
    health.browsers = browsers;

    // Check cache status
    const cache = await globalCommandCache.getStats();
    health.cache = cache;

    return Response.json(health);
  } catch (error) {
    health.status = 'unhealthy';
    health.error = error.message;
    
    return Response.json(health, { status: 503 });
  }
}
```

#### 2. Metrics Collection

```javascript
// lib/monitoring/metrics.js
const prometheus = require('prom-client');

// Create metrics
const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code']
});

const commandExecutionDuration = new prometheus.Histogram({
  name: 'command_execution_duration_seconds',
  help: 'Duration of command execution in seconds',
  labelNames: ['command_type', 'status']
});

const memoryUsage = new prometheus.Gauge({
  name: 'process_memory_usage_bytes',
  help: 'Process memory usage in bytes',
  labelNames: ['type']
});

// Update memory metrics
setInterval(() => {
  const usage = process.memoryUsage();
  memoryUsage.set({ type: 'heap_used' }, usage.heapUsed);
  memoryUsage.set({ type: 'heap_total' }, usage.heapTotal);
  memoryUsage.set({ type: 'external' }, usage.external);
  memoryUsage.set({ type: 'rss' }, usage.rss);
}, 10000);

module.exports = {
  httpRequestDuration,
  commandExecutionDuration,
  memoryUsage,
  register: prometheus.register
};
```

#### 3. Log Aggregation

```javascript
// config/winston.js
const winston = require('winston');
require('winston-daily-rotate-file');

const transport = new winston.transports.DailyRotateFile({
  filename: '/opt/omnitask/logs/application-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d'
});

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'omnitask' },
  transports: [
    transport,
    new winston.transports.File({
      filename: '/opt/omnitask/logs/error.log',
      level: 'error'
    })
  ]
});

module.exports = logger;
```

### External Monitoring

#### 1. Uptime Monitoring

```bash
# Create uptime check script
cat > /opt/omnitask/scripts/health-check.sh << 'EOF'
#!/bin/bash

HEALTH_ENDPOINT="http://localhost:3000/api/health"
WEBHOOK_URL="https://your-monitoring.com/webhook"

response=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_ENDPOINT)

if [ $response -ne 200 ]; then
  curl -X POST $WEBHOOK_URL \
    -H "Content-Type: application/json" \
    -d "{\"alert\": \"OmniTask health check failed\", \"status\": $response}"
fi
EOF

chmod +x /opt/omnitask/scripts/health-check.sh

# Add to crontab
echo "*/5 * * * * /opt/omnitask/scripts/health-check.sh" | crontab -
```

#### 2. Performance Alerts

```javascript
// lib/alerts.js
const axios = require('axios');

class AlertManager {
  constructor(webhookUrl) {
    this.webhookUrl = webhookUrl;
    this.alertCooldown = new Map();
  }

  async sendAlert(type, message, severity = 'warning') {
    const cooldownKey = `${type}-${severity}`;
    const lastAlert = this.alertCooldown.get(cooldownKey);
    const now = Date.now();

    // Prevent spam (5 minute cooldown)
    if (lastAlert && (now - lastAlert) < 300000) {
      return;
    }

    try {
      await axios.post(this.webhookUrl, {
        type,
        message,
        severity,
        timestamp: new Date().toISOString(),
        service: 'omnitask'
      });

      this.alertCooldown.set(cooldownKey, now);
    } catch (error) {
      console.error('Failed to send alert:', error);
    }
  }
}

module.exports = AlertManager;
```

## Backup and Recovery

### Automated Backups

#### 1. Data Backup Script

```bash
#!/bin/bash
# /opt/omnitask/scripts/backup.sh

BACKUP_DIR="/opt/omnitask/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="omnitask_backup_$DATE"

# Create backup directory
mkdir -p "$BACKUP_DIR/$BACKUP_NAME"

# Backup application data
cp -r /opt/omnitask/data/* "$BACKUP_DIR/$BACKUP_NAME/"

# Backup configuration
cp /opt/omnitask/.env.production "$BACKUP_DIR/$BACKUP_NAME/"
cp /opt/omnitask/ecosystem.config.js "$BACKUP_DIR/$BACKUP_NAME/"

# Backup logs (last 7 days)
find /opt/omnitask/logs -name "*.log" -mtime -7 -exec cp {} "$BACKUP_DIR/$BACKUP_NAME/" \;

# Compress backup
cd "$BACKUP_DIR"
tar -czf "$BACKUP_NAME.tar.gz" "$BACKUP_NAME"
rm -rf "$BACKUP_NAME"

# Keep only last 30 backups
ls -t omnitask_backup_*.tar.gz | tail -n +31 | xargs rm -f

echo "Backup completed: $BACKUP_NAME.tar.gz"
```

#### 2. Database Backup

```javascript
// scripts/backup-db.js
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

async function backupDatabase() {
  const dbPath = '/opt/omnitask/data/omnitask.db';
  const backupDir = '/opt/omnitask/backups/db';
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `omnitask_${timestamp}.db`);

  // Ensure backup directory exists
  fs.mkdirSync(backupDir, { recursive: true });

  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY);
    
    db.backup(backupPath, (err) => {
      db.close();
      
      if (err) {
        reject(err);
      } else {
        console.log(`Database backup created: ${backupPath}`);
        resolve(backupPath);
      }
    });
  });
}

if (require.main === module) {
  backupDatabase().catch(console.error);
}

module.exports = backupDatabase;
```

#### 3. Scheduled Backups

```bash
# Add to crontab
0 2 * * * /opt/omnitask/scripts/backup.sh > /opt/omnitask/logs/backup.log 2>&1
0 */6 * * * /usr/local/bin/node /opt/omnitask/scripts/backup-db.js
```

### Recovery Procedures

#### 1. Full System Recovery

```bash
#!/bin/bash
# /opt/omnitask/scripts/restore.sh

if [ $# -ne 1 ]; then
  echo "Usage: $0 <backup_file.tar.gz>"
  exit 1
fi

BACKUP_FILE="$1"
RESTORE_DIR="/tmp/omnitask_restore"

# Stop application
pm2 stop omnitask

# Extract backup
mkdir -p "$RESTORE_DIR"
tar -xzf "$BACKUP_FILE" -C "$RESTORE_DIR"

# Restore data
cp -r "$RESTORE_DIR"/* /opt/omnitask/data/

# Restore configuration
cp "$RESTORE_DIR/.env.production" /opt/omnitask/
cp "$RESTORE_DIR/ecosystem.config.js" /opt/omnitask/

# Set permissions
chown -R omnitask:staff /opt/omnitask/data
chmod -R 750 /opt/omnitask/data

# Start application
pm2 start omnitask

# Cleanup
rm -rf "$RESTORE_DIR"

echo "Restore completed"
```

#### 2. Database Recovery

```javascript
// scripts/restore-db.js
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

async function restoreDatabase(backupPath) {
  const dbPath = '/opt/omnitask/data/omnitask.db';
  
  if (!fs.existsSync(backupPath)) {
    throw new Error(`Backup file not found: ${backupPath}`);
  }

  // Backup current database
  const currentBackup = `${dbPath}.backup.${Date.now()}`;
  if (fs.existsSync(dbPath)) {
    fs.copyFileSync(dbPath, currentBackup);
    console.log(`Current database backed up to: ${currentBackup}`);
  }

  // Restore from backup
  fs.copyFileSync(backupPath, dbPath);
  
  // Verify database integrity
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);
    
    db.run('PRAGMA integrity_check', (err) => {
      db.close();
      
      if (err) {
        // Restore original if integrity check fails
        if (fs.existsSync(currentBackup)) {
          fs.copyFileSync(currentBackup, dbPath);
        }
        reject(new Error('Database integrity check failed'));
      } else {
        console.log('Database restored successfully');
        resolve();
      }
    });
  });
}

module.exports = restoreDatabase;
```

## Scaling Considerations

### Horizontal Scaling

#### 1. Load Balancer Configuration

```nginx
# nginx load balancer
upstream omnitask_cluster {
    least_conn;
    server 127.0.0.1:3000 weight=1 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:3001 weight=1 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:3002 weight=1 max_fails=3 fail_timeout=30s;
}

server {
    listen 80;
    location / {
        proxy_pass http://omnitask_cluster;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        
        # Sticky sessions for command processing
        hash $remote_addr consistent;
    }
    
    location /api/health {
        proxy_pass http://omnitask_cluster;
        proxy_next_upstream error timeout invalid_header http_500 http_502 http_503;
    }
}
```

#### 2. Shared State Management

```javascript
// lib/cluster/shared-state.js
const Redis = require('redis');

class SharedState {
  constructor() {
    this.redis = Redis.createClient({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379
    });
  }

  async setTaskStatus(taskId, status) {
    await this.redis.hset(`task:${taskId}`, 'status', status);
    await this.redis.expire(`task:${taskId}`, 3600); // 1 hour TTL
  }

  async getTaskStatus(taskId) {
    return await this.redis.hget(`task:${taskId}`, 'status');
  }

  async acquireTaskLock(taskId, workerId, ttl = 300) {
    const result = await this.redis.set(
      `lock:task:${taskId}`, 
      workerId, 
      'PX', ttl * 1000, 
      'NX'
    );
    return result === 'OK';
  }

  async releaseTaskLock(taskId, workerId) {
    const script = `
      if redis.call("GET", KEYS[1]) == ARGV[1] then
        return redis.call("DEL", KEYS[1])
      else
        return 0
      end
    `;
    
    return await this.redis.eval(script, 1, `lock:task:${taskId}`, workerId);
  }
}

module.exports = SharedState;
```

### Vertical Scaling

#### 1. Resource Optimization

```javascript
// config/cluster.js
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;

if (cluster.isMaster) {
  console.log(`Master ${process.pid} is running`);

  // Fork workers
  const maxWorkers = Math.min(numCPUs, 4); // Limit workers
  for (let i = 0; i < maxWorkers; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died`);
    cluster.fork(); // Replace dead worker
  });
} else {
  require('./server');
  console.log(`Worker ${process.pid} started`);
}
```

#### 2. Memory Management

```javascript
// lib/memory/manager.js
class ProductionMemoryManager {
  constructor() {
    this.memoryThresholds = {
      warning: 1024 * 1024 * 1024,  // 1GB
      critical: 1536 * 1024 * 1024  // 1.5GB
    };
    
    this.startMonitoring();
  }

  startMonitoring() {
    setInterval(() => {
      const usage = process.memoryUsage();
      
      if (usage.heapUsed > this.memoryThresholds.critical) {
        this.emergencyCleanup();
      } else if (usage.heapUsed > this.memoryThresholds.warning) {
        this.performCleanup();
      }
    }, 30000); // Check every 30 seconds
  }

  async emergencyCleanup() {
    console.warn('Emergency memory cleanup triggered');
    
    // Clear all caches
    globalCommandCache.clear();
    
    // Close idle browsers
    await globalBrowserPool.closeIdleBrowsers();
    
    // Remove old tasks
    globalTaskQueue.clearOldTasks(300000); // 5 minutes
    
    // Force garbage collection
    if (global.gc) {
      global.gc();
    }
  }
}

module.exports = ProductionMemoryManager;
```

## Maintenance

### Regular Maintenance Tasks

#### 1. Log Rotation

```bash
# /etc/newsyslog.d/omnitask.conf
/opt/omnitask/logs/*.log omnitask:staff 644 7 100 * JC
```

#### 2. Performance Tuning

```bash
#!/bin/bash
# /opt/omnitask/scripts/maintenance.sh

echo "Starting OmniTask maintenance..."

# Clear old logs
find /opt/omnitask/logs -name "*.log" -mtime +30 -delete

# Clear old backups
find /opt/omnitask/backups -name "*.tar.gz" -mtime +90 -delete

# Optimize database
sqlite3 /opt/omnitask/data/omnitask.db "VACUUM;"
sqlite3 /opt/omnitask/data/omnitask.db "ANALYZE;"

# Clear browser cache
rm -rf /tmp/playwright-*

# Restart application for memory cleanup
pm2 restart omnitask

echo "Maintenance completed"
```

#### 3. Health Monitoring

```javascript
// scripts/health-monitor.js
const axios = require('axios');

class HealthMonitor {
  constructor() {
    this.checks = [
      this.checkAPI,
      this.checkDatabase,
      this.checkMemory,
      this.checkDisk
    ];
  }

  async runAllChecks() {
    const results = await Promise.allSettled(
      this.checks.map(check => check())
    );

    const failures = results
      .filter(result => result.status === 'rejected')
      .map(result => result.reason);

    if (failures.length > 0) {
      console.error('Health check failures:', failures);
      await this.alertFailures(failures);
    }

    return failures.length === 0;
  }

  async checkAPI() {
    const response = await axios.get('http://localhost:3000/api/health');
    if (response.status !== 200) {
      throw new Error('API health check failed');
    }
  }

  async checkDatabase() {
    // Check database connectivity and performance
    const start = Date.now();
    const response = await axios.get('http://localhost:3000/api/health');
    const duration = Date.now() - start;
    
    if (duration > 5000) {
      throw new Error('Database response too slow');
    }
  }

  async checkMemory() {
    const response = await axios.get('http://localhost:3000/api/performance?action=metrics');
    const { memory } = response.data.data;
    
    if (memory.heapUsed > 1024 * 1024 * 1024) { // 1GB
      throw new Error('Memory usage too high');
    }
  }

  async checkDisk() {
    const { execSync } = require('child_process');
    const output = execSync('df -h /opt/omnitask').toString();
    const usage = parseInt(output.split('\n')[1].split(/\s+/)[4]);
    
    if (usage > 80) {
      throw new Error('Disk usage above 80%');
    }
  }
}

const monitor = new HealthMonitor();
monitor.runAllChecks();
```

### Update Procedures

#### 1. Application Updates

```bash
#!/bin/bash
# /opt/omnitask/scripts/update.sh

# Create backup before update
/opt/omnitask/scripts/backup.sh

# Pull latest changes
cd /opt/omnitask
git fetch origin
git checkout $(git describe --tags $(git rev-list --tags --max-count=1))

# Install dependencies
npm ci --production

# Run database migrations
npm run migrate

# Build application
npm run build

# Restart application
pm2 restart omnitask

# Run health check
sleep 30
curl -f http://localhost:3000/api/health || {
  echo "Health check failed, rolling back"
  pm2 stop omnitask
  # Restore from backup
  exit 1
}

echo "Update completed successfully"
```

#### 2. Zero-Downtime Deployment

```bash
#!/bin/bash
# /opt/omnitask/scripts/deploy.sh

# Deploy to staging first
pm2 start ecosystem.staging.js

# Health check staging
curl -f http://localhost:3001/api/health || exit 1

# Switch traffic gradually
# Update nginx config to include staging server
# Monitor for errors

# Full cutover
pm2 stop omnitask-production
pm2 start ecosystem.production.js

# Final health check
curl -f http://localhost:3000/api/health || {
  pm2 stop omnitask-production
  pm2 start omnitask-previous
  exit 1
}

echo "Zero-downtime deployment completed"
```

This deployment guide provides comprehensive instructions for running OmniTask in production environments with proper security, monitoring, and maintenance procedures.