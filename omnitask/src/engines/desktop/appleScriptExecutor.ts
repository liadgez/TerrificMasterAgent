import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface AppleScriptResult {
  success: boolean;
  output?: string;
  error?: string;
  exitCode?: number;
}

export interface AppleScriptConfig {
  timeout?: number;
  maxBuffer?: number;
  encoding?: BufferEncoding;
}

export class AppleScriptExecutor {
  private defaultConfig: AppleScriptConfig = {
    timeout: 30000, // 30 seconds
    maxBuffer: 1024 * 1024, // 1MB
    encoding: 'utf8'
  };

  async executeScript(script: string, config?: AppleScriptConfig): Promise<AppleScriptResult> {
    const finalConfig = { ...this.defaultConfig, ...config };

    try {
      // Validate and sanitize the script
      this.validateScript(script);

      // Execute the AppleScript using osascript
      const command = `osascript -e ${this.escapeScript(script)}`;
      
      const { stdout } = await execAsync(command, {
        timeout: finalConfig.timeout,
        maxBuffer: finalConfig.maxBuffer,
        encoding: finalConfig.encoding
      });

      return {
        success: true,
        output: stdout.toString().trim(),
        exitCode: 0
      };

    } catch (error: unknown) {
      const execError = error as { code?: number; stderr?: string; message?: string };
      
      return {
        success: false,
        error: execError.stderr || execError.message || 'Unknown AppleScript execution error',
        exitCode: execError.code || -1
      };
    }
  }

  async executeScriptFile(filePath: string, config?: AppleScriptConfig): Promise<AppleScriptResult> {
    const finalConfig = { ...this.defaultConfig, ...config };

    try {
      // Execute the AppleScript file using osascript
      const command = `osascript "${filePath}"`;
      
      const { stdout } = await execAsync(command, {
        timeout: finalConfig.timeout,
        maxBuffer: finalConfig.maxBuffer,
        encoding: finalConfig.encoding
      });

      return {
        success: true,
        output: stdout.toString().trim(),
        exitCode: 0
      };

    } catch (error: unknown) {
      const execError = error as { code?: number; stderr?: string; message?: string };
      
      return {
        success: false,
        error: execError.stderr || execError.message || 'Unknown AppleScript file execution error',
        exitCode: execError.code || -1
      };
    }
  }

  private validateScript(script: string): void {
    if (!script || script.trim().length === 0) {
      throw new Error('AppleScript cannot be empty');
    }

    // Check for potentially dangerous commands
    const dangerousPatterns = [
      /do shell script.*rm\s+-rf/i,
      /do shell script.*sudo/i,
      /do shell script.*passwd/i,
      /system events.*delete/i,
      /administrator privileges/i
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(script)) {
        throw new Error('AppleScript contains potentially dangerous commands');
      }
    }

    // Check script length to prevent abuse
    if (script.length > 10000) {
      throw new Error('AppleScript is too long (max 10000 characters)');
    }
  }

  private escapeScript(script: string): string {
    // Escape quotes and special characters for shell execution
    return `"${script.replace(/"/g, '\\"').replace(/\$/g, '\\$').replace(/`/g, '\\`')}"`;
  }

  // Common AppleScript utilities
  async getRunningApplications(): Promise<AppleScriptResult> {
    const script = `
      tell application "System Events"
        set appList to {}
        repeat with proc in (every process whose background only is false)
          set end of appList to name of proc
        end repeat
        return appList as string
      end tell
    `;

    return this.executeScript(script);
  }

  async isApplicationRunning(appName: string): Promise<boolean> {
    const script = `
      tell application "System Events"
        return (name of processes) contains "${appName}"
      end tell
    `;

    const result = await this.executeScript(script);
    return result.success && result.output === 'true';
  }

  async getSystemVolume(): Promise<AppleScriptResult> {
    const script = `
      tell application "System Events"
        return output volume of (get volume settings)
      end tell
    `;

    return this.executeScript(script);
  }

  async setSystemVolume(volume: number): Promise<AppleScriptResult> {
    if (volume < 0 || volume > 100) {
      return {
        success: false,
        error: 'Volume must be between 0 and 100'
      };
    }

    const script = `
      tell application "System Events"
        set volume output volume ${volume}
      end tell
    `;

    return this.executeScript(script);
  }

  async showNotification(title: string, subtitle?: string, message?: string): Promise<AppleScriptResult> {
    let script = `display notification "${title}"`;
    
    if (subtitle) {
      script += ` with title "${subtitle}"`;
    }
    
    if (message) {
      script += ` subtitle "${message}"`;
    }

    return this.executeScript(script);
  }

  async showDialog(message: string, buttons?: string[]): Promise<AppleScriptResult> {
    let script = `display dialog "${message}"`;
    
    if (buttons && buttons.length > 0) {
      const buttonList = buttons.map(btn => `"${btn}"`).join(', ');
      script += ` buttons {${buttonList}}`;
    }

    return this.executeScript(script);
  }

  async getCurrentApplication(): Promise<AppleScriptResult> {
    const script = `
      tell application "System Events"
        set frontApp to name of first application process whose frontmost is true
        return frontApp
      end tell
    `;

    return this.executeScript(script);
  }

  async activateApplication(appName: string): Promise<AppleScriptResult> {
    const script = `
      tell application "${appName}"
        activate
      end tell
    `;

    return this.executeScript(script);
  }

  async quitApplication(appName: string): Promise<AppleScriptResult> {
    const script = `
      tell application "${appName}"
        quit
      end tell
    `;

    return this.executeScript(script);
  }

  async getClipboard(): Promise<AppleScriptResult> {
    const script = `
      tell application "System Events"
        return the clipboard as string
      end tell
    `;

    return this.executeScript(script);
  }

  async setClipboard(text: string): Promise<AppleScriptResult> {
    const script = `
      tell application "System Events"
        set the clipboard to "${text}"
      end tell
    `;

    return this.executeScript(script);
  }

  async getScreenResolution(): Promise<AppleScriptResult> {
    const script = `
      tell application "System Events"
        tell process "Finder"
          set screenBounds to bounds of window of desktop
          return item 3 of screenBounds & "x" & item 4 of screenBounds
        end tell
      end tell
    `;

    return this.executeScript(script);
  }

  async lockScreen(): Promise<AppleScriptResult> {
    const script = `
      tell application "System Events"
        keystroke "q" using {control down, command down}
      end tell
    `;

    return this.executeScript(script);
  }

  async sleep(): Promise<AppleScriptResult> {
    const script = `
      tell application "System Events"
        sleep
      end tell
    `;

    return this.executeScript(script);
  }
}

// Singleton instance
export const globalAppleScriptExecutor = new AppleScriptExecutor();