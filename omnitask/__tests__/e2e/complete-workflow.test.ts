import { parseCommand } from '@/lib/commandParser';
import { validateCommand } from '@/lib/commandValidator';
import { TaskQueue } from '@/lib/taskQueue';
import { WebTaskExecutor } from '@/engines/web/webTaskExecutor';
import { DesktopTaskExecutor } from '@/engines/desktop/desktopTaskExecutor';

// Mock the executors
jest.mock('@/engines/web/webTaskExecutor');
jest.mock('@/engines/desktop/desktopTaskExecutor');

const MockWebTaskExecutor = WebTaskExecutor as jest.MockedClass<typeof WebTaskExecutor>;
const MockDesktopTaskExecutor = DesktopTaskExecutor as jest.MockedClass<typeof DesktopTaskExecutor>;

describe('End-to-End Workflow Tests', () => {
  let taskQueue: TaskQueue;
  let mockWebExecutor: jest.Mocked<WebTaskExecutor>;
  let mockDesktopExecutor: jest.Mocked<DesktopTaskExecutor>;

  beforeEach(() => {
    // Mock web executor
    mockWebExecutor = {
      executeTask: jest.fn()
    } as any;
    MockWebTaskExecutor.mockImplementation(() => mockWebExecutor);

    // Mock desktop executor
    mockDesktopExecutor = {
      executeTask: jest.fn()
    } as any;
    MockDesktopTaskExecutor.mockImplementation(() => mockDesktopExecutor);

    taskQueue = new TaskQueue();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete Shopping Workflow', () => {
    test('should execute multi-step shopping and notification workflow', async () => {
      // Step 1: Search for product
      const searchCommand = 'search for wireless headphones on amazon under $200';
      const searchParsed = parseCommand(searchCommand);
      const searchValidation = validateCommand(searchCommand, searchParsed);

      expect(searchValidation.isValid).toBe(true);

      mockWebExecutor.executeTask.mockResolvedValueOnce({
        success: true,
        data: {
          products: [
            { name: 'Sony WH-1000XM4', price: 179.99, url: 'https://amazon.com/product/1' },
            { name: 'Bose QuietComfort', price: 199.99, url: 'https://amazon.com/product/2' }
          ]
        },
        taskId: 'search-task-1'
      });

      // Step 2: Show desktop notification
      const notificationCommand = 'show notification about found products';
      const notificationParsed = parseCommand(notificationCommand);
      const notificationValidation = validateCommand(notificationCommand, notificationParsed);

      expect(notificationValidation.isValid).toBe(true);

      mockDesktopExecutor.executeTask.mockResolvedValueOnce({
        success: true,
        output: 'Notification displayed',
        taskId: 'notification-task-1'
      });

      // Execute workflow
      await taskQueue.addTask({
        id: 'search-task-1',
        type: 'web',
        category: 'shopping',
        action: 'search',
        parameters: {
          query: 'wireless headphones',
          site: 'amazon',
          maxPrice: 200
        },
        priority: 1,
        maxRetries: 3
      });

      await taskQueue.addTask({
        id: 'notification-task-1',
        type: 'desktop',
        category: 'system',
        action: 'notification',
        parameters: {
          title: 'Shopping Results',
          message: 'Found 2 products matching your criteria'
        },
        priority: 2,
        maxRetries: 1,
        dependencies: ['search-task-1']
      });

      const results = await taskQueue.processTasks();

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
      expect(mockWebExecutor.executeTask).toHaveBeenCalledTimes(1);
      expect(mockDesktopExecutor.executeTask).toHaveBeenCalledTimes(1);
    });

    test('should handle shopping workflow with price monitoring', async () => {
      // Step 1: Monitor price
      mockWebExecutor.executeTask.mockResolvedValueOnce({
        success: true,
        data: { currentPrice: 189.99, previousPrice: 199.99 },
        taskId: 'monitor-task-1'
      });

      // Step 2: Conditional notification based on price drop
      mockDesktopExecutor.executeTask.mockResolvedValueOnce({
        success: true,
        output: 'Price drop alert sent',
        taskId: 'alert-task-1'
      });

      await taskQueue.addTask({
        id: 'monitor-task-1',
        type: 'web',
        category: 'shopping',
        action: 'monitor',
        parameters: {
          url: 'https://amazon.com/product/1',
          targetPrice: 190
        },
        priority: 1,
        maxRetries: 3
      });

      await taskQueue.addTask({
        id: 'alert-task-1',
        type: 'desktop',
        category: 'system',
        action: 'notification',
        parameters: {
          title: 'Price Alert',
          message: 'Price dropped to $189.99!'
        },
        priority: 2,
        maxRetries: 1,
        dependencies: ['monitor-task-1']
      });

      const results = await taskQueue.processTasks();

      expect(results).toHaveLength(2);
      expect(results.every(r => r.success)).toBe(true);
    });
  });

  describe('Productivity Workflow', () => {
    test('should execute morning productivity routine', async () => {
      // Step 1: Open calendar app
      mockDesktopExecutor.executeTask.mockResolvedValueOnce({
        success: true,
        output: 'Calendar opened',
        taskId: 'calendar-task-1'
      });

      // Step 2: Check weather online
      mockWebExecutor.executeTask.mockResolvedValueOnce({
        success: true,
        data: { temperature: '72°F', conditions: 'Sunny' },
        taskId: 'weather-task-1'
      });

      // Step 3: Start focus music
      mockDesktopExecutor.executeTask.mockResolvedValueOnce({
        success: true,
        output: 'Music started',
        taskId: 'music-task-1'
      });

      // Step 4: Set do not disturb
      mockDesktopExecutor.executeTask.mockResolvedValueOnce({
        success: true,
        output: 'Do not disturb enabled',
        taskId: 'dnd-task-1'
      });

      const routineTasks = [
        {
          id: 'calendar-task-1',
          type: 'desktop' as const,
          category: 'application',
          action: 'open',
          parameters: { appName: 'Calendar' },
          priority: 1,
          maxRetries: 2
        },
        {
          id: 'weather-task-1',
          type: 'web' as const,
          category: 'information',
          action: 'fetch',
          parameters: { url: 'https://weather.com', selector: '.current-temp' },
          priority: 1,
          maxRetries: 3
        },
        {
          id: 'music-task-1',
          type: 'desktop' as const,
          category: 'application',
          action: 'control',
          parameters: { appName: 'Spotify', action: 'play', playlist: 'Focus' },
          priority: 2,
          maxRetries: 2,
          dependencies: ['calendar-task-1']
        },
        {
          id: 'dnd-task-1',
          type: 'desktop' as const,
          category: 'system',
          action: 'settings',
          parameters: { setting: 'do_not_disturb', value: true },
          priority: 3,
          maxRetries: 1,
          dependencies: ['music-task-1']
        }
      ];

      for (const task of routineTasks) {
        await taskQueue.addTask(task);
      }

      const results = await taskQueue.processTasks();

      expect(results).toHaveLength(4);
      expect(results.every(r => r.success)).toBe(true);
      expect(mockDesktopExecutor.executeTask).toHaveBeenCalledTimes(3);
      expect(mockWebExecutor.executeTask).toHaveBeenCalledTimes(1);
    });

    test('should handle file organization workflow', async () => {
      // Step 1: Analyze downloads folder
      mockDesktopExecutor.executeTask.mockResolvedValueOnce({
        success: true,
        data: { fileCount: 47, totalSize: '2.3 GB' },
        taskId: 'analyze-task-1'
      });

      // Step 2: Organize files by type
      mockDesktopExecutor.executeTask.mockResolvedValueOnce({
        success: true,
        output: 'Files organized into folders',
        taskId: 'organize-task-1'
      });

      // Step 3: Create backup
      mockDesktopExecutor.executeTask.mockResolvedValueOnce({
        success: true,
        output: 'Backup created successfully',
        taskId: 'backup-task-1'
      });

      await taskQueue.addTask({
        id: 'analyze-task-1',
        type: 'desktop',
        category: 'file',
        action: 'analyze',
        parameters: { folderPath: '~/Downloads' },
        priority: 1,
        maxRetries: 2
      });

      await taskQueue.addTask({
        id: 'organize-task-1',
        type: 'desktop',
        category: 'file',
        action: 'organize',
        parameters: { folderPath: '~/Downloads', method: 'by_extension' },
        priority: 2,
        maxRetries: 3,
        dependencies: ['analyze-task-1']
      });

      await taskQueue.addTask({
        id: 'backup-task-1',
        type: 'desktop',
        category: 'file',
        action: 'backup',
        parameters: { 
          sourcePath: '~/Downloads',
          destinationPath: '~/Backups/Downloads'
        },
        priority: 3,
        maxRetries: 2,
        dependencies: ['organize-task-1']
      });

      const results = await taskQueue.processTasks();

      expect(results).toHaveLength(3);
      expect(results.every(r => r.success)).toBe(true);
    });
  });

  describe('Social Media Workflow', () => {
    test('should execute cross-platform posting workflow', async () => {
      const postContent = 'Just finished an amazing project! #productivity #coding';

      // Step 1: Post to Twitter
      mockWebExecutor.executeTask.mockResolvedValueOnce({
        success: true,
        data: { postId: 'tweet-123', url: 'https://twitter.com/user/status/123' },
        taskId: 'twitter-task-1'
      });

      // Step 2: Post to LinkedIn
      mockWebExecutor.executeTask.mockResolvedValueOnce({
        success: true,
        data: { postId: 'linkedin-456', url: 'https://linkedin.com/posts/456' },
        taskId: 'linkedin-task-1'
      });

      // Step 3: Show success notification
      mockDesktopExecutor.executeTask.mockResolvedValueOnce({
        success: true,
        output: 'Success notification shown',
        taskId: 'success-notification-1'
      });

      await taskQueue.addTask({
        id: 'twitter-task-1',
        type: 'web',
        category: 'social',
        action: 'post',
        parameters: { platform: 'twitter', content: postContent },
        priority: 1,
        maxRetries: 3
      });

      await taskQueue.addTask({
        id: 'linkedin-task-1',
        type: 'web',
        category: 'social',
        action: 'post',
        parameters: { platform: 'linkedin', content: postContent },
        priority: 1,
        maxRetries: 3
      });

      await taskQueue.addTask({
        id: 'success-notification-1',
        type: 'desktop',
        category: 'system',
        action: 'notification',
        parameters: {
          title: 'Social Media',
          message: 'Posted to all platforms successfully'
        },
        priority: 2,
        maxRetries: 1,
        dependencies: ['twitter-task-1', 'linkedin-task-1']
      });

      const results = await taskQueue.processTasks();

      expect(results).toHaveLength(3);
      expect(results.every(r => r.success)).toBe(true);
    });
  });

  describe('Error Handling Workflows', () => {
    test('should handle partial workflow failures gracefully', async () => {
      // Task 1 succeeds
      mockWebExecutor.executeTask.mockResolvedValueOnce({
        success: true,
        data: { result: 'success' },
        taskId: 'task-1'
      });

      // Task 2 fails
      mockWebExecutor.executeTask.mockResolvedValueOnce({
        success: false,
        error: 'Network timeout',
        taskId: 'task-2'
      });

      // Task 3 depends on task 2, should be skipped
      mockDesktopExecutor.executeTask.mockResolvedValueOnce({
        success: true,
        output: 'This should not execute',
        taskId: 'task-3'
      });

      await taskQueue.addTask({
        id: 'task-1',
        type: 'web',
        category: 'test',
        action: 'success',
        parameters: {},
        priority: 1,
        maxRetries: 1
      });

      await taskQueue.addTask({
        id: 'task-2',
        type: 'web',
        category: 'test',
        action: 'fail',
        parameters: {},
        priority: 1,
        maxRetries: 1
      });

      await taskQueue.addTask({
        id: 'task-3',
        type: 'desktop',
        category: 'test',
        action: 'dependent',
        parameters: {},
        priority: 2,
        maxRetries: 1,
        dependencies: ['task-2']
      });

      const results = await taskQueue.processTasks();

      expect(results).toHaveLength(2); // Task 3 should be skipped
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(mockDesktopExecutor.executeTask).not.toHaveBeenCalled();
    });

    test('should retry failed tasks according to configuration', async () => {
      let attemptCount = 0;
      mockWebExecutor.executeTask.mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 3) {
          return Promise.resolve({
            success: false,
            error: 'Temporary failure',
            taskId: 'retry-task-1'
          });
        }
        return Promise.resolve({
          success: true,
          data: { result: 'success on retry' },
          taskId: 'retry-task-1'
        });
      });

      await taskQueue.addTask({
        id: 'retry-task-1',
        type: 'web',
        category: 'test',
        action: 'retry',
        parameters: {},
        priority: 1,
        maxRetries: 3
      });

      const results = await taskQueue.processTasks();

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(attemptCount).toBe(3);
    });
  });

  describe('Performance Workflows', () => {
    test('should handle high-volume task processing', async () => {
      const taskCount = 50;
      const tasks = Array.from({ length: taskCount }, (_, i) => ({
        id: `bulk-task-${i}`,
        type: 'web' as const,
        category: 'test',
        action: 'bulk',
        parameters: { index: i },
        priority: 1,
        maxRetries: 1
      }));

      mockWebExecutor.executeTask.mockResolvedValue({
        success: true,
        data: { processed: true },
        taskId: 'bulk-task'
      });

      const startTime = Date.now();

      for (const task of tasks) {
        await taskQueue.addTask(task);
      }

      const results = await taskQueue.processTasks();
      const endTime = Date.now();

      expect(results).toHaveLength(taskCount);
      expect(results.every(r => r.success)).toBe(true);
      expect(endTime - startTime).toBeLessThan(10000); // Should complete within 10 seconds
    });

    test('should handle concurrent mixed workflows', async () => {
      // Create a mix of web and desktop tasks
      const webTasks = Array.from({ length: 10 }, (_, i) => ({
        id: `web-task-${i}`,
        type: 'web' as const,
        category: 'test',
        action: 'concurrent',
        parameters: { index: i },
        priority: 1,
        maxRetries: 1
      }));

      const desktopTasks = Array.from({ length: 10 }, (_, i) => ({
        id: `desktop-task-${i}`,
        type: 'desktop' as const,
        category: 'test',
        action: 'concurrent',
        parameters: { index: i },
        priority: 1,
        maxRetries: 1
      }));

      mockWebExecutor.executeTask.mockResolvedValue({
        success: true,
        data: { type: 'web' },
        taskId: 'web-task'
      });

      mockDesktopExecutor.executeTask.mockResolvedValue({
        success: true,
        output: 'desktop task completed',
        taskId: 'desktop-task'
      });

      const allTasks = [...webTasks, ...desktopTasks];
      
      for (const task of allTasks) {
        await taskQueue.addTask(task);
      }

      const results = await taskQueue.processTasks();

      expect(results).toHaveLength(20);
      expect(results.every(r => r.success)).toBe(true);
      expect(mockWebExecutor.executeTask).toHaveBeenCalledTimes(10);
      expect(mockDesktopExecutor.executeTask).toHaveBeenCalledTimes(10);
    });
  });
});