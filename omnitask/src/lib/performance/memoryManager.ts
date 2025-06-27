import { QueuedTask } from '../taskQueue';

export interface MemoryConfig {
  maxCompletedTasks: number;
  maxTaskAge: number; // in milliseconds
  cleanupInterval: number; // in milliseconds
  memoryThreshold: number; // in MB
}

export class MemoryManager {
  private config: MemoryConfig;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(config: Partial<MemoryConfig> = {}) {
    this.config = {
      maxCompletedTasks: 1000,
      maxTaskAge: 24 * 60 * 60 * 1000, // 24 hours
      cleanupInterval: 5 * 60 * 1000, // 5 minutes
      memoryThreshold: 100, // 100 MB
      ...config
    };
  }

  /**
   * Start automatic memory management
   */
  start(taskMap: Map<string, QueuedTask>): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = setInterval(() => {
      this.performCleanup(taskMap);
    }, this.config.cleanupInterval);
  }

  /**
   * Stop automatic memory management
   */
  stop(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }

  /**
   * Perform memory cleanup
   */
  performCleanup(taskMap: Map<string, QueuedTask>): {
    removedTasks: number;
    memoryFreed: number;
  } {
    const before = this.getMemoryUsage();
    const initialSize = taskMap.size;

    // Get all completed/failed tasks
    const completedTasks = Array.from(taskMap.entries())
      .filter(([_, task]) => ['completed', 'failed', 'cancelled'].includes(task.status))
      .sort((a, b) => (b[1].completedAt?.getTime() || 0) - (a[1].completedAt?.getTime() || 0));

    let removedCount = 0;

    // Remove old tasks
    const now = Date.now();
    for (const [taskId, task] of completedTasks) {
      const taskAge = now - task.createdAt.getTime();
      
      if (taskAge > this.config.maxTaskAge) {
        taskMap.delete(taskId);
        removedCount++;
      }
    }

    // Remove excess completed tasks (keep most recent)
    if (completedTasks.length > this.config.maxCompletedTasks) {
      const toRemove = completedTasks.slice(this.config.maxCompletedTasks);
      for (const [taskId] of toRemove) {
        taskMap.delete(taskId);
        removedCount++;
      }
    }

    // Force garbage collection if available and memory threshold exceeded
    const memoryUsage = this.getMemoryUsage();
    if (memoryUsage > this.config.memoryThreshold && global.gc) {
      global.gc();
    }

    const after = this.getMemoryUsage();

    return {
      removedTasks: removedCount,
      memoryFreed: before - after
    };
  }

  /**
   * Get current memory usage in MB
   */
  getMemoryUsage(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage().heapUsed / 1024 / 1024;
    }
    return 0;
  }

  /**
   * Get memory statistics
   */
  getMemoryStats(): {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  } {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const usage = process.memoryUsage();
      return {
        heapUsed: usage.heapUsed / 1024 / 1024,
        heapTotal: usage.heapTotal / 1024 / 1024,
        external: usage.external / 1024 / 1024,
        rss: usage.rss / 1024 / 1024
      };
    }
    
    return {
      heapUsed: 0,
      heapTotal: 0,
      external: 0,
      rss: 0
    };
  }

  /**
   * Check if cleanup is needed
   */
  shouldCleanup(taskMap: Map<string, QueuedTask>): boolean {
    const completedTasks = Array.from(taskMap.values())
      .filter(task => ['completed', 'failed', 'cancelled'].includes(task.status));

    return (
      completedTasks.length > this.config.maxCompletedTasks ||
      this.getMemoryUsage() > this.config.memoryThreshold
    );
  }

  /**
   * Manual cleanup trigger
   */
  forceCleanup(taskMap: Map<string, QueuedTask>): void {
    this.performCleanup(taskMap);
  }
}

export const globalMemoryManager = new MemoryManager();