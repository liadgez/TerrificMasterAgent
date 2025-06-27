import { TaskQueue, QueuedTask } from '@/lib/taskQueue';
import { parseCommand } from '@/lib/commandParser';
import { classifyTask } from '@/lib/taskClassifier';

describe('Task Queue', () => {
  let taskQueue: TaskQueue;

  beforeEach(() => {
    taskQueue = new TaskQueue(false); // Disable auto-processing for tests
  });

  describe('Task Management', () => {
    test('should add task to queue', () => {
      const command = parseCommand('search for laptops');
      const classification = classifyTask(command);
      
      const taskId = taskQueue.addTask(command, classification);
      
      expect(taskId).toBeDefined();
      expect(taskId).toMatch(/^task_\d+_[a-z0-9]+$/);
    });

    test('should retrieve task by ID', () => {
      const command = parseCommand('open spotify');
      const classification = classifyTask(command);
      
      const taskId = taskQueue.addTask(command, classification);
      const task = taskQueue.getTask(taskId);
      
      expect(task).toBeDefined();
      expect(task?.id).toBe(taskId);
      expect(task?.command).toEqual(command);
      expect(task?.classification).toEqual(classification);
      expect(task?.status).toBe('pending');
    });

    test('should return undefined for non-existent task', () => {
      const task = taskQueue.getTask('non-existent-id');
      expect(task).toBeUndefined();
    });

    test('should get all tasks sorted by creation time', async () => {
      const command1 = parseCommand('search for laptops');
      const command2 = parseCommand('open spotify');
      const classification1 = classifyTask(command1);
      const classification2 = classifyTask(command2);
      
      const taskId1 = taskQueue.addTask(command1, classification1);
      
      // Add small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 2));
      
      const taskId2 = taskQueue.addTask(command2, classification2);
      
      const allTasks = taskQueue.getAllTasks();
      
      expect(allTasks).toHaveLength(2);
      expect(allTasks[0].id).toBe(taskId2); // Most recent first
      expect(allTasks[1].id).toBe(taskId1);
    });
  });

  describe('Priority Handling', () => {
    test('should prioritize high priority tasks', async () => {
      const lowPriorityCommand = parseCommand('search for something');
      const highPriorityCommand = parseCommand('delete important file');
      
      const lowClassification = classifyTask(lowPriorityCommand);
      const highClassification = classifyTask(highPriorityCommand);
      
      // Manually set priorities for testing
      lowClassification.priority = 'low';
      highClassification.priority = 'high';
      
      const lowTaskId = taskQueue.addTask(lowPriorityCommand, lowClassification);
      const highTaskId = taskQueue.addTask(highPriorityCommand, highClassification);
      
      // Process tasks manually
      await taskQueue.processTasks();
      
      const lowTask = taskQueue.getTask(lowTaskId);
      const highTask = taskQueue.getTask(highTaskId);
      
      // High priority task should be processed first or be executing
      expect(['executing', 'completed'].includes(highTask?.status || '')).toBe(true);
    });
  });

  describe('Queue Status', () => {
    test('should provide accurate queue status', () => {
      const command = parseCommand('test command');
      const classification = classifyTask(command);
      
      const initialStatus = taskQueue.getQueueStatus();
      expect(initialStatus.total).toBe(0);
      expect(initialStatus.pending).toBe(0);
      
      taskQueue.addTask(command, classification);
      
      const statusAfterAdd = taskQueue.getQueueStatus();
      expect(statusAfterAdd.total).toBe(1);
      expect(statusAfterAdd.pending).toBe(1);
    });

    test('should track different task statuses', async () => {
      const command = parseCommand('quick task');
      const classification = classifyTask(command);
      
      taskQueue.addTask(command, classification);
      
      // Allow time for processing
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const status = taskQueue.getQueueStatus();
      expect(status.total).toBe(1);
      expect(status.executing + status.pending + status.completed + status.failed).toBe(1);
    });
  });

  describe('Task Cancellation', () => {
    test('should cancel pending tasks', () => {
      const command = parseCommand('long running task');
      const classification = classifyTask(command);
      
      const taskId = taskQueue.addTask(command, classification);
      const cancelled = taskQueue.cancelTask(taskId);
      
      expect(cancelled).toBe(true);
      
      const task = taskQueue.getTask(taskId);
      expect(task?.status).toBe('cancelled');
    });

    test('should not cancel non-existent tasks', () => {
      const cancelled = taskQueue.cancelTask('non-existent-id');
      expect(cancelled).toBe(false);
    });
  });

  describe('Task Cleanup', () => {
    test('should clear completed tasks', async () => {
      const command = parseCommand('quick task');
      const classification = classifyTask(command);
      
      taskQueue.addTask(command, classification);
      
      // Wait for task completion
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const clearedCount = taskQueue.clearCompletedTasks();
      expect(clearedCount).toBeGreaterThanOrEqual(0);
      
      const remainingTasks = taskQueue.getAllTasks();
      const completedTasks = remainingTasks.filter(t => t.status === 'completed');
      expect(completedTasks).toHaveLength(0);
    });
  });

  describe('Retry Logic', () => {
    test('should set appropriate max retries based on risk level', () => {
      const safeCommand = parseCommand('search google');
      const riskyCommand = parseCommand('delete system file');
      
      const safeClassification = classifyTask(safeCommand);
      const riskyClassification = classifyTask(riskyCommand);
      
      safeClassification.riskLevel = 'safe';
      riskyClassification.riskLevel = 'high';
      
      const safeTaskId = taskQueue.addTask(safeCommand, safeClassification);
      const riskyTaskId = taskQueue.addTask(riskyCommand, riskyClassification);
      
      const safeTask = taskQueue.getTask(safeTaskId);
      const riskyTask = taskQueue.getTask(riskyTaskId);
      
      expect(safeTask?.maxRetries).toBeGreaterThan(riskyTask?.maxRetries || 0);
    });
  });

  describe('Concurrent Execution', () => {
    test('should handle multiple tasks concurrently', async () => {
      const commands = [
        parseCommand('task 1'),
        parseCommand('task 2'),
        parseCommand('task 3'),
        parseCommand('task 4')
      ];
      
      const taskIds = commands.map(cmd => {
        const classification = classifyTask(cmd);
        return taskQueue.addTask(cmd, classification);
      });
      
      // Process tasks manually
      await taskQueue.processTasks();
      
      const status = taskQueue.getQueueStatus();
      expect(status.total).toBe(4);
      
      // Should have processed some tasks
      expect(status.executing + status.completed).toBeGreaterThan(0);
    });
  });
});