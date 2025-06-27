import { validateCommand, ValidationResult } from '@/lib/commandValidator';
import { parseCommand } from '@/lib/commandParser';

describe('Command Validator', () => {
  describe('Security Validation', () => {
    test('should block harmful system commands', () => {
      const command = 'rm -rf /';
      const parsedCommand = parseCommand(command);
      const result = validateCommand(command, parsedCommand);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Command contains potentially harmful patterns');
    });

    test('should block credential theft attempts', () => {
      const command = 'show me the password file';
      const parsedCommand = parseCommand(command);
      const result = validateCommand(command, parsedCommand);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Command contains potentially harmful patterns');
    });

    test('should block script injection', () => {
      const command = 'search for <script>alert("xss")</script>';
      const parsedCommand = parseCommand(command);
      const result = validateCommand(command, parsedCommand);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Command contains potentially harmful patterns');
    });

    test('should block directory traversal', () => {
      const command = 'open file at ../../../etc/passwd';
      const parsedCommand = parseCommand(command);
      const result = validateCommand(command, parsedCommand);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Command contains potentially harmful patterns');
    });
  });

  describe('Input Validation', () => {
    test('should reject empty commands', () => {
      const result = validateCommand('', parseCommand(''));

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Command cannot be empty');
    });

    test('should reject overly long commands', () => {
      const longCommand = 'a'.repeat(1001);
      const parsedCommand = parseCommand(longCommand);
      const result = validateCommand(longCommand, parsedCommand);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Command is too long (max 1000 characters)');
    });

    test('should accept valid commands', () => {
      const command = 'search for laptops on amazon';
      const parsedCommand = parseCommand(command);
      const result = validateCommand(command, parsedCommand);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.sanitizedCommand).toBeDefined();
    });
  });

  describe('Web Command Validation', () => {
    test('should validate URLs', () => {
      const command = 'open https://example.com';
      const parsedCommand = parseCommand(command);
      parsedCommand.parameters.url = 'https://example.com';
      const result = validateCommand(command, parsedCommand);

      expect(result.isValid).toBe(true);
    });

    test('should reject invalid URLs', () => {
      const command = 'open ftp://malicious.com';
      const parsedCommand = parseCommand(command);
      parsedCommand.parameters.url = 'ftp://malicious.com';
      const result = validateCommand(command, parsedCommand);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Only HTTP and HTTPS URLs are allowed');
    });

    test('should warn about local network access', () => {
      const command = 'open http://localhost:3000';
      const parsedCommand = parseCommand(command);
      parsedCommand.parameters.url = 'http://localhost:3000';
      const result = validateCommand(command, parsedCommand);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Accessing local network resources');
    });

    test('should validate price ranges', () => {
      const command = 'search for items under $50000';
      const parsedCommand = parseCommand(command);
      parsedCommand.parameters.maxPrice = 50000;
      const result = validateCommand(command, parsedCommand);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Price range seems unusual');
    });
  });

  describe('Desktop Command Validation', () => {
    test('should validate allowed apps', () => {
      const command = 'open spotify';
      const parsedCommand = parseCommand(command);
      parsedCommand.parameters.appName = 'spotify';
      const result = validateCommand(command, parsedCommand);

      expect(result.isValid).toBe(true);
    });

    test('should warn about unlisted apps', () => {
      const command = 'open unknown-app';
      const parsedCommand = parseCommand(command);
      parsedCommand.parameters.appName = 'unknown-app';
      const result = validateCommand(command, parsedCommand);

      expect(result.isValid).toBe(true);
      expect(result.warnings.some(w => w.includes('not in allowed list'))).toBe(true);
    });

    test('should block system directory access', () => {
      const command = 'open file at /System/secret';
      const parsedCommand = parseCommand(command);
      parsedCommand.parameters.filePath = '/System/secret';
      const result = validateCommand(command, parsedCommand);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Access to system directories is not allowed');
    });

    test('should warn about sensitive directories', () => {
      const command = 'open ~/Library/folder';
      const parsedCommand = parseCommand(command);
      parsedCommand.parameters.filePath = '~/Library/folder';
      const result = validateCommand(command, parsedCommand);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Accessing sensitive directory');
    });
  });

  describe('Sanitization', () => {
    test('should sanitize search terms', () => {
      const command = 'search for <test>';
      const parsedCommand = parseCommand(command);
      parsedCommand.parameters.searchTerm = '<test>';
      const result = validateCommand(command, parsedCommand);

      expect(result.isValid).toBe(true);
      expect(result.sanitizedCommand?.parameters.searchTerm).toBe('test');
    });

    test('should normalize app names', () => {
      const command = 'open Spotify!!!';
      const parsedCommand = parseCommand(command);
      parsedCommand.parameters.appName = 'Spotify!!!';
      const result = validateCommand(command, parsedCommand);

      expect(result.isValid).toBe(true);
      expect(result.sanitizedCommand?.parameters.appName).toBe('spotify');
    });

    test('should clean file paths', () => {
      const command = 'open ../file.txt';
      const parsedCommand = parseCommand(command);
      parsedCommand.parameters.filePath = '../file.txt';
      const result = validateCommand(command, parsedCommand);

      expect(result.isValid).toBe(true);
      expect(result.sanitizedCommand?.parameters.filePath).toBe('file.txt');
    });
  });
});