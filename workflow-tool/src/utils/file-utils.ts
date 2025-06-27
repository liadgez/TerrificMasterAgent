import * as fs from 'fs/promises';
import * as path from 'path';
import { logger } from './logger';

export class FileUtils {
  static async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
      logger.debug(`Created directory: ${dirPath}`);
    }
  }
  
  static async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
  
  static async createBackup(filePath: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const ext = path.extname(filePath);
    const base = path.basename(filePath, ext);
    const dir = path.dirname(filePath);
    
    const backupPath = path.join(dir, `${base}.backup.${timestamp}${ext}`);
    
    try {
      await fs.copyFile(filePath, backupPath);
      logger.info(`Created backup: ${backupPath}`);
      return backupPath;
    } catch (error) {
      logger.error(`Failed to create backup for ${filePath}`, error);
      throw error;
    }
  }
  
  static async readFileLines(filePath: string): Promise<string[]> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return content.split('\n');
    } catch (error) {
      logger.error(`Failed to read file lines: ${filePath}`, error);
      throw error;
    }
  }
  
  static async writeFileLines(filePath: string, lines: string[]): Promise<void> {
    try {
      const content = lines.join('\n');
      await fs.writeFile(filePath, content, 'utf-8');
      logger.debug(`Wrote file: ${filePath}`);
    } catch (error) {
      logger.error(`Failed to write file: ${filePath}`, error);
      throw error;
    }
  }
  
  static getRelativePath(filePath: string): string {
    return path.relative(process.cwd(), filePath);
  }
  
  static sanitizeFilename(filename: string): string {
    return filename.replace(/[^a-z0-9.\-_]/gi, '_');
  }
}