import { AppleScriptExecutor } from '@/engines/desktop/appleScriptExecutor';
import { exec } from 'child_process';

// Mock child_process
jest.mock('child_process');

const mockExec = exec as jest.MockedFunction<typeof exec>;

describe('AppleScript Executor', () => {
  let executor: AppleScriptExecutor;

  beforeEach(() => {
    executor = new AppleScriptExecutor();
    jest.clearAllMocks();
  });

  describe('Script Execution', () => {
    test('should execute simple AppleScript successfully', async () => {
      const mockStdout = 'AppleScript result';
      mockExec.mockImplementation((command, options, callback) => {
        if (callback) {
          callback(null, mockStdout, '');
        }
        return {} as any;
      });

      const result = await executor.executeScript('return "test"');

      expect(result.success).toBe(true);
      expect(result.output).toBe('AppleScript result');
      expect(result.exitCode).toBe(0);
      expect(mockExec).toHaveBeenCalledWith(
        'osascript -e "return \\"test\\""',
        expect.objectContaining({
          timeout: 30000,
          maxBuffer: 1024 * 1024,
          encoding: 'utf8'
        }),
        expect.any(Function)
      );
    });

    test('should handle AppleScript execution errors', async () => {
      const mockError = { code: 1, stderr: 'AppleScript error', message: 'Execution failed' };
      mockExec.mockImplementation((command, options, callback) => {
        if (callback) {
          callback(mockError as any, '', 'AppleScript error');
        }
        return {} as any;
      });

      const result = await executor.executeScript('invalid script');

      expect(result.success).toBe(false);
      expect(result.error).toBe('AppleScript error');
      expect(result.exitCode).toBe(1);
    });

    test('should execute AppleScript file', async () => {
      const mockStdout = 'Script file result';
      mockExec.mockImplementation((command, options, callback) => {
        if (callback) {
          callback(null, mockStdout, '');
        }
        return {} as any;
      });

      const result = await executor.executeScriptFile('/path/to/script.scpt');

      expect(result.success).toBe(true);
      expect(result.output).toBe('Script file result');
      expect(mockExec).toHaveBeenCalledWith(
        'osascript "/path/to/script.scpt"',
        expect.any(Object),
        expect.any(Function)
      );
    });

    test('should use custom configuration', async () => {
      const mockStdout = 'Custom config result';
      mockExec.mockImplementation((command, options, callback) => {
        if (callback) {
          callback(null, mockStdout, '');
        }
        return {} as any;
      });

      const customConfig = {
        timeout: 60000,
        maxBuffer: 2048 * 1024,
        encoding: 'ascii' as BufferEncoding
      };

      const result = await executor.executeScript('return "test"', customConfig);

      expect(result.success).toBe(true);
      expect(mockExec).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining(customConfig),
        expect.any(Function)
      );
    });
  });

  describe('Script Validation', () => {
    test('should reject empty scripts', async () => {
      await expect(executor.executeScript('')).rejects.toThrow('AppleScript cannot be empty');
      await expect(executor.executeScript('   ')).rejects.toThrow('AppleScript cannot be empty');
    });

    test('should reject dangerous commands', async () => {
      const dangerousScripts = [
        'do shell script "rm -rf /"',
        'do shell script "sudo dangerous"',
        'do shell script "passwd"',
        'system events delete',
        'administrator privileges'
      ];

      for (const script of dangerousScripts) {
        await expect(executor.executeScript(script)).rejects.toThrow(
          'AppleScript contains potentially dangerous commands'
        );
      }
    });

    test('should reject overly long scripts', async () => {
      const longScript = 'a'.repeat(10001);
      await expect(executor.executeScript(longScript)).rejects.toThrow(
        'AppleScript is too long (max 10000 characters)'
      );
    });

    test('should accept safe scripts', async () => {
      mockExec.mockImplementation((command, options, callback) => {
        if (callback) {
          callback(null, 'safe result', '');
        }
        return {} as any;
      });

      const safeScripts = [
        'tell application "Finder" to activate',
        'display notification "Hello"',
        'set volume output volume 50'
      ];

      for (const script of safeScripts) {
        const result = await executor.executeScript(script);
        expect(result.success).toBe(true);
      }
    });
  });

  describe('Utility Methods', () => {
    beforeEach(() => {
      mockExec.mockImplementation((command, options, callback) => {
        if (callback) {
          const stdout = command.includes('processes') ? 'Spotify\nFinder\nSafari' :
                        command.includes('volume') ? '75' :
                        command.includes('frontmost') ? 'Safari' :
                        'true';
          callback(null, stdout, '');
        }
        return {} as any;
      });
    });

    test('should get running applications', async () => {
      const result = await executor.getRunningApplications();

      expect(result.success).toBe(true);
      expect(result.output).toContain('Spotify');
    });

    test('should check if application is running', async () => {
      const isRunning = await executor.isApplicationRunning('Spotify');
      expect(isRunning).toBe(true);
    });

    test('should get system volume', async () => {
      const result = await executor.getSystemVolume();

      expect(result.success).toBe(true);
      expect(result.output).toBe('75');
    });

    test('should set system volume', async () => {
      const result = await executor.setSystemVolume(50);

      expect(result.success).toBe(true);
      expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining('set volume output volume 50'),
        expect.any(Object),
        expect.any(Function)
      );
    });

    test('should reject invalid volume values', async () => {
      const result1 = await executor.setSystemVolume(-10);
      const result2 = await executor.setSystemVolume(150);

      expect(result1.success).toBe(false);
      expect(result1.error).toBe('Volume must be between 0 and 100');
      expect(result2.success).toBe(false);
      expect(result2.error).toBe('Volume must be between 0 and 100');
    });

    test('should show notification', async () => {
      const result = await executor.showNotification('Title', 'Subtitle', 'Message');

      expect(result.success).toBe(true);
      expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining('display notification "Title"'),
        expect.any(Object),
        expect.any(Function)
      );
    });

    test('should show dialog', async () => {
      const result = await executor.showDialog('Test message', ['OK', 'Cancel']);

      expect(result.success).toBe(true);
      expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining('display dialog "Test message"'),
        expect.any(Object),
        expect.any(Function)
      );
    });

    test('should get current application', async () => {
      const result = await executor.getCurrentApplication();

      expect(result.success).toBe(true);
      expect(result.output).toBe('Safari');
    });

    test('should activate application', async () => {
      const result = await executor.activateApplication('Spotify');

      expect(result.success).toBe(true);
      expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining('tell application "Spotify"'),
        expect.any(Object),
        expect.any(Function)
      );
    });

    test('should quit application', async () => {
      const result = await executor.quitApplication('Spotify');

      expect(result.success).toBe(true);
      expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining('quit'),
        expect.any(Object),
        expect.any(Function)
      );
    });

    test('should get and set clipboard', async () => {
      mockExec.mockImplementation((command, options, callback) => {
        if (callback) {
          const stdout = command.includes('clipboard as string') ? 'clipboard content' : 'success';
          callback(null, stdout, '');
        }
        return {} as any;
      });

      const getResult = await executor.getClipboard();
      expect(getResult.success).toBe(true);
      expect(getResult.output).toBe('clipboard content');

      const setResult = await executor.setClipboard('new content');
      expect(setResult.success).toBe(true);
    });

    test('should get screen resolution', async () => {
      mockExec.mockImplementation((command, options, callback) => {
        if (callback) {
          callback(null, '1920x1080', '');
        }
        return {} as any;
      });

      const result = await executor.getScreenResolution();

      expect(result.success).toBe(true);
      expect(result.output).toBe('1920x1080');
    });

    test('should lock screen', async () => {
      const result = await executor.lockScreen();

      expect(result.success).toBe(true);
      expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining('keystroke "q" using {control down, command down}'),
        expect.any(Object),
        expect.any(Function)
      );
    });

    test('should sleep system', async () => {
      const result = await executor.sleep();

      expect(result.success).toBe(true);
      expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining('sleep'),
        expect.any(Object),
        expect.any(Function)
      );
    });
  });

  describe('Script Escaping', () => {
    test('should properly escape scripts for shell execution', async () => {
      mockExec.mockImplementation((command, options, callback) => {
        if (callback) {
          callback(null, 'escaped result', '');
        }
        return {} as any;
      });

      const scriptWithQuotes = 'display dialog "Hello \\"World\\""';
      await executor.executeScript(scriptWithQuotes);

      expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining('\\"Hello \\\\\\"World\\\\\\"'),
        expect.any(Object),
        expect.any(Function)
      );
    });

    test('should handle special characters in scripts', async () => {
      mockExec.mockImplementation((command, options, callback) => {
        if (callback) {
          callback(null, 'special chars result', '');
        }
        return {} as any;
      });

      const scriptWithSpecialChars = 'display dialog "Price: $100 `backtick`"';
      await executor.executeScript(scriptWithSpecialChars);

      expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining('\\$100 \\`backtick\\`'),
        expect.any(Object),
        expect.any(Function)
      );
    });
  });
});