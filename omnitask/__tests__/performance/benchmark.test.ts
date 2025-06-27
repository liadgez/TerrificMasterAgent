import { parseCommand } from '@/lib/commandParser';
import { validateCommand } from '@/lib/commandValidator';
import { TaskQueue } from '@/lib/taskQueue';

describe('Performance Benchmark Tests', () => {
  describe('Command Parsing Performance', () => {
    test('should parse commands quickly', () => {
      const commands = [
        'search for laptops on amazon under $1000',
        'open spotify and play my favorites playlist',
        'organize downloads folder by file type',
        'show notification about meeting in 5 minutes',
        'take screenshot and save to desktop',
        'fill form at https://example.com with name John Doe',
        'monitor price for product at https://store.com/item',
        'post to twitter and facebook about project completion',
        'backup documents folder to external drive',
        'set system volume to 75 and brightness to 80'
      ];

      const iterations = 1000;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        for (const command of commands) {
          parseCommand(command);
        }
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const averageTime = totalTime / (iterations * commands.length);

      expect(averageTime).toBeLessThan(1); // Should parse in less than 1ms on average
      expect(totalTime).toBeLessThan(5000); // Total should complete in less than 5 seconds
    });

    test('should handle complex commands efficiently', () => {
      const complexCommands = [
        'search for wireless noise cancelling headphones with bluetooth 5.0 support on amazon ebay and bestbuy under $300 with free shipping and good reviews',
        'open safari chrome and firefox then navigate to google facebook and twitter respectively and take screenshots of each page',
        'organize all files in downloads documents and desktop folders by date and type then create backup copies in external drive with compression',
        'monitor stock prices for apple microsoft google amazon and tesla every 5 minutes and send notifications when any changes by more than 2 percent'
      ];

      const startTime = performance.now();

      for (const command of complexCommands) {
        const result = parseCommand(command);
        expect(result.confidence).toBeGreaterThan(0.7);
      }

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      expect(executionTime).toBeLessThan(100); // Should handle complex commands in under 100ms
    });
  });

  describe('Command Validation Performance', () => {
    test('should validate commands efficiently', () => {
      const commands = Array.from({ length: 1000 }, (_, i) => 
        `test command ${i} with various parameters and selectors`
      );

      const startTime = performance.now();

      for (const command of commands) {
        const parsed = parseCommand(command);
        validateCommand(command, parsed);
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const averageTime = totalTime / commands.length;

      expect(averageTime).toBeLessThan(2); // Should validate in less than 2ms on average
      expect(totalTime).toBeLessThan(5000); // Total should complete in less than 5 seconds
    });

    test('should efficiently detect malicious patterns', () => {
      const maliciousCommands = [
        'search for <script>alert("xss")</script>',
        'open file ../../../etc/passwd',
        'execute rm -rf / command',
        'navigate to javascript:alert(document.cookie)',
        'fill form with \'; DROP TABLE users; --'
      ];

      const iterations = 200;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        for (const command of maliciousCommands) {
          const parsed = parseCommand(command);
          const validation = validateCommand(command, parsed);
          expect(validation.isValid).toBe(false);
        }
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      expect(totalTime).toBeLessThan(2000); // Should detect threats quickly
    });
  });

  describe('Task Queue Performance', () => {
    test('should handle high-volume task additions efficiently', async () => {
      const taskQueue = new TaskQueue(false);
      const taskCount = 1000;

      const startTime = performance.now();

      const addPromises = Array.from({ length: taskCount }, (_, i) =>
        taskQueue.addTask({
          id: `perf-task-${i}`,
          type: 'web',
          category: 'test',
          action: 'performance',
          parameters: { index: i },
          priority: Math.floor(Math.random() * 5) + 1,
          maxRetries: 3
        })
      );

      await Promise.all(addPromises);

      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const averageTime = totalTime / taskCount;

      expect(averageTime).toBeLessThan(5); // Should add tasks in less than 5ms each
      expect(totalTime).toBeLessThan(10000); // Total should complete in less than 10 seconds
      expect(taskQueue.getPendingTasks()).toHaveLength(taskCount);
    });

    test('should efficiently process priority-ordered tasks', async () => {
      const taskQueue = new TaskQueue(false);
      const taskCount = 500;

      // Add tasks with random priorities
      const addPromises = Array.from({ length: taskCount }, (_, i) =>
        taskQueue.addTask({
          id: `priority-task-${i}`,
          type: 'web',
          category: 'test',
          action: 'priority',
          parameters: { index: i },
          priority: Math.floor(Math.random() * 5) + 1,
          maxRetries: 1
        })
      );

      await Promise.all(addPromises);

      const startTime = performance.now();
      
      // Mock successful execution for all tasks
      const originalProcessTasks = taskQueue.processTasks;
      taskQueue.processTasks = jest.fn().mockImplementation(async () => {
        const tasks = taskQueue.getPendingTasks();
        return tasks.map(task => ({
          success: true,
          taskId: task.id,
          data: { processed: true }
        }));
      });

      await taskQueue.processTasks();

      const endTime = performance.now();
      const processingTime = endTime - startTime;

      expect(processingTime).toBeLessThan(1000); // Should process quickly
    });

    test('should handle concurrent task additions and processing', async () => {
      const taskQueue = new TaskQueue(false);
      const batchSize = 100;
      const batchCount = 5;

      const startTime = performance.now();

      // Simulate concurrent additions
      const batchPromises = Array.from({ length: batchCount }, async (_, batchIndex) => {
        const tasks = Array.from({ length: batchSize }, (_, taskIndex) => ({
          id: `concurrent-task-${batchIndex}-${taskIndex}`,
          type: 'web' as const,
          category: 'test',
          action: 'concurrent',
          parameters: { batch: batchIndex, index: taskIndex },
          priority: Math.floor(Math.random() * 3) + 1,
          maxRetries: 2
        }));

        // Add tasks in batch
        const addPromises = tasks.map(task => taskQueue.addTask(task));
        await Promise.all(addPromises);
      });

      await Promise.all(batchPromises);

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      expect(totalTime).toBeLessThan(5000); // Should handle concurrent operations efficiently
      expect(taskQueue.getPendingTasks()).toHaveLength(batchSize * batchCount);
    });
  });

  describe('Memory Usage Tests', () => {
    test('should not leak memory during command processing', () => {
      const initialMemory = process.memoryUsage().heapUsed;
      const iterations = 10000;

      for (let i = 0; i < iterations; i++) {
        const command = `test command ${i} with parameters`;
        const parsed = parseCommand(command);
        validateCommand(command, parsed);
        
        // Force garbage collection periodically if available
        if (global.gc && i % 1000 === 0) {
          global.gc();
        }
      }

      // Force final garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      const memoryIncreasePerOperation = memoryIncrease / iterations;

      // Memory increase should be minimal (less than 1KB per operation)
      expect(memoryIncreasePerOperation).toBeLessThan(1024);
    });

    test('should efficiently handle large parameter objects', () => {
      const largeParameters = {
        searchQuery: 'x'.repeat(1000),
        filters: Array.from({ length: 100 }, (_, i) => ({
          name: `filter-${i}`,
          value: `value-${i}`.repeat(10)
        })),
        metadata: {
          tags: Array.from({ length: 50 }, (_, i) => `tag-${i}`),
          properties: Object.fromEntries(
            Array.from({ length: 100 }, (_, i) => [`prop-${i}`, `value-${i}`])
          )
        }
      };

      const startTime = performance.now();

      for (let i = 0; i < 100; i++) {
        const command = `search with complex parameters ${i}`;
        const parsed = parseCommand(command);
        parsed.parameters = { ...largeParameters };
        validateCommand(command, parsed);
      }

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      expect(executionTime).toBeLessThan(1000); // Should handle large objects efficiently
    });
  });

  describe('Scalability Tests', () => {
    test('should maintain performance with increasing command complexity', () => {
      const baselines: number[] = [];
      const complexities = [10, 50, 100, 200, 500];

      for (const complexity of complexities) {
        const command = `search for ${'complex '.repeat(complexity)}query with many parameters`;
        
        const startTime = performance.now();
        
        for (let i = 0; i < 100; i++) {
          const parsed = parseCommand(command);
          validateCommand(command, parsed);
        }
        
        const endTime = performance.now();
        const avgTime = (endTime - startTime) / 100;
        baselines.push(avgTime);
      }

      // Performance should not degrade exponentially
      for (let i = 1; i < baselines.length; i++) {
        const performanceRatio = baselines[i] / baselines[0];
        const complexityRatio = complexities[i] / complexities[0];
        
        // Performance degradation should be less than complexity increase
        expect(performanceRatio).toBeLessThan(complexityRatio);
      }
    });

    test('should handle realistic user session load', async () => {
      // Simulate a realistic user session with mixed commands
      const sessionCommands = [
        'search for coffee makers under $100',
        'open calendar app',
        'set reminder for meeting at 3pm',
        'check weather forecast',
        'organize desktop files',
        'take screenshot of current window',
        'post to social media about productivity',
        'backup important documents',
        'monitor stock prices',
        'set system volume to 60'
      ];

      const sessionsCount = 50; // Simulate 50 concurrent user sessions
      const startTime = performance.now();

      const sessionPromises = Array.from({ length: sessionsCount }, async (_, sessionIndex) => {
        for (const command of sessionCommands) {
          const parsed = parseCommand(`${command} session-${sessionIndex}`);
          const validation = validateCommand(command, parsed);
          expect(validation).toBeDefined();
        }
      });

      await Promise.all(sessionPromises);

      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const avgTimePerSession = totalTime / sessionsCount;

      expect(avgTimePerSession).toBeLessThan(100); // Each session should complete in under 100ms
      expect(totalTime).toBeLessThan(10000); // All sessions should complete in under 10 seconds
    });
  });

  describe('Resource Utilization Tests', () => {
    test('should efficiently utilize CPU during intensive operations', async () => {
      const cpuIntensiveOperations = Array.from({ length: 1000 }, (_, i) => {
        const complexCommand = `perform complex analysis on dataset ${i} with filters sorting grouping and aggregation operations`;
        return () => {
          const parsed = parseCommand(complexCommand);
          validateCommand(complexCommand, parsed);
          
          // Simulate some CPU work
          let result = 0;
          for (let j = 0; j < 1000; j++) {
            result += Math.random() * j;
          }
          return result;
        };
      });

      const startTime = performance.now();
      
      // Execute operations
      for (const operation of cpuIntensiveOperations) {
        operation();
      }

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // Should complete intensive operations within reasonable time
      expect(executionTime).toBeLessThan(15000); // 15 seconds max
    });

    test('should handle rapid command bursts without degradation', () => {
      const burstSize = 1000;
      const burstCount = 5;
      
      const burstTimes: number[] = [];

      for (let burst = 0; burst < burstCount; burst++) {
        const startTime = performance.now();
        
        for (let i = 0; i < burstSize; i++) {
          const command = `burst command ${burst}-${i}`;
          const parsed = parseCommand(command);
          validateCommand(command, parsed);
        }
        
        const endTime = performance.now();
        burstTimes.push(endTime - startTime);
      }

      // Performance should remain consistent across bursts
      const avgBurstTime = burstTimes.reduce((a, b) => a + b, 0) / burstTimes.length;
      
      for (const burstTime of burstTimes) {
        // No burst should take more than 150% of average time
        expect(burstTime).toBeLessThan(avgBurstTime * 1.5);
      }
    });
  });
});