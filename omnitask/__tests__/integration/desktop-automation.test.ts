import { DesktopTaskExecutor } from '@/engines/desktop/desktopTaskExecutor';
import { AppleScriptExecutor } from '@/engines/desktop/appleScriptExecutor';
import { parseCommand } from '@/lib/commandParser';
import { validateCommand } from '@/lib/commandValidator';

// Mock AppleScript executor
jest.mock('@/engines/desktop/appleScriptExecutor');

const MockAppleScriptExecutor = AppleScriptExecutor as jest.MockedClass<typeof AppleScriptExecutor>;

describe('Desktop Automation Integration Tests', () => {
  let desktopExecutor: DesktopTaskExecutor;
  let mockAppleScriptExecutor: jest.Mocked<AppleScriptExecutor>;

  beforeEach(() => {
    MockAppleScriptExecutor.mockClear();
    mockAppleScriptExecutor = {
      executeScript: jest.fn(),
      executeScriptFile: jest.fn(),
      getRunningApplications: jest.fn(),
      isApplicationRunning: jest.fn(),
      activateApplication: jest.fn(),
      quitApplication: jest.fn(),
      getSystemVolume: jest.fn(),
      setSystemVolume: jest.fn(),
      showNotification: jest.fn(),
      showDialog: jest.fn(),
      getCurrentApplication: jest.fn(),
      getClipboard: jest.fn(),
      setClipboard: jest.fn(),
      getScreenResolution: jest.fn(),
      lockScreen: jest.fn(),
      sleep: jest.fn()
    } as any;

    MockAppleScriptExecutor.mockImplementation(() => mockAppleScriptExecutor);
    desktopExecutor = new DesktopTaskExecutor();
  });

  describe('Application Management Integration', () => {
    test('should execute complete app workflow', async () => {
      const command = 'open spotify and play my favorites playlist';
      const parsed = parseCommand(command);
      const validation = validateCommand(command, parsed);

      expect(validation.isValid).toBe(true);
      expect(parsed.type).toBe('desktop');
      expect(parsed.category).toBe('application');

      mockAppleScriptExecutor.isApplicationRunning.mockResolvedValue(false);
      mockAppleScriptExecutor.activateApplication.mockResolvedValue({
        success: true,
        output: 'Application activated',
        exitCode: 0
      });
      mockAppleScriptExecutor.executeScript.mockResolvedValue({
        success: true,
        output: 'Playlist playing',
        exitCode: 0
      });

      const result = await desktopExecutor.executeTask({
        type: 'desktop',
        category: 'application',
        action: 'launch_and_control',
        parameters: {
          appName: 'Spotify',
          action: 'play',
          target: 'favorites playlist'
        }
      });

      expect(result.success).toBe(true);
      expect(mockAppleScriptExecutor.activateApplication).toHaveBeenCalledWith('Spotify');
      expect(mockAppleScriptExecutor.executeScript).toHaveBeenCalled();
    });

    test('should handle application switching workflow', async () => {
      mockAppleScriptExecutor.getCurrentApplication.mockResolvedValue({
        success: true,
        output: 'Safari',
        exitCode: 0
      });
      mockAppleScriptExecutor.activateApplication.mockResolvedValue({
        success: true,
        output: 'Switched to Terminal',
        exitCode: 0
      });

      const result = await desktopExecutor.executeTask({
        type: 'desktop',
        category: 'application',
        action: 'switch',
        parameters: {
          appName: 'Terminal'
        }
      });

      expect(result.success).toBe(true);
      expect(mockAppleScriptExecutor.getCurrentApplication).toHaveBeenCalled();
      expect(mockAppleScriptExecutor.activateApplication).toHaveBeenCalledWith('Terminal');
    });

    test('should quit multiple applications', async () => {
      const apps = ['Chrome', 'Slack', 'VS Code'];
      
      mockAppleScriptExecutor.quitApplication.mockResolvedValue({
        success: true,
        output: 'Application quit',
        exitCode: 0
      });

      const result = await desktopExecutor.executeTask({
        type: 'desktop',
        category: 'application',
        action: 'quit_multiple',
        parameters: {
          appNames: apps
        }
      });

      expect(result.success).toBe(true);
      expect(mockAppleScriptExecutor.quitApplication).toHaveBeenCalledTimes(3);
      apps.forEach(app => {
        expect(mockAppleScriptExecutor.quitApplication).toHaveBeenCalledWith(app);
      });
    });
  });

  describe('File System Integration', () => {
    test('should organize files by type', async () => {
      const command = 'organize downloads folder by file type';
      const parsed = parseCommand(command);

      mockAppleScriptExecutor.executeScript.mockResolvedValue({
        success: true,
        output: 'Files organized',
        exitCode: 0
      });

      const result = await desktopExecutor.executeTask({
        type: 'desktop',
        category: 'file',
        action: 'organize',
        parameters: {
          folderPath: '~/Downloads',
          method: 'by_type'
        }
      });

      expect(result.success).toBe(true);
      expect(mockAppleScriptExecutor.executeScript).toHaveBeenCalled();
    });

    test('should create backup workflow', async () => {
      mockAppleScriptExecutor.executeScript.mockResolvedValue({
        success: true,
        output: 'Backup completed',
        exitCode: 0
      });

      const result = await desktopExecutor.executeTask({
        type: 'desktop',
        category: 'file',
        action: 'backup',
        parameters: {
          sourcePath: '~/Documents/Projects',
          destinationPath: '~/Backups',
          includeSubfolders: true
        }
      });

      expect(result.success).toBe(true);
    });

    test('should handle file permissions safely', async () => {
      const restrictedPaths = [
        '/System/Library/CoreServices',
        '/usr/bin',
        '/etc'
      ];

      for (const path of restrictedPaths) {
        const result = await desktopExecutor.executeTask({
          type: 'desktop',
          category: 'file',
          action: 'modify',
          parameters: {
            filePath: path
          }
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('Access denied');
      }
    });
  });

  describe('System Control Integration', () => {
    test('should control system audio and display', async () => {
      mockAppleScriptExecutor.setSystemVolume.mockResolvedValue({
        success: true,
        output: 'Volume set',
        exitCode: 0
      });
      mockAppleScriptExecutor.executeScript.mockResolvedValue({
        success: true,
        output: 'Brightness adjusted',
        exitCode: 0
      });

      const result = await desktopExecutor.executeTask({
        type: 'desktop',
        category: 'system',
        action: 'adjust_settings',
        parameters: {
          volume: 75,
          brightness: 80
        }
      });

      expect(result.success).toBe(true);
      expect(mockAppleScriptExecutor.setSystemVolume).toHaveBeenCalledWith(75);
    });

    test('should execute system maintenance tasks', async () => {
      mockAppleScriptExecutor.executeScript.mockResolvedValue({
        success: true,
        output: 'Maintenance completed',
        exitCode: 0
      });

      const result = await desktopExecutor.executeTask({
        type: 'desktop',
        category: 'system',
        action: 'maintenance',
        parameters: {
          tasks: ['empty_trash', 'clear_cache', 'update_permissions']
        }
      });

      expect(result.success).toBe(true);
    });

    test('should prevent dangerous system operations', async () => {
      const dangerousOperations = [
        { action: 'format_disk', parameters: { disk: '/dev/disk1' } },
        { action: 'delete_system_files', parameters: { path: '/System' } },
        { action: 'disable_security', parameters: { feature: 'firewall' } }
      ];

      for (const operation of dangerousOperations) {
        const result = await desktopExecutor.executeTask({
          type: 'desktop',
          category: 'system',
          ...operation
        } as any);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Operation not allowed');
      }
    });
  });

  describe('Automation Workflows Integration', () => {
    test('should execute morning routine automation', async () => {
      const morningTasks = [
        'open calendar',
        'check weather',
        'start music',
        'adjust brightness'
      ];

      mockAppleScriptExecutor.activateApplication.mockResolvedValue({
        success: true,
        output: 'App activated',
        exitCode: 0
      });
      mockAppleScriptExecutor.executeScript.mockResolvedValue({
        success: true,
        output: 'Task completed',
        exitCode: 0
      });

      const result = await desktopExecutor.executeTask({
        type: 'desktop',
        category: 'automation',
        action: 'routine',
        parameters: {
          routineName: 'morning',
          tasks: morningTasks
        }
      });

      expect(result.success).toBe(true);
      expect(mockAppleScriptExecutor.activateApplication).toHaveBeenCalled();
      expect(mockAppleScriptExecutor.executeScript).toHaveBeenCalled();
    });

    test('should handle conditional workflows', async () => {
      mockAppleScriptExecutor.isApplicationRunning.mockResolvedValue(true);
      mockAppleScriptExecutor.executeScript.mockResolvedValue({
        success: true,
        output: 'Conditional task executed',
        exitCode: 0
      });

      const result = await desktopExecutor.executeTask({
        type: 'desktop',
        category: 'automation',
        action: 'conditional',
        parameters: {
          condition: 'if_app_running',
          appName: 'Spotify',
          thenAction: 'pause_music',
          elseAction: 'do_nothing'
        }
      });

      expect(result.success).toBe(true);
      expect(mockAppleScriptExecutor.isApplicationRunning).toHaveBeenCalledWith('Spotify');
    });
  });

  describe('Error Recovery Integration', () => {
    test('should retry failed AppleScript operations', async () => {
      let attemptCount = 0;
      mockAppleScriptExecutor.executeScript.mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 3) {
          return Promise.resolve({
            success: false,
            error: 'Temporary AppleScript error',
            exitCode: 1
          });
        }
        return Promise.resolve({
          success: true,
          output: 'Success on retry',
          exitCode: 0
        });
      });

      const result = await desktopExecutor.executeTask({
        type: 'desktop',
        category: 'application',
        action: 'execute_script',
        parameters: {
          script: 'tell application "Finder" to activate'
        }
      });

      expect(result.success).toBe(true);
      expect(attemptCount).toBe(3);
    });

    test('should handle application not responding', async () => {
      mockAppleScriptExecutor.activateApplication.mockResolvedValue({
        success: false,
        error: 'Application not responding',
        exitCode: 1
      });

      const result = await desktopExecutor.executeTask({
        type: 'desktop',
        category: 'application',
        action: 'activate',
        parameters: {
          appName: 'UnresponsiveApp'
        }
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Application not responding');
    });
  });

  describe('Security Integration', () => {
    test('should validate AppleScript before execution', async () => {
      const maliciousScripts = [
        'do shell script "rm -rf /"',
        'do shell script "sudo dangerous"',
        'administrator privileges required'
      ];

      for (const script of maliciousScripts) {
        const result = await desktopExecutor.executeTask({
          type: 'desktop',
          category: 'system',
          action: 'execute_script',
          parameters: { script }
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('Security violation');
      }
    });

    test('should restrict access to sensitive system areas', async () => {
      const restrictedAreas = [
        '/System/Library/Keychains',
        '/var/root',
        '/Library/LaunchDaemons'
      ];

      for (const path of restrictedAreas) {
        const result = await desktopExecutor.executeTask({
          type: 'desktop',
          category: 'file',
          action: 'access',
          parameters: { path }
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('Access restricted');
      }
    });
  });

  describe('Performance Integration', () => {
    test('should handle multiple concurrent desktop operations', async () => {
      const concurrentTasks = [
        { category: 'application', action: 'activate', parameters: { appName: 'Safari' } },
        { category: 'system', action: 'volume', parameters: { level: 50 } },
        { category: 'file', action: 'organize', parameters: { folder: '~/Desktop' } }
      ];

      mockAppleScriptExecutor.activateApplication.mockResolvedValue({
        success: true, output: 'App activated', exitCode: 0
      });
      mockAppleScriptExecutor.setSystemVolume.mockResolvedValue({
        success: true, output: 'Volume set', exitCode: 0
      });
      mockAppleScriptExecutor.executeScript.mockResolvedValue({
        success: true, output: 'Files organized', exitCode: 0
      });

      const tasks = concurrentTasks.map(task => 
        desktopExecutor.executeTask({
          type: 'desktop',
          ...task
        } as any)
      );

      const results = await Promise.all(tasks);

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });

    test('should optimize AppleScript execution', async () => {
      const startTime = Date.now();
      
      mockAppleScriptExecutor.executeScript.mockResolvedValue({
        success: true,
        output: 'Fast execution',
        exitCode: 0
      });

      await desktopExecutor.executeTask({
        type: 'desktop',
        category: 'system',
        action: 'quick_action',
        parameters: {
          script: 'display notification "Test"'
        }
      });

      const executionTime = Date.now() - startTime;
      expect(executionTime).toBeLessThan(1000); // Should complete quickly
    });
  });
});