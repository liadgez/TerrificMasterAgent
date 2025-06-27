import { BaseDesktopTask, DesktopTaskResult } from './desktopTaskTemplate';
import { AppleScriptExecutor } from './appleScriptExecutor';
import { ParsedCommand } from '@/lib/commandParser';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

export interface FileOperation {
  type: 'create' | 'delete' | 'move' | 'copy' | 'read' | 'list' | 'search';
  source?: string;
  destination?: string;
  content?: string;
  pattern?: string;
}

export class FileSystemTask extends BaseDesktopTask {
  name = 'File System Operations';
  category = 'files';
  description = 'Perform file and folder operations';

  async execute(command: ParsedCommand, appleScriptExecutor: AppleScriptExecutor): Promise<DesktopTaskResult> {
    const startTime = Date.now();

    try {
      const operation = this.parseFileOperation(command);
      let result;

      switch (operation.type) {
        case 'create':
          result = await this.createFile(operation);
          break;
        
        case 'delete':
          result = await this.deleteFile(operation, appleScriptExecutor);
          break;
        
        case 'move':
          result = await this.moveFile(operation);
          break;
        
        case 'copy':
          result = await this.copyFile(operation);
          break;
        
        case 'read':
          result = await this.readFile(operation);
          break;
        
        case 'list':
          result = await this.listDirectory(operation);
          break;
        
        case 'search':
          result = await this.searchFiles(operation);
          break;
        
        default:
          throw new Error(`Unsupported file operation: ${operation.type}`);
      }

      return {
        success: true,
        data: {
          operation: operation.type,
          ...result
        },
        duration: Date.now() - startTime
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'File system operation failed',
        duration: Date.now() - startTime
      };
    }
  }

  private parseFileOperation(command: ParsedCommand): FileOperation {
    const commandText = JSON.stringify(command).toLowerCase();
    const action = command.action.toLowerCase();

    // Determine operation type
    let type: FileOperation['type'];
    if (action === 'create' || commandText.includes('create') || commandText.includes('new')) {
      type = 'create';
    } else if (action === 'delete' || commandText.includes('delete') || commandText.includes('remove')) {
      type = 'delete';
    } else if (action === 'move' || commandText.includes('move')) {
      type = 'move';
    } else if (action === 'copy' || commandText.includes('copy')) {
      type = 'copy';
    } else if (action === 'read' || commandText.includes('read') || commandText.includes('open')) {
      type = 'read';
    } else if (action === 'list' || commandText.includes('list') || commandText.includes('show')) {
      type = 'list';
    } else if (action === 'search' || action === 'find' || commandText.includes('search') || commandText.includes('find')) {
      type = 'search';
    } else {
      throw new Error('Could not determine file operation type');
    }

    // Extract file paths and normalize them
    const filePath = command.parameters.filePath as string;
    const source = filePath ? this.normalizePath(filePath) : this.extractPathFromCommand(commandText);
    
    const destinationPath = command.parameters.destination as string;
    const destination = destinationPath ? this.normalizePath(destinationPath) : undefined;

    const content = command.parameters.content as string;
    const pattern = command.parameters.pattern as string || command.parameters.searchTerm as string;

    return {
      type,
      source,
      destination,
      content,
      pattern
    };
  }

  private normalizePath(filePath: string): string {
    // Expand home directory
    if (filePath.startsWith('~')) {
      return path.join(os.homedir(), filePath.slice(1));
    }

    // Convert to absolute path if relative
    if (!path.isAbsolute(filePath)) {
      return path.resolve(filePath);
    }

    return filePath;
  }

  private extractPathFromCommand(commandText: string): string {
    // Try to extract file/folder paths from command text
    const pathPatterns = [
      /["']([^"']+)["']/,  // Quoted paths
      /\/[^\s]+/,          // Unix-style paths
      /~\/[^\s]+/,         // Home directory paths
      /Desktop\/[^\s]+/,   // Desktop paths
      /Documents\/[^\s]+/, // Documents paths
      /Downloads\/[^\s]+/  // Downloads paths
    ];

    for (const pattern of pathPatterns) {
      const match = commandText.match(pattern);
      if (match) {
        return this.normalizePath(match[1] || match[0]);
      }
    }

    // Default to Desktop for file operations
    return path.join(os.homedir(), 'Desktop');
  }

