import { BaseDesktopTask, DesktopTaskResult } from './desktopTaskTemplate';
import { AppleScriptExecutor } from './appleScriptExecutor';
import { ParsedCommand } from '@/lib/commandParser';

export interface NotificationOptions {
  title: string;
  subtitle?: string;
  message?: string;
  sound?: string;
  delay?: number;
}

export class NotificationTask extends BaseDesktopTask {
  name = 'macOS Notifications';
  category = 'system';
  description = 'Display native macOS notifications';

  async execute(command: ParsedCommand, appleScriptExecutor: AppleScriptExecutor): Promise<DesktopTaskResult> {
    const startTime = Date.now();

    try {
      const options = this.parseNotificationOptions(command);
      
      // Add delay if specified
      if (options.delay && options.delay > 0) {
        await new Promise(resolve => setTimeout(resolve, options.delay! * 1000));
      }

      const result = await this.showNotification(options, appleScriptExecutor);

      return {
        success: result.success,
        data: {
          notification: options,
          displayed: result.success
        },
        error: result.error,
        duration: Date.now() - startTime,
        appleScriptOutput: result.output
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Notification display failed',
        duration: Date.now() - startTime
      };
    }
  }

  private parseNotificationOptions(command: ParsedCommand): NotificationOptions {
    const title = command.parameters.title as string || 
                  command.parameters.message as string || 
                  'OmniTask Notification';
                  
    const subtitle = command.parameters.subtitle as string;
    const message = command.parameters.text as string || 
                   command.parameters.body as string;
                   
    const sound = command.parameters.sound as string;
    const delay = command.parameters.delay as number;

    // If no specific parameters, try to extract from command text
    if (!subtitle && !message && !command.parameters.title) {
      const commandText = JSON.stringify(command);
      const cleanText = commandText.replace(/[{}":]/g, ' ').trim();
      
      if (cleanText.length > 0) {
        return {
          title: 'OmniTask',
          message: cleanText.substring(0, 200) // Limit message length
        };
      }
    }

    return {
      title,
      subtitle,
      message,
      sound,
      delay
    };
  }

  private async showNotification(options: NotificationOptions, appleScriptExecutor: AppleScriptExecutor) {
    let script = `display notification "${options.title}"`;
    
    if (options.subtitle) {
      script += ` with title "${options.subtitle}"`;
    }
    
    if (options.message) {
      script += ` subtitle "${options.message}"`;
    }

    if (options.sound) {
      script += ` sound name "${options.sound}"`;
    }

    return await appleScriptExecutor.executeScript(script);
  }
}

export class DialogTask extends BaseDesktopTask {
  name = 'Dialog Boxes';
  category = 'system';
  description = 'Display dialog boxes and alerts';

  async execute(command: ParsedCommand, appleScriptExecutor: AppleScriptExecutor): Promise<DesktopTaskResult> {
    const startTime = Date.now();

    try {
      const dialogConfig = this.parseDialogConfig(command);
      const result = await this.showDialog(dialogConfig, appleScriptExecutor);

      return {
        success: result.success,
        data: {
          dialog: dialogConfig,
          userResponse: result.output
        },
        error: result.error,
        duration: Date.now() - startTime,
        appleScriptOutput: result.output
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Dialog display failed',
        duration: Date.now() - startTime
      };
    }
  }

  private parseDialogConfig(command: ParsedCommand): {
    message: string;
    buttons?: string[];
    defaultButton?: string;
    icon?: string;
  } {
    const message = command.parameters.message as string || 
                   command.parameters.text as string || 
                   'OmniTask Dialog';

    const buttons = command.parameters.buttons as string[];
    const defaultButton = command.parameters.defaultButton as string;
    const icon = command.parameters.icon as string;

    return {
      message,
      buttons,
      defaultButton,
      icon
    };
  }

  private async showDialog(config: {
    message: string;
    buttons?: string[];
    defaultButton?: string;
    icon?: string;
  }, appleScriptExecutor: AppleScriptExecutor) {
    let script = `display dialog "${config.message}"`;
    
    if (config.buttons && config.buttons.length > 0) {
      const buttonList = config.buttons.map(btn => `"${btn}"`).join(', ');
      script += ` buttons {${buttonList}}`;
      
      if (config.defaultButton) {
        script += ` default button "${config.defaultButton}"`;
      }
    }

    if (config.icon) {
      const iconMap: Record<string, string> = {
        'stop': 'stop',
        'note': 'note',
        'caution': 'caution'
      };
      
      const iconValue = iconMap[config.icon.toLowerCase()] || 'note';
      script += ` with icon ${iconValue}`;
    }

    return await appleScriptExecutor.executeScript(script);
  }
}

export class ReminderTask extends BaseDesktopTask {
  name = 'Reminder Notifications';
  category = 'system';
  description = 'Schedule delayed notifications and reminders';

  async execute(command: ParsedCommand, appleScriptExecutor: AppleScriptExecutor): Promise<DesktopTaskResult> {
    const startTime = Date.now();

    try {
      const reminderConfig = this.parseReminderConfig(command);
      
      // Schedule the reminder
      await this.scheduleReminder(reminderConfig, appleScriptExecutor);

      return {
        success: true,
        data: {
          reminder: reminderConfig,
          scheduled: true,
          scheduledAt: new Date().toISOString()
        },
        duration: Date.now() - startTime
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Reminder scheduling failed',
        duration: Date.now() - startTime
      };
    }
  }

  private parseReminderConfig(command: ParsedCommand): {
    message: string;
    delay: number;
    unit: 'seconds' | 'minutes' | 'hours';
  } {
    const message = command.parameters.message as string || 
                   command.parameters.text as string || 
                   'Reminder from OmniTask';

    let delay = command.parameters.delay as number || 0;
    let unit: 'seconds' | 'minutes' | 'hours' = 'minutes';

    // Parse delay from command text
    const commandText = JSON.stringify(command).toLowerCase();
    
    const timePatterns = [
      { pattern: /in (\d+) seconds?/, unit: 'seconds' as const },
      { pattern: /in (\d+) minutes?/, unit: 'minutes' as const },
      { pattern: /in (\d+) hours?/, unit: 'hours' as const },
      { pattern: /(\d+) seconds?/, unit: 'seconds' as const },
      { pattern: /(\d+) minutes?/, unit: 'minutes' as const },
      { pattern: /(\d+) hours?/, unit: 'hours' as const }
    ];

    for (const { pattern, unit: timeUnit } of timePatterns) {
      const match = commandText.match(pattern);
      if (match) {
        delay = parseInt(match[1]);
        unit = timeUnit;
        break;
      }
    }

    // Default to 5 minutes if no delay specified
    if (delay === 0) {
      delay = 5;
      unit = 'minutes';
    }

    return { message, delay, unit };
  }

  private async scheduleReminder(config: {
    message: string;
    delay: number;
    unit: 'seconds' | 'minutes' | 'hours';
  }, appleScriptExecutor: AppleScriptExecutor): Promise<void> {
    // Convert delay to milliseconds
    const multipliers = {
      seconds: 1000,
      minutes: 60 * 1000,
      hours: 60 * 60 * 1000
    };

    const delayMs = config.delay * multipliers[config.unit];

    // Schedule the notification
    setTimeout(async () => {
      try {
        await appleScriptExecutor.showNotification(
          'OmniTask Reminder',
          'Scheduled Reminder',
          config.message
        );
      } catch (error) {
        console.error('Failed to show scheduled reminder:', error);
      }
    }, delayMs);

    return Promise.resolve();
  }
}

export class AlertTask extends BaseDesktopTask {
  name = 'System Alerts';
  category = 'system';
  description = 'Display system alerts and warnings';

  async execute(command: ParsedCommand, appleScriptExecutor: AppleScriptExecutor): Promise<DesktopTaskResult> {
    const startTime = Date.now();

    try {
      const alertConfig = this.parseAlertConfig(command);
      const result = await this.showAlert(alertConfig, appleScriptExecutor);

      return {
        success: result.success,
        data: {
          alert: alertConfig,
          userResponse: result.output
        },
        error: result.error,
        duration: Date.now() - startTime,
        appleScriptOutput: result.output
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Alert display failed',
        duration: Date.now() - startTime
      };
    }
  }

  private parseAlertConfig(command: ParsedCommand): {
    message: string;
    type: 'warning' | 'error' | 'info';
    critical?: boolean;
  } {
    const message = command.parameters.message as string || 
                   command.parameters.text as string || 
                   'System Alert';

    let type: 'warning' | 'error' | 'info' = 'info';
    const commandText = JSON.stringify(command).toLowerCase();

    if (commandText.includes('warning') || commandText.includes('warn')) {
      type = 'warning';
    } else if (commandText.includes('error') || commandText.includes('critical')) {
      type = 'error';
    }

    const critical = command.parameters.critical as boolean || type === 'error';

    return { message, type, critical };
  }

  private async showAlert(config: {
    message: string;
    type: 'warning' | 'error' | 'info';
    critical?: boolean;
  }, appleScriptExecutor: AppleScriptExecutor) {
    let script = `display alert "${config.message}"`;
    
    if (config.critical) {
      script += ' as critical';
    }

    // Add appropriate buttons based on alert type
    if (config.type === 'error') {
      script += ' buttons {"OK"} default button "OK"';
    } else if (config.type === 'warning') {
      script += ' buttons {"Cancel", "Continue"} default button "Continue"';
    }

    return await appleScriptExecutor.executeScript(script);
  }
}

// Registry for notification-related tasks
export const notificationTaskRegistry = new Map<string, BaseDesktopTask>([
  ['notification', new NotificationTask()],
  ['dialog', new DialogTask()],
  ['reminder', new ReminderTask()],
  ['alert', new AlertTask()]
]);