import { globalCommandCache } from './commandCache';
import { globalMemoryManager } from './memoryManager';
import { globalBrowserPool } from './browserPool';

export interface PerformanceMetrics {
  timestamp: number;
  commandParsing: {
    cacheHitRate: number;
    avgParsingTime: number;
    totalCommands: number;
    cacheSize: number;
  };
  memory: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
    taskQueueSize: number;
  };
  browser: {
    browsers: number;
    contexts: number;
    pages: number;
    activePages: number;
  };
  system: {
    cpuUsage?: number;
    loadAverage?: number[];
  };
}

export interface PerformanceAlert {
  level: 'warning' | 'error' | 'critical';
  metric: string;
  value: number;
  threshold: number;
  message: string;
  timestamp: number;
}

export class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private alerts: PerformanceAlert[] = [];
  private thresholds = {
    memoryUsage: 200, // MB
    cacheHitRate: 0.7, // 70%
    avgParsingTime: 5, // ms
    activeBrowsers: 5,
    totalPages: 50
  };

  private commandParsingTimes: number[] = [];
  private lastCommandCount = 0;
  private lastCacheHits = 0;

  /**
   * Record command parsing time
   */
  recordCommandParsingTime(timeMs: number): void {
    this.commandParsingTimes.push(timeMs);
    
    // Keep only last 1000 measurements
    if (this.commandParsingTimes.length > 1000) {
      this.commandParsingTimes = this.commandParsingTimes.slice(-1000);
    }
  }

  /**
   * Collect current performance metrics
   */
  collectMetrics(): PerformanceMetrics {
    const cacheStats = globalCommandCache.getStats();
    const memoryStats = globalMemoryManager.getMemoryStats();
    const browserStats = globalBrowserPool.getStats();

    // Calculate cache hit rate
    const totalCacheAccess = cacheStats.entries.reduce((sum, entry) => sum + entry.hitCount, 0);
    const newCacheHits = totalCacheAccess - this.lastCacheHits;
    const newCommands = cacheStats.size - this.lastCommandCount;
    const cacheHitRate = newCommands > 0 ? newCacheHits / (newCacheHits + newCommands) : 0;

    this.lastCacheHits = totalCacheAccess;
    this.lastCommandCount = cacheStats.size;

    // Calculate average parsing time
    const avgParsingTime = this.commandParsingTimes.length > 0
      ? this.commandParsingTimes.reduce((sum, time) => sum + time, 0) / this.commandParsingTimes.length
      : 0;

    const metrics: PerformanceMetrics = {
      timestamp: Date.now(),
      commandParsing: {
        cacheHitRate,
        avgParsingTime,
        totalCommands: cacheStats.size,
        cacheSize: cacheStats.size
      },
      memory: {
        ...memoryStats,
        taskQueueSize: 0 // Will be updated by TaskQueue if needed
      },
      browser: browserStats,
      system: this.getSystemMetrics()
    };

    // Store metrics (keep last 100 measurements)
    this.metrics.push(metrics);
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100);
    }

    // Check for alerts
    this.checkThresholds(metrics);

    return metrics;
  }

  /**
   * Get performance trends
   */
  getTrends(metricName: keyof PerformanceMetrics, timeWindowMs: number = 5 * 60 * 1000): {
    values: number[];
    timestamps: number[];
    trend: 'up' | 'down' | 'stable';
    avgValue: number;
  } {
    const now = Date.now();
    const recentMetrics = this.metrics.filter(m => (now - m.timestamp) <= timeWindowMs);

    if (recentMetrics.length === 0) {
      return { values: [], timestamps: [], trend: 'stable', avgValue: 0 };
    }

    const values = recentMetrics.map(m => {
      const value = m[metricName];
      if (typeof value === 'number') return value;
      if (typeof value === 'object' && value !== null) {
        // For nested objects, return a representative value
        if ('heapUsed' in value) return (value as any).heapUsed;
        if ('cacheHitRate' in value) return (value as any).cacheHitRate;
        if ('browsers' in value) return (value as any).browsers;
      }
      return 0;
    });

    const timestamps = recentMetrics.map(m => m.timestamp);
    const avgValue = values.reduce((sum, val) => sum + val, 0) / values.length;

    // Calculate trend
    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (values.length >= 2) {
      const firstHalf = values.slice(0, Math.floor(values.length / 2));
      const secondHalf = values.slice(Math.floor(values.length / 2));
      const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;
      
      const changePercent = Math.abs((secondAvg - firstAvg) / firstAvg);
      if (changePercent > 0.1) { // 10% change threshold
        trend = secondAvg > firstAvg ? 'up' : 'down';
      }
    }

    return { values, timestamps, trend, avgValue };
  }

  /**
   * Get current alerts
   */
  getAlerts(level?: 'warning' | 'error' | 'critical'): PerformanceAlert[] {
    const alerts = level ? this.alerts.filter(a => a.level === level) : this.alerts;
    return alerts.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Clear old alerts
   */
  clearOldAlerts(maxAgeMs: number = 60 * 60 * 1000): void {
    const cutoff = Date.now() - maxAgeMs;
    this.alerts = this.alerts.filter(alert => alert.timestamp > cutoff);
  }

  /**
   * Get performance report
   */
  getPerformanceReport(): {
    current: PerformanceMetrics;
    trends: Record<string, any>;
    alerts: PerformanceAlert[];
    recommendations: string[];
  } {
    const current = this.metrics[this.metrics.length - 1] || this.collectMetrics();
    
    const trends = {
      memory: this.getTrends('memory'),
      commandParsing: this.getTrends('commandParsing'),
      browser: this.getTrends('browser')
    };

    const alerts = this.getAlerts();
    const recommendations = this.generateRecommendations(current, trends);

    return { current, trends, alerts, recommendations };
  }

  private getSystemMetrics(): { cpuUsage?: number; loadAverage?: number[] } {
    if (typeof process !== 'undefined') {
      return {
        cpuUsage: process.cpuUsage ? process.cpuUsage().user / 1000000 : undefined,
        loadAverage: process.platform !== 'win32' ? require('os').loadavg() : undefined
      };
    }
    return {};
  }

  private checkThresholds(metrics: PerformanceMetrics): void {
    // Memory usage check
    if (metrics.memory.heapUsed > this.thresholds.memoryUsage) {
      this.addAlert('error', 'memory.heapUsed', metrics.memory.heapUsed, this.thresholds.memoryUsage,
        `High memory usage: ${metrics.memory.heapUsed.toFixed(1)}MB`);
    }

    // Cache hit rate check
    if (metrics.commandParsing.cacheHitRate < this.thresholds.cacheHitRate) {
      this.addAlert('warning', 'commandParsing.cacheHitRate', 
        metrics.commandParsing.cacheHitRate, this.thresholds.cacheHitRate,
        `Low cache hit rate: ${(metrics.commandParsing.cacheHitRate * 100).toFixed(1)}%`);
    }

    // Parsing time check
    if (metrics.commandParsing.avgParsingTime > this.thresholds.avgParsingTime) {
      this.addAlert('warning', 'commandParsing.avgParsingTime',
        metrics.commandParsing.avgParsingTime, this.thresholds.avgParsingTime,
        `Slow command parsing: ${metrics.commandParsing.avgParsingTime.toFixed(1)}ms`);
    }

    // Browser resource check
    if (metrics.browser.browsers > this.thresholds.activeBrowsers) {
      this.addAlert('warning', 'browser.browsers', metrics.browser.browsers, this.thresholds.activeBrowsers,
        `Too many active browsers: ${metrics.browser.browsers}`);
    }

    if (metrics.browser.pages > this.thresholds.totalPages) {
      this.addAlert('error', 'browser.pages', metrics.browser.pages, this.thresholds.totalPages,
        `Too many browser pages: ${metrics.browser.pages}`);
    }
  }

  private addAlert(level: 'warning' | 'error' | 'critical', metric: string, value: number, threshold: number, message: string): void {
    // Don't add duplicate alerts within 5 minutes
    const recentSimilar = this.alerts.find(alert => 
      alert.metric === metric && 
      alert.level === level &&
      (Date.now() - alert.timestamp) < 5 * 60 * 1000
    );

    if (!recentSimilar) {
      this.alerts.push({
        level,
        metric,
        value,
        threshold,
        message,
        timestamp: Date.now()
      });
    }
  }

  private generateRecommendations(current: PerformanceMetrics, trends: Record<string, any>): string[] {
    const recommendations: string[] = [];

    // Memory recommendations
    if (current.memory.heapUsed > 150) {
      recommendations.push('Consider increasing task cleanup frequency to reduce memory usage');
    }

    // Cache recommendations
    if (current.commandParsing.cacheHitRate < 0.8) {
      recommendations.push('Cache hit rate is low - consider increasing cache size or TTL');
    }

    // Browser recommendations
    if (current.browser.browsers > 3) {
      recommendations.push('Multiple browser instances detected - consider browser pooling optimization');
    }

    if (current.browser.pages > 20) {
      recommendations.push('High number of browser pages - implement page lifecycle management');
    }

    // Trend-based recommendations
    if (trends.memory.trend === 'up') {
      recommendations.push('Memory usage is trending upward - monitor for potential memory leaks');
    }

    if (trends.commandParsing.avgValue > 3) {
      recommendations.push('Command parsing is slower than optimal - consider regex optimization');
    }

    return recommendations;
  }
}

export const globalPerformanceMonitor = new PerformanceMonitor();