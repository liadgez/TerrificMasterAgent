import { globalAppleScriptExecutor } from './appleScriptExecutor';
import { desktopTaskRegistry } from './desktopTaskTemplate';
import { FileSystemTask, FinderTask } from './fileSystemTasks';
import { SpotifyControlTask, BrowserControlTask, TextEditorTask } from './applicationTasks';
import { NotificationTask, DialogTask, ReminderTask, AlertTask } from './notificationTasks';
import { ParsedCommand } from '@/lib/commandParser';
import { DesktopTaskResult } from './desktopTaskTemplate';

// Register all desktop tasks
const allDesktopTasks = new Map([
  // Base tasks
  ...desktopTaskRegistry,
  
  // File system tasks
  ['file_operation', new FileSystemTask()],
  ['finder', new FinderTask()],
  
  // Application control tasks
  ['spotify', new SpotifyControlTask()],
  ['browser', new BrowserControlTask()],
  ['text_editor', new TextEditorTask()],
  
  // Notification tasks
  ['notification', new NotificationTask()],
  ['dialog', new DialogTask()],
  ['reminder', new ReminderTask()],
  ['alert', new AlertTask()]
]);

export class DesktopExecutor {
  async executeDesktopTask(command: ParsedCommand): Promise<DesktopTaskResult> {
    const startTime = Date.now();

    try {
      // Determine which task to execute based on command
      const taskKey = this.determineTaskType(command);
      const task = allDesktopTasks.get(taskKey);

      if (!task) {
        throw new Error(`Unsupported desktop task type: ${taskKey}`);
      }

      console.log(`Executing desktop task: ${task.name} (${task.category})`);
      
      // Execute the task
      const result = await task.execute(command, globalAppleScriptExecutor);

      return {
        ...result,
        data: {
          ...(result.data as Record<string, unknown> || {}),
          taskType: taskKey,
          taskName: task.name,
          category: task.category,
          executedAt: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('Desktop task execution failed:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown desktop execution error',
        duration: Date.now() - startTime
      };
    }
  }

  private determineTaskType(command: ParsedCommand): string {
    const { category, action, parameters } = command;
    const commandText = JSON.stringify(command).toLowerCase();

    // Application-specific tasks
    if (commandText.includes('spotify') || category === 'music') {
      return 'spotify';
    }

    if (commandText.includes('browser') || commandText.includes('chrome') || commandText.includes('safari')) {
      return 'browser';
    }

    if (commandText.includes('note') || commandText.includes('textedit') || commandText.includes('editor')) {
      return 'text_editor';
    }

    // File system tasks
    if (category === 'files' || this.isFileOperation(action)) {
      if (commandText.includes('finder') || commandText.includes('folder')) {
        return 'finder';
      }
      return 'file_operation';
    }

    // System control tasks
    if (category === 'system') {
      if (commandText.includes('notification') || commandText.includes('notify')) {
        return 'notification';
      }
      if (commandText.includes('dialog') || commandText.includes('ask')) {
        return 'dialog';
      }
      if (commandText.includes('reminder') || commandText.includes('remind')) {
        return 'reminder';
      }
      if (commandText.includes('alert') || commandText.includes('warning')) {
        return 'alert';
      }
      return 'system_control';
    }

    // App launching
    if (category === 'apps' || action === 'open' || action === 'launch' || action === 'start') {
      if (parameters.appName || this.hasAppReference(commandText)) {
        return 'launch_app';
      }
    }

    // Music/media control
    if (this.isMusicCommand(commandText)) {
      return 'spotify';
    }

    // Clipboard operations
    if (commandText.includes('clipboard') || commandText.includes('copy') || commandText.includes('paste')) {
      return 'clipboard';
    }

    // Default based on action
    switch (action) {
      case 'open':
      case 'launch':
      case 'start':
        if (commandText.includes('app') || commandText.includes('application')) {
          return 'launch_app';
        }
        return 'file_operation';
      
      case 'play':
      case 'pause':
      case 'stop':
        return 'spotify';
      
      case 'create':
      case 'delete':
      case 'move':
      case 'copy':
        return 'file_operation';
      
      case 'notify':
      case 'show':
        return 'notification';
      
      default:
        // Try to determine from content
        if (this.hasAppReference(commandText)) {
          return 'launch_app';
        }
        if (this.isFileOperation(action)) {
          return 'file_operation';
        }
        return 'system_control';
    }
  }

  private isFileOperation(action: string): boolean {
    const fileActions = ['create', 'delete', 'move', 'copy', 'read', 'list', 'search', 'find'];
    return fileActions.includes(action.toLowerCase());
  }

  private hasAppReference(commandText: string): boolean {
    const appKeywords = [
      'spotify', 'chrome', 'safari', 'finder', 'terminal', 'calculator',
      'notes', 'calendar', 'mail', 'messages', 'facetime', 'photos',
      'music', 'tv', 'podcasts', 'news', 'weather', 'stocks'
    ];
    
    return appKeywords.some(keyword => commandText.includes(keyword));
  }

  private isMusicCommand(commandText: string): boolean {
    const musicKeywords = ['play', 'pause', 'stop', 'next', 'previous', 'song', 'music', 'playlist', 'volume'];
    return musicKeywords.some(keyword => commandText.includes(keyword));
  }

  getAvailableTasks(): Array<{ key: string; name: string; category: string; description: string }> {
    return Array.from(allDesktopTasks.entries()).map(([key, task]) => ({
      key,
      name: task.name,
      category: task.category,
      description: task.description
    }));
  }

  isTaskSupported(taskKey: string): boolean {
    return allDesktopTasks.has(taskKey);
  }

  async testAppleScript(): Promise<{ success: boolean; version?: string; error?: string }> {
    try {
      const result = await globalAppleScriptExecutor.executeScript('return "AppleScript test successful"');
      return {
        success: result.success,
        version: result.output,
        error: result.error
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'AppleScript test failed'
      };
    }
  }
}

// Singleton instance
export const globalDesktopExecutor = new DesktopExecutor();