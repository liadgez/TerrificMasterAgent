import winston from 'winston';
import * as path from 'path';
import * as fs from 'fs';

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom format for logs
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let log = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }
    
    return log;
  })
);

// Console format (simpler for CLI output)
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.simple(),
  winston.format.printf(({ level, message }) => {
    return `${level}: ${message}`;
  })
);

// Create the logger
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'workflow-tool' },
  transports: [
    // File transport for all logs
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    
    // File transport for all logs
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    
    // Console transport (only in development or when explicitly enabled)
    ...(process.env.NODE_ENV !== 'production' || process.env.ENABLE_CONSOLE_LOGS === 'true' 
      ? [new winston.transports.Console({
          format: consoleFormat,
          level: 'debug'
        })]
      : []
    )
  ],
  
  // Don't exit on handled exceptions
  exitOnError: false,
});

// Handle uncaught exceptions and unhandled rejections
logger.exceptions.handle(
  new winston.transports.File({ filename: path.join(logsDir, 'exceptions.log') })
);

logger.rejections.handle(
  new winston.transports.File({ filename: path.join(logsDir, 'rejections.log') })
);

// Audit logger for workflow changes
export const auditLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'workflow-audit' },
  transports: [
    new winston.transports.File({
      filename: path.join(logsDir, 'audit.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 10,
    })
  ]
});

// Helper functions for structured logging
export const logWorkflowEvent = (event: string, workflowName: string, details?: any) => {
  auditLogger.info('Workflow event', {
    event,
    workflowName,
    timestamp: new Date().toISOString(),
    ...details
  });
};

export const logStepExecution = (stepId: string, stepName: string, success: boolean, details?: any) => {
  auditLogger.info('Step execution', {
    stepId,
    stepName,
    success,
    timestamp: new Date().toISOString(),
    ...details
  });
};

export const logIterationComplete = (iteration: number, workflowName: string, success: boolean, details?: any) => {
  auditLogger.info('Iteration complete', {
    iteration,
    workflowName,
    success,
    timestamp: new Date().toISOString(),
    ...details
  });
};

// Export logger as default
export default logger;