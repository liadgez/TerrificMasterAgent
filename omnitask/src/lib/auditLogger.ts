import fs from 'fs';
import path from 'path';

export interface AuditLogEntry {
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'SECURITY';
  category: 'COMMAND' | 'AUTH' | 'FILE' | 'NETWORK' | 'SYSTEM';
  action: string;
  user?: string;
  ip?: string;
  userAgent?: string;
  details: Record<string, any>;
  success: boolean;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
}

export class AuditLogger {
  private static logDir = './logs';
  private static logFile = path.join(this.logDir, 'audit.log');
  private static securityLogFile = path.join(this.logDir, 'security.log');

  static {
    // Ensure log directory exists
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  /**
   * Log a command execution attempt
   */
  static logCommandExecution(
    command: string,
    success: boolean,
    riskLevel: 'low' | 'medium' | 'high' | 'critical',
    user?: string,
    ip?: string,
    details?: Record<string, any>
  ): void {
    const entry: AuditLogEntry = {
      timestamp: new Date().toISOString(),
      level: success ? 'INFO' : 'ERROR',
      category: 'COMMAND',
      action: 'execute',
      user,
      ip,
      details: {
        command: this.sanitizeForLog(command),
        ...details
      },
      success,
      risk_level: riskLevel
    };

    this.writeLogEntry(entry);

    // Also log to security log if high risk or failed
    if (riskLevel === 'high' || riskLevel === 'critical' || !success) {
      this.writeSecurityLogEntry(entry);
    }
  }

  /**
   * Log authentication events
   */
  static logAuthentication(
    action: 'login' | 'logout' | 'failed_login' | 'token_refresh',
    success: boolean,
    user?: string,
    ip?: string,
    userAgent?: string,
    details?: Record<string, any>
  ): void {
    const entry: AuditLogEntry = {
      timestamp: new Date().toISOString(),
      level: success ? 'INFO' : 'WARN',
      category: 'AUTH',
      action,
      user,
      ip,
      userAgent,
      details: details || {},
      success,
      risk_level: success ? 'low' : 'medium'
    };

    this.writeLogEntry(entry);

    // Log failed authentication to security log
    if (!success) {
      this.writeSecurityLogEntry(entry);
    }
  }

  /**
   * Log file system operations
   */
  static logFileOperation(
    operation: 'read' | 'write' | 'delete' | 'move' | 'copy',
    filePath: string,
    success: boolean,
    user?: string,
    ip?: string,
    details?: Record<string, any>
  ): void {
    const riskLevel = this.assessFileOperationRisk(operation, filePath);
    
    const entry: AuditLogEntry = {
      timestamp: new Date().toISOString(),
      level: success ? 'INFO' : 'ERROR',
      category: 'FILE',
      action: operation,
      user,
      ip,
      details: {
        filePath: this.sanitizeForLog(filePath),
        ...details
      },
      success,
      risk_level: riskLevel
    };

    this.writeLogEntry(entry);

    // Log high-risk file operations to security log
    if (riskLevel === 'high' || riskLevel === 'critical') {
      this.writeSecurityLogEntry(entry);
    }
  }

  /**
   * Log network operations
   */
  static logNetworkOperation(
    operation: 'http_request' | 'websocket_connect' | 'download',
    url: string,
    success: boolean,
    user?: string,
    ip?: string,
    details?: Record<string, any>
  ): void {
    const riskLevel = this.assessNetworkOperationRisk(url);
    
    const entry: AuditLogEntry = {
      timestamp: new Date().toISOString(),
      level: success ? 'INFO' : 'ERROR',
      category: 'NETWORK',
      action: operation,
      user,
      ip,
      details: {
        url: this.sanitizeForLog(url),
        ...details
      },
      success,
      risk_level: riskLevel
    };

    this.writeLogEntry(entry);

    // Log suspicious network activity
    if (riskLevel === 'high' || riskLevel === 'critical') {
      this.writeSecurityLogEntry(entry);
    }
  }

  /**
   * Log system operations
   */
  static logSystemOperation(
    operation: 'volume_change' | 'brightness_change' | 'sleep' | 'lock' | 'notification',
    success: boolean,
    user?: string,
    ip?: string,
    details?: Record<string, any>
  ): void {
    const entry: AuditLogEntry = {
      timestamp: new Date().toISOString(),
      level: success ? 'INFO' : 'ERROR',
      category: 'SYSTEM',
      action: operation,
      user,
      ip,
      details: details || {},
      success,
      risk_level: 'low'
    };

    this.writeLogEntry(entry);
  }

  /**
   * Log security violations
   */
  static logSecurityViolation(
    violation: string,
    details: Record<string, any>,
    user?: string,
    ip?: string,
    userAgent?: string
  ): void {
    const entry: AuditLogEntry = {
      timestamp: new Date().toISOString(),
      level: 'SECURITY',
      category: 'SYSTEM',
      action: 'security_violation',
      user,
      ip,
      userAgent,
      details: {
        violation,
        ...details
      },
      success: false,
      risk_level: 'critical'
    };

    this.writeLogEntry(entry);
    this.writeSecurityLogEntry(entry);

    // In production, you might want to send alerts here
    console.error(`[SECURITY VIOLATION] ${violation}`, details);
  }

  /**
   * Get audit logs for analysis
   */
  static getAuditLogs(
    startDate?: Date,
    endDate?: Date,
    category?: AuditLogEntry['category'],
    riskLevel?: AuditLogEntry['risk_level']
  ): AuditLogEntry[] {
    try {
      if (!fs.existsSync(this.logFile)) {
        return [];
      }

      const logs = fs.readFileSync(this.logFile, 'utf-8')
        .split('\n')
        .filter(line => line.trim())
        .map(line => {
          try {
            return JSON.parse(line) as AuditLogEntry;
          } catch {
            return null;
          }
        })
        .filter((entry): entry is AuditLogEntry => entry !== null);

      return logs.filter(entry => {
        if (startDate && new Date(entry.timestamp) < startDate) return false;
        if (endDate && new Date(entry.timestamp) > endDate) return false;
        if (category && entry.category !== category) return false;
        if (riskLevel && entry.risk_level !== riskLevel) return false;
        return true;
      });
    } catch (error) {
      console.error('Error reading audit logs:', error);
      return [];
    }
  }

  /**
   * Get security metrics for monitoring
   */
  static getSecurityMetrics(hours: number = 24): {
    total_events: number;
    security_violations: number;
    failed_commands: number;
    high_risk_operations: number;
    top_risk_ips: Array<{ ip: string; count: number }>;
    top_violations: Array<{ violation: string; count: number }>;
  } {
    const startDate = new Date(Date.now() - (hours * 60 * 60 * 1000));
    const logs = this.getAuditLogs(startDate);

    const securityViolations = logs.filter(log => log.level === 'SECURITY');
    const failedCommands = logs.filter(log => log.category === 'COMMAND' && !log.success);
    const highRiskOps = logs.filter(log => log.risk_level === 'high' || log.risk_level === 'critical');

    // Count IPs with security issues
    const ipCounts = new Map<string, number>();
    [...securityViolations, ...failedCommands].forEach(log => {
      if (log.ip) {
        ipCounts.set(log.ip, (ipCounts.get(log.ip) || 0) + 1);
      }
    });

    // Count violation types
    const violationCounts = new Map<string, number>();
    securityViolations.forEach(log => {
      const violation = log.details.violation || 'unknown';
      violationCounts.set(violation, (violationCounts.get(violation) || 0) + 1);
    });

    return {
      total_events: logs.length,
      security_violations: securityViolations.length,
      failed_commands: failedCommands.length,
      high_risk_operations: highRiskOps.length,
      top_risk_ips: Array.from(ipCounts.entries())
        .map(([ip, count]) => ({ ip, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      top_violations: Array.from(violationCounts.entries())
        .map(([violation, count]) => ({ violation, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
    };
  }

  /**
   * Assess risk level for file operations
   */
  private static assessFileOperationRisk(
    operation: string,
    filePath: string
  ): 'low' | 'medium' | 'high' | 'critical' {
    const criticalPaths = [
      '/System/',
      '/etc/',
      '/var/root/',
      '/usr/bin/',
      '/Library/Keychains/',
      '/Applications/Utilities/Keychain Access.app'
    ];

    const highRiskPaths = [
      '/Library/',
      '/Applications/',
      '/usr/',
      '/private/'
    ];

    if (criticalPaths.some(path => filePath.startsWith(path))) {
      return 'critical';
    }

    if (highRiskPaths.some(path => filePath.startsWith(path))) {
      return 'high';
    }

    if (operation === 'delete' || operation === 'write') {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Assess risk level for network operations
   */
  private static assessNetworkOperationRisk(url: string): 'low' | 'medium' | 'high' | 'critical' {
    try {
      const urlObj = new URL(url);
      
      // Check for local network access
      if (urlObj.hostname === 'localhost' || 
          urlObj.hostname === '127.0.0.1' ||
          urlObj.hostname.startsWith('192.168.') ||
          urlObj.hostname.startsWith('10.') ||
          urlObj.hostname.startsWith('172.')) {
        return 'high';
      }

      // Check for suspicious TLDs
      const suspiciousTLDs = ['.tk', '.ml', '.ga', '.cf'];
      if (suspiciousTLDs.some(tld => urlObj.hostname.endsWith(tld))) {
        return 'medium';
      }

      // Check for non-standard ports
      if (urlObj.port && !['80', '443', '8080', '8443'].includes(urlObj.port)) {
        return 'medium';
      }

      return 'low';
    } catch {
      return 'high'; // Invalid URLs are risky
    }
  }

  /**
   * Sanitize sensitive data for logging
   */
  private static sanitizeForLog(input: string): string {
    // Remove potential passwords, tokens, etc.
    return input
      .replace(/password[=:\s]+[^\s&]+/gi, 'password=***')
      .replace(/token[=:\s]+[^\s&]+/gi, 'token=***')
      .replace(/key[=:\s]+[^\s&]+/gi, 'key=***')
      .replace(/secret[=:\s]+[^\s&]+/gi, 'secret=***');
  }

  /**
   * Write audit log entry
   */
  private static writeLogEntry(entry: AuditLogEntry): void {
    try {
      const logLine = JSON.stringify(entry) + '\n';
      fs.appendFileSync(this.logFile, logLine);
    } catch (error) {
      console.error('Failed to write audit log:', error);
    }
  }

  /**
   * Write security log entry
   */
  private static writeSecurityLogEntry(entry: AuditLogEntry): void {
    try {
      const logLine = JSON.stringify(entry) + '\n';
      fs.appendFileSync(this.securityLogFile, logLine);
    } catch (error) {
      console.error('Failed to write security log:', error);
    }
  }
}

export default AuditLogger;