  private async createFile(operation: FileOperation): Promise<{ filePath: string; type: 'file' | 'directory' }> {
    const filePath = operation.source!;
    const content = operation.content || '';

    // Validate path is safe
    this.validatePath(filePath);

    // Determine if creating a file or directory
    const isDirectory = !path.extname(filePath) || operation.content === undefined;

    if (isDirectory) {
      await fs.mkdir(filePath, { recursive: true });
      return { filePath, type: 'directory' };
    } else {
      // Ensure parent directory exists
      const parentDir = path.dirname(filePath);
      await fs.mkdir(parentDir, { recursive: true });
      
      await fs.writeFile(filePath, content, 'utf8');
      return { filePath, type: 'file' };
    }
  }

  private async deleteFile(operation: FileOperation, appleScriptExecutor: AppleScriptExecutor): Promise<{ filePath: string; movedToTrash: boolean }> {
    const filePath = operation.source!;
    
    // Validate path is safe to delete
    this.validatePath(filePath);
    this.validateDeletion(filePath);

    try {
      // Try to move to Trash using AppleScript (safer)
      const script = `
        tell application "Finder"
          set theFile to POSIX file "${filePath}"
          move theFile to trash
          return "moved to trash"
        end tell
      `;

      const result = await appleScriptExecutor.executeScript(script);
      
      if (result.success) {
        return { filePath, movedToTrash: true };
      } else {
        // Fallback to direct deletion
        const stats = await fs.stat(filePath);
        if (stats.isDirectory()) {
          await fs.rmdir(filePath, { recursive: true });
        } else {
          await fs.unlink(filePath);
        }
        return { filePath, movedToTrash: false };
      }
    } catch (error) {
      throw new Error(`Failed to delete ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async moveFile(operation: FileOperation): Promise<{ source: string; destination: string }> {
    const source = operation.source!;
    const destination = operation.destination!;

    this.validatePath(source);
    this.validatePath(destination);

    // Ensure destination directory exists
    const destDir = path.dirname(destination);
    await fs.mkdir(destDir, { recursive: true });

    await fs.rename(source, destination);
    
    return { source, destination };
  }

  private async copyFile(operation: FileOperation): Promise<{ source: string; destination: string }> {
    const source = operation.source!;
    const destination = operation.destination!;

    this.validatePath(source);
    this.validatePath(destination);

    // Ensure destination directory exists
    const destDir = path.dirname(destination);
    await fs.mkdir(destDir, { recursive: true });

    await fs.copyFile(source, destination);
    
    return { source, destination };
  }

  private async readFile(operation: FileOperation): Promise<{ filePath: string; content: string; size: number }> {
    const filePath = operation.source!;
    
    this.validatePath(filePath);

    const stats = await fs.stat(filePath);
    
    if (stats.isDirectory()) {
      throw new Error(`Cannot read directory as file: ${filePath}`);
    }

    // Limit file size for safety
    if (stats.size > 1024 * 1024) { // 1MB limit
      throw new Error('File too large to read (max 1MB)');
    }

    const content = await fs.readFile(filePath, 'utf8');
    
    return { filePath, content, size: stats.size };
  }

  private async listDirectory(operation: FileOperation): Promise<{ directory: string; items: Array<{ name: string; type: 'file' | 'directory'; size?: number }> }> {
    const directory = operation.source!;
    
    this.validatePath(directory);

    const items = await fs.readdir(directory);
    const itemDetails = await Promise.all(
      items.map(async (item) => {
        const itemPath = path.join(directory, item);
        const stats = await fs.stat(itemPath);
        
        return {
          name: item,
          type: stats.isDirectory() ? 'directory' as const : 'file' as const,
          size: stats.isFile() ? stats.size : undefined
        };
      })
    );

    return { directory, items: itemDetails };
  }

  private async searchFiles(operation: FileOperation): Promise<{ searchPath: string; pattern: string; matches: string[] }> {
    const searchPath = operation.source!;
    const pattern = operation.pattern!;

    this.validatePath(searchPath);

    if (!pattern) {
      throw new Error('Search pattern is required');
    }

    const matches: string[] = [];
    
    const searchRecursive = async (dir: string) => {
      try {
        const items = await fs.readdir(dir);
        
        for (const item of items) {
          const itemPath = path.join(dir, item);
          const stats = await fs.stat(itemPath);
          
          // Check if item matches pattern
          if (item.toLowerCase().includes(pattern.toLowerCase())) {
            matches.push(itemPath);
          }
          
          // Recursively search subdirectories
          if (stats.isDirectory() && matches.length < 100) { // Limit results
            await searchRecursive(itemPath);
          }
        }
      } catch {
        // Skip directories we can't access
      }
    };

    await searchRecursive(searchPath);
    
    return { searchPath, pattern, matches };
  }

  private validatePath(filePath: string): void {
    // Security checks for file paths
    const normalizedPath = path.normalize(filePath);
    
    // Prevent path traversal
    if (normalizedPath.includes('..')) {
      throw new Error('Path traversal not allowed');
    }

    // Restrict to safe directories
    const homeDir = os.homedir();
    const allowedPaths = [
      path.join(homeDir, 'Desktop'),
      path.join(homeDir, 'Documents'),
      path.join(homeDir, 'Downloads'),
      path.join(homeDir, 'Pictures'),
      path.join(homeDir, 'Music'),
      path.join(homeDir, 'Movies')
    ];

    const isInAllowedPath = allowedPaths.some(allowedPath => 
      normalizedPath.startsWith(allowedPath)
    );

    if (!isInAllowedPath) {
      throw new Error(`Access to path not allowed: ${filePath}`);
    }
  }

  private validateDeletion(filePath: string): void {
    // Additional safety checks for deletion
    const criticalPaths = [
      os.homedir(),
      path.join(os.homedir(), 'Desktop'),
      path.join(os.homedir(), 'Documents'),
      path.join(os.homedir(), 'Downloads'),
      '/System',
      '/Applications',
      '/Library'
    ];

    const normalizedPath = path.normalize(filePath);
    
    if (criticalPaths.includes(normalizedPath)) {
      throw new Error('Cannot delete critical system directories');
    }
  }
}

export class FinderTask extends BaseDesktopTask {
  name = 'Finder Operations';
  category = 'files';
  description = 'Control Finder and file browser operations';

  async execute(command: ParsedCommand, appleScriptExecutor: AppleScriptExecutor): Promise<DesktopTaskResult> {
    const startTime = Date.now();

    try {
      const action = this.determineFinderAction(command);
      let result;

      switch (action.type) {
        case 'open_folder':
          result = await this.openFolder(action.path!, appleScriptExecutor);
          break;
        
        case 'show_desktop':
          result = await this.showDesktop(appleScriptExecutor);
          break;
        
        case 'new_folder':
          result = await this.createNewFolder(action.path!, appleScriptExecutor);
          break;
        
        default:
          throw new Error(`Unsupported Finder action: ${action.type}`);
      }

      return {
        success: result.success,
        data: {
          action: action.type,
          path: action.path
        },
        error: result.error,
        duration: Date.now() - startTime,
        appleScriptOutput: result.output
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Finder operation failed',
        duration: Date.now() - startTime
      };
    }
  }

  private determineFinderAction(command: ParsedCommand): { type: string; path?: string } {
    const commandText = JSON.stringify(command).toLowerCase();

    if (commandText.includes('open') && (commandText.includes('folder') || commandText.includes('directory'))) {
      const filePath = command.parameters.filePath as string;
      const path = filePath || this.extractPathFromCommand(commandText);
      return { type: 'open_folder', path };
    }

    if (commandText.includes('desktop') && commandText.includes('show')) {
      return { type: 'show_desktop' };
    }

    if (commandText.includes('new') && commandText.includes('folder')) {
      const filePath = command.parameters.filePath as string;
      const folderPath = filePath || path.join(os.homedir(), 'Desktop', 'New Folder');
      return { type: 'new_folder', path: folderPath };
    }

    throw new Error('Could not determine Finder action from command');
  }

  private extractPathFromCommand(commandText: string): string {
    // Extract common folder references
    if (commandText.includes('desktop')) {
      return path.join(os.homedir(), 'Desktop');
    }
    if (commandText.includes('documents')) {
      return path.join(os.homedir(), 'Documents');
    }
    if (commandText.includes('downloads')) {
      return path.join(os.homedir(), 'Downloads');
    }
    if (commandText.includes('pictures')) {
      return path.join(os.homedir(), 'Pictures');
    }

    return os.homedir();
  }

  private async openFolder(folderPath: string, appleScriptExecutor: AppleScriptExecutor) {
    const script = `
      tell application "Finder"
        activate
        open folder (POSIX file "${folderPath}")
      end tell
    `;

    return await appleScriptExecutor.executeScript(script);
  }

  private async showDesktop(appleScriptExecutor: AppleScriptExecutor) {
    const script = `
      tell application "System Events"
        key code 103 using {command down, function down}
      end tell
    `;

    return await appleScriptExecutor.executeScript(script);
  }

  private async createNewFolder(folderPath: string, appleScriptExecutor: AppleScriptExecutor) {
    const script = `
      tell application "Finder"
        activate
        set newFolder to make new folder at (POSIX file "${path.dirname(folderPath)}") with properties {name:"${path.basename(folderPath)}"}
        select newFolder
      end tell
    `;

    return await appleScriptExecutor.executeScript(script);
  }
}