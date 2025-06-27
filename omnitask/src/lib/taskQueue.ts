import { ParsedCommand } from './commandParser';
import { TaskClassification } from './taskClassifier';
import { globalMemoryManager } from './performance/memoryManager';

export interface QueuedTask {
  id: string;
  command: ParsedCommand;
  classification: TaskClassification;
  status: 'pending' | 'executing' | 'completed' | 'failed' | 'cancelled';
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  result?: unknown;
  error?: string;
  retryCount: number;
  maxRetries: number;
}

export class TaskQueue {
  private tasks: Map<string, QueuedTask> = new Map();
  private executionQueue: string[] = [];
  private isProcessing = false;
  private maxConcurrentTasks = 3;
  private currentlyExecuting = 0;
  private autoProcess: boolean;
  private sequenceNumber = 0;

  constructor(autoProcess: boolean = true) {
    this.autoProcess = autoProcess;
    
    // Start memory management
    globalMemoryManager.start(this.tasks);
  }

  addTask(command: ParsedCommand, classification: TaskClassification): string {
    const taskId = this.generateTaskId();
    
    const task: QueuedTask = {
      id: taskId,
      command,
      classification,
      status: 'pending',
      createdAt: new Date(),
      retryCount: 0,
      maxRetries: this.getMaxRetries(classification)
    };

    this.tasks.set(taskId, task);
    
    // Add to execution queue based on priority
    this.insertByPriority(taskId);
    
    // Start processing if not already running and auto-processing is enabled
    if (!this.isProcessing && this.autoProcess) {
      this.processQueue();
    }
    
    return taskId;
  }

  private generateTaskId(): string {
    this.sequenceNumber++;
    return `task_${Date.now()}_${this.sequenceNumber.toString(36)}`;
  }

  private getMaxRetries(classification: TaskClassification): number {
    switch (classification.riskLevel) {
      case 'safe':
        return 3;
      case 'moderate':
        return 2;
      case 'high':
        return 1;
      default:
        return 1;
    }
  }

  private insertByPriority(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (!task) return;

    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const taskPriority = priorityOrder[task.classification.priority];

    // Find insertion point based on priority
    let insertIndex = this.executionQueue.length;
    for (let i = 0; i < this.executionQueue.length; i++) {
      const existingTask = this.tasks.get(this.executionQueue[i]);
      if (existingTask) {
        const existingPriority = priorityOrder[existingTask.classification.priority];
        if (taskPriority < existingPriority) {
          insertIndex = i;
          break;
        }
      }
    }

    this.executionQueue.splice(insertIndex, 0, taskId);
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    
    this.isProcessing = true;

    while (this.executionQueue.length > 0 && this.currentlyExecuting < this.maxConcurrentTasks) {
      const taskId = this.executionQueue.shift();
      if (!taskId) continue;

      const task = this.tasks.get(taskId);
      if (!task || task.status !== 'pending') continue;

      this.currentlyExecuting++;
      this.executeTask(task).finally(() => {
        this.currentlyExecuting--;
        // Continue processing after a task completes
        setTimeout(() => this.checkProcessingCompletion(), 0);
      });
    }

    // Initial check for completion
    this.checkProcessingCompletion();
  }

  private checkProcessingCompletion(): void {
    // Check if we're done processing
    if (this.executionQueue.length === 0 && this.currentlyExecuting === 0) {
      this.isProcessing = false;
    } else if (this.executionQueue.length > 0 && this.currentlyExecuting < this.maxConcurrentTasks) {
      // Continue processing if there are more tasks and capacity
      // Reset isProcessing flag to allow processQueue to run
      this.isProcessing = false;
      this.processQueue();
    }
  }

  private async executeTask(task: QueuedTask): Promise<void> {
    try {
      task.status = 'executing';
      task.startedAt = new Date();
      
      // Simulate task execution - replace with actual execution logic
      const result = await this.simulateExecution(task);
      
      task.status = 'completed';
      task.completedAt = new Date();
      task.result = result;
      
    } catch (error) {
      task.error = error instanceof Error ? error.message : 'Unknown error';
      
      // Retry logic
      if (task.retryCount < task.maxRetries) {
        task.retryCount++;
        task.status = 'pending';
        task.startedAt = undefined;
        
        // Re-add to queue with delay
        setTimeout(() => {
          this.executionQueue.unshift(task.id);
          this.processQueue();
        }, 1000 * Math.pow(2, task.retryCount)); // Exponential backoff
        
      } else {
        task.status = 'failed';
        task.completedAt = new Date();
      }
    }
  }

  private async simulateExecution(task: QueuedTask): Promise<unknown> {
    // For tests, just return immediately without delay
    if (process.env.NODE_ENV === 'test' || global.process?.env?.NODE_ENV === 'test') {
      return {
        taskId: task.id,
        type: task.command.type,
        category: task.command.category,
        executedAt: new Date(),
        message: `Simulated execution of ${task.command.type} task: ${task.command.action}`
      };
    }
    
    // For production, simulate actual execution time
    const duration = task.classification.estimatedDuration * 1000;
    await new Promise(resolve => setTimeout(resolve, duration));
    
    return {
      taskId: task.id,
      type: task.command.type,
      category: task.command.category,
      executedAt: new Date(),
      message: `Simulated execution of ${task.command.type} task: ${task.command.action}`
    };
  }

  getTask(taskId: string): QueuedTask | undefined {
    return this.tasks.get(taskId);
  }

  getAllTasks(): QueuedTask[] {
    return Array.from(this.tasks.values()).sort((a, b) => 
      b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  /**
   * Manually process tasks (useful for testing or manual control)
   */
  async processTasks(timeoutMs: number = 5000): Promise<any[]> {
    if (!this.isProcessing) {
      this.processQueue();
    }
    
    // Wait for all tasks to complete with timeout
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const checkCompletion = () => {
        const elapsed = Date.now() - startTime;
        
        if (elapsed > timeoutMs) {
          reject(new Error(`Task processing timeout after ${timeoutMs}ms`));
          return;
        }
        
        if (!this.isProcessing && this.currentlyExecuting === 0) {
          const results = Array.from(this.tasks.values()).map(task => ({
            taskId: task.id,
            success: task.status === 'completed',
            data: task.result,
            error: task.error
          }));
          resolve(results);
        } else {
          setTimeout(checkCompletion, 50);
        }
      };
      checkCompletion();
    });
  }

  getQueueStatus(): {
    pending: number;
    executing: number;
    completed: number;
    failed: number;
    total: number;
  } {
    const tasks = Array.from(this.tasks.values());
    
    return {
      pending: tasks.filter(t => t.status === 'pending').length,
      executing: tasks.filter(t => t.status === 'executing').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      failed: tasks.filter(t => t.status === 'failed').length,
      total: tasks.length
    };
  }

  cancelTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    if (task.status === 'pending') {
      task.status = 'cancelled';
      // Remove from execution queue
      const queueIndex = this.executionQueue.indexOf(taskId);
      if (queueIndex > -1) {
        this.executionQueue.splice(queueIndex, 1);
      }
      return true;
    }

    return false;
  }

  clearCompletedTasks(): number {
    const completedTasks = Array.from(this.tasks.entries())
      .filter(([, task]) => task.status === 'completed' || task.status === 'failed');
    
    completedTasks.forEach(([taskId]) => this.tasks.delete(taskId));
    
    return completedTasks.length;
  }
}

// Singleton instance
export const globalTaskQueue = new TaskQueue();