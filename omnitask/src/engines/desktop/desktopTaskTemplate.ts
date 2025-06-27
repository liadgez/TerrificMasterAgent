import { AppleScriptExecutor } from './appleScriptExecutor';
import { ParsedCommand } from '@/lib/commandParser';

export interface DesktopTaskResult {
  success: boolean;
  data?: unknown;
  error?: string;
  duration: number;
  appleScriptOutput?: string;
}

export interface DesktopTaskTemplate {
  name: string;
  category: string;
  description: string;
  execute(command: ParsedCommand, appleScriptExecutor: AppleScriptExecutor): Promise<DesktopTaskResult>;
}

export abstract class BaseDesktopTask implements DesktopTaskTemplate {
  abstract name: string;
  abstract category: string;
  abstract description: string;

  protected async withErrorHandling<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`${operationName} failed: ${errorMessage}`);
    }
  }

  abstract execute(command: ParsedCommand, appleScriptExecutor: AppleScriptExecutor): Promise<DesktopTaskResult>;
}

export class ApplicationLaunchTask extends BaseDesktopTask {
  name = 'Application Launch';
  category = 'apps';
  description = 'Launch applications on macOS';

  async execute(command: ParsedCommand, appleScriptExecutor: AppleScriptExecutor): Promise<DesktopTaskResult> {
    const startTime = Date.now();

    try {
      const appName = this.extractAppName(command);
      
      // Check if app is already running
      const isRunning = await appleScriptExecutor.isApplicationRunning(appName);
      
      if (isRunning) {
        // Just activate the app if it's already running
        const result = await appleScriptExecutor.activateApplication(appName);
        
        return {
          success: result.success,
          data: {
            appName,
            action: 'activated',
            wasAlreadyRunning: true
          },
          error: result.error,
          duration: Date.now() - startTime,
          appleScriptOutput: result.output
        };
      } else {
        // Launch the app
        const result = await appleScriptExecutor.activateApplication(appName);
        
        return {
          success: result.success,
          data: {
            appName,
            action: 'launched',
            wasAlreadyRunning: false
          },
          error: result.error,
          duration: Date.now() - startTime,
          appleScriptOutput: result.output
        };
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'App launch failed',
        duration: Date.now() - startTime
      };
    }
  }

  private extractAppName(command: ParsedCommand): string {
    const appName = command.parameters.appName as string;
    if (appName) {
      return this.normalizeAppName(appName);
    }

    // Try to extract from command text
    const commandText = JSON.stringify(command).toLowerCase();
    
    // Common app mappings
    const appMappings: Record<string, string> = {
      'spotify': 'Spotify',
      'chrome': 'Google Chrome',
      'safari': 'Safari',
      'finder': 'Finder',
      'terminal': 'Terminal',
      'calculator': 'Calculator',
      'notes': 'Notes',
      'calendar': 'Calendar',
      'mail': 'Mail',
      'messages': 'Messages',
      'facetime': 'FaceTime',
      'photos': 'Photos',
      'music': 'Music',
      'tv': 'TV',
      'podcasts': 'Podcasts',
      'news': 'News',
      'weather': 'Weather',
      'stocks': 'Stocks',
      'maps': 'Maps',
      'contacts': 'Contacts',
      'reminders': 'Reminders',
      'voice memos': 'Voice Memos',
      'garage band': 'GarageBand',
      'imovie': 'iMovie',
      'keynote': 'Keynote',
      'pages': 'Pages',
      'numbers': 'Numbers'
    };

    for (const [keyword, appName] of Object.entries(appMappings)) {
      if (commandText.includes(keyword)) {
        return appName;
      }
    }

    throw new Error('Could not determine application name from command');
  }

  private normalizeAppName(appName: string): string {
    // Remove common prefixes and normalize
    const normalized = appName
      .replace(/^(the\s+)?app\s+/i, '')
      .replace(/^application\s+/i, '')
      .trim();

    // Capitalize first letter of each word
    return normalized.replace(/\b\w/g, l => l.toUpperCase());
  }
}

export class SystemControlTask extends BaseDesktopTask {
  name = 'System Control';
  category = 'system';
  description = 'Control system settings and functions';

  async execute(command: ParsedCommand, appleScriptExecutor: AppleScriptExecutor): Promise<DesktopTaskResult> {
    const startTime = Date.now();

    try {
      const action = this.determineSystemAction(command);
      let result;

      switch (action.type) {
        case 'volume':
          result = await this.handleVolumeControl(action, appleScriptExecutor);
          break;
        
        case 'sleep':
          result = await appleScriptExecutor.sleep();
          break;
        
        case 'lock':
          result = await appleScriptExecutor.lockScreen();
          break;
        
        case 'notification':
          result = await this.handleNotification(action, appleScriptExecutor);
          break;
        
        default:
          throw new Error(`Unsupported system action: ${action.type}`);
      }

      return {
        success: result.success,
        data: {
          action: action.type,
          parameters: action.parameters
        },
        error: result.error,
        duration: Date.now() - startTime,
        appleScriptOutput: result.output
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'System control failed',
        duration: Date.now() - startTime
      };
    }
  }

  private determineSystemAction(command: ParsedCommand): { type: string; parameters?: unknown } {
    const commandText = JSON.stringify(command).toLowerCase();

    if (commandText.includes('volume')) {
      const volumeMatch = commandText.match(/(\d+)/);
      const volume = volumeMatch ? parseInt(volumeMatch[1]) : undefined;
      
      if (commandText.includes('mute') || volume === 0) {
        return { type: 'volume', parameters: { volume: 0 } };
      } else if (volume !== undefined) {
        return { type: 'volume', parameters: { volume } };
      } else if (commandText.includes('up') || commandText.includes('increase')) {
        return { type: 'volume', parameters: { direction: 'up' } };
      } else if (commandText.includes('down') || commandText.includes('decrease')) {
        return { type: 'volume', parameters: { direction: 'down' } };
      }
    }

    if (commandText.includes('sleep')) {
      return { type: 'sleep' };
    }

    if (commandText.includes('lock')) {
      return { type: 'lock' };
    }

    if (commandText.includes('notification') || commandText.includes('notify')) {
      const title = command.parameters.title as string || 'OmniTask';
      const message = command.parameters.message as string || 'Task completed';
      return { 
        type: 'notification', 
        parameters: { title, message } 
      };
    }

    throw new Error('Could not determine system action from command');
  }

  private async handleVolumeControl(
    action: { parameters?: unknown }, 
    appleScriptExecutor: AppleScriptExecutor
  ) {
    const params = action.parameters as { volume?: number; direction?: string } | undefined;
    
    if (params?.volume !== undefined) {
      return await appleScriptExecutor.setSystemVolume(params.volume);
    }

    if (params?.direction) {
      // Get current volume first
      const currentVolumeResult = await appleScriptExecutor.getSystemVolume();
      if (!currentVolumeResult.success) {
        return currentVolumeResult;
      }

      const currentVolume = parseInt(currentVolumeResult.output || '50');
      const step = 10;
      
      let newVolume: number;
      if (params.direction === 'up') {
        newVolume = Math.min(100, currentVolume + step);
      } else {
        newVolume = Math.max(0, currentVolume - step);
      }

      return await appleScriptExecutor.setSystemVolume(newVolume);
    }

    throw new Error('Invalid volume control parameters');
  }

  private async handleNotification(
    action: { parameters?: unknown },
    appleScriptExecutor: AppleScriptExecutor
  ) {
    const params = action.parameters as { title?: string; message?: string } | undefined;
    const title = params?.title || 'OmniTask';
    const message = params?.message || 'Notification';
    
    return await appleScriptExecutor.showNotification(title, message);
  }
}

export class ClipboardTask extends BaseDesktopTask {
  name = 'Clipboard Management';
  category = 'system';
  description = 'Manage clipboard content';

  async execute(command: ParsedCommand, appleScriptExecutor: AppleScriptExecutor): Promise<DesktopTaskResult> {
    const startTime = Date.now();

    try {
      const action = this.determineClipboardAction(command);
      let result;

      switch (action.type) {
        case 'get':
          result = await appleScriptExecutor.getClipboard();
          break;
        
        case 'set':
          const params = action.parameters as { text?: string };
          const text = params.text!;
          result = await appleScriptExecutor.setClipboard(text);
          break;
        
        default:
          throw new Error(`Unsupported clipboard action: ${action.type}`);
      }

      return {
        success: result.success,
        data: {
          action: action.type,
          content: action.type === 'get' ? result.output : (action.parameters as { text?: string }).text
        },
        error: result.error,
        duration: Date.now() - startTime,
        appleScriptOutput: result.output
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Clipboard operation failed',
        duration: Date.now() - startTime
      };
    }
  }

  private determineClipboardAction(command: ParsedCommand): { type: string; parameters: { text?: string } } {
    const commandText = JSON.stringify(command).toLowerCase();

    if (commandText.includes('copy') || commandText.includes('set')) {
      const text = command.parameters.text as string;
      if (!text) {
        throw new Error('Text parameter required for clipboard set operation');
      }
      return { type: 'set', parameters: { text } };
    }

    if (commandText.includes('get') || commandText.includes('paste') || commandText.includes('clipboard')) {
      return { type: 'get', parameters: {} };
    }

    throw new Error('Could not determine clipboard action from command');
  }
}

// Registry of available desktop tasks
export const desktopTaskRegistry = new Map<string, DesktopTaskTemplate>([
  ['launch_app', new ApplicationLaunchTask()],
  ['app_launch', new ApplicationLaunchTask()],
  ['system_control', new SystemControlTask()],
  ['clipboard', new ClipboardTask()]
]);