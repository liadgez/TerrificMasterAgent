import { ParsedCommand } from './commandParser';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  sanitizedCommand?: ParsedCommand;
}

const BLOCKED_PATTERNS = [
  // Prevent harmful system commands
  /(?:rm\s+-rf|del\s+\/[sf]|format\s+[cd]:|sudo\s+rm)/i,
  
  // Prevent credential theft attempts
  /(?:password|passwd|credentials|keychain|wallet)/i,
  
  // Prevent network security issues
  /(?:curl|wget|nc\s+|netcat|telnet).*(?:shell|bash|cmd)/i,
  
  // Prevent script injection
  /<script|javascript:|eval\(|exec\(/i
];

const SENSITIVE_KEYWORDS = [
  'admin', 'administrator', 'root', 'sudo', 'password', 'secret', 
  'private', 'key', 'token', 'credential', 'login', 'auth'
];

export function validateCommand(command: string, parsedCommand: ParsedCommand): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Basic validation
  if (!command || command.trim().length === 0) {
    errors.push('Command cannot be empty');
    return { isValid: false, errors, warnings };
  }
  
  if (command.length > 1000) {
    errors.push('Command is too long (max 1000 characters)');
  }
  
  // Check for blocked patterns
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(command)) {
      errors.push('Command contains potentially harmful patterns');
      break;
    }
  }
  
  // Check for sensitive keywords
  const lowerCommand = command.toLowerCase();
  for (const keyword of SENSITIVE_KEYWORDS) {
    if (lowerCommand.includes(keyword)) {
      warnings.push(`Command contains sensitive keyword: ${keyword}`);
    }
  }
  
  // Validate by command type
  // Always validate URLs regardless of command type
  if (parsedCommand.parameters.url) {
    validateUrl(parsedCommand.parameters.url as string, errors, warnings);
  }

  if (parsedCommand.type === 'web') {
    validateWebCommand(parsedCommand, errors, warnings);
  } else if (parsedCommand.type === 'desktop') {
    validateDesktopCommand(parsedCommand, errors, warnings);
  }
  
  // Sanitize the command if valid
  let sanitizedCommand: ParsedCommand | undefined;
  if (errors.length === 0) {
    sanitizedCommand = sanitizeCommand(parsedCommand);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    sanitizedCommand
  };
}

function validateUrl(url: string, errors: string[], warnings: string[]): void {
  try {
    const urlObj = new URL(url);
    
    // Block suspicious protocols
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      errors.push('Only HTTP and HTTPS URLs are allowed');
    }
    
    // Block localhost and private IPs in production
    if (urlObj.hostname === 'localhost' || urlObj.hostname.startsWith('192.168.') || urlObj.hostname.startsWith('10.')) {
      warnings.push('Accessing local network resources');
    }
    
  } catch {
    errors.push('Invalid URL format');
  }
}

function validateWebCommand(parsedCommand: ParsedCommand, errors: string[], warnings: string[]): void {
  const { parameters } = parsedCommand;
  
  // Validate price ranges
  if (typeof parameters.maxPrice === 'number' && (parameters.maxPrice < 0 || parameters.maxPrice > 10000)) {
    warnings.push('Price range seems unusual');
  }
  
  // Validate search terms
  if (typeof parameters.searchTerm === 'string' && parameters.searchTerm.length > 200) {
    errors.push('Search term is too long');
  }
}

function validateDesktopCommand(parsedCommand: ParsedCommand, errors: string[], warnings: string[]): void {
  const { parameters, category } = parsedCommand;
  
  // Validate app names
  if (typeof parameters.appName === 'string') {
    const allowedApps = [
      'spotify', 'chrome', 'safari', 'finder', 'terminal', 'calculator',
      'notes', 'calendar', 'mail', 'messages', 'facetime', 'photos',
      'music', 'tv', 'podcasts', 'news', 'weather', 'stocks'
    ];
    
    const appName = (parameters.appName as string).toLowerCase();
    if (!allowedApps.some(allowed => appName.includes(allowed))) {
      warnings.push(`App "${parameters.appName as string}" not in allowed list`);
    }
  }
  
  // Validate file paths
  if (typeof parameters.filePath === 'string') {
    const path = parameters.filePath as string;
    
    // Block system directories
    const blockedPaths = ['/System/', '/usr/', '/bin/', '/sbin/', '/etc/'];
    if (blockedPaths.some(blocked => path.startsWith(blocked))) {
      errors.push('Access to system directories is not allowed');
    }
    
    // Warn about sensitive locations
    const sensitivePaths = ['/Applications/', '~/Library/', '~/.ssh/'];
    if (sensitivePaths.some(sensitive => path.includes(sensitive))) {
      warnings.push('Accessing sensitive directory');
    }
  }
  
  // Extra validation for system category
  if (category === 'system') {
    warnings.push('System commands require extra caution');
  }
}

function sanitizeCommand(parsedCommand: ParsedCommand): ParsedCommand {
  const sanitized = { ...parsedCommand };
  
  // Sanitize parameters
  if (typeof sanitized.parameters.searchTerm === 'string') {
    // Remove potentially harmful characters from search terms
    sanitized.parameters.searchTerm = sanitized.parameters.searchTerm
      .replace(/[<>'"&]/g, '')
      .trim()
      .substring(0, 200);
  }
  
  if (typeof sanitized.parameters.appName === 'string') {
    // Normalize app names
    sanitized.parameters.appName = sanitized.parameters.appName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim();
  }
  
  if (typeof sanitized.parameters.filePath === 'string') {
    // Normalize file paths
    sanitized.parameters.filePath = sanitized.parameters.filePath
      .replace(/\.\.\//g, '') // Remove directory traversal
      .replace(/\.\./g, '') // Remove any remaining ..
      .replace(/^\.\//, '') // Remove current directory prefix
      .replace(/[<>"|?*]/g, '') // Remove invalid filename characters
      .replace(/\/+/g, '/') // Normalize multiple slashes
      .trim();
  }
  
  return sanitized;
}

export function isSafeForAutoExecution(parsedCommand: ParsedCommand): boolean {
  const validation = validateCommand('', parsedCommand);
  
  return (
    validation.isValid &&
    validation.errors.length === 0 &&
    !validation.warnings.some(w => w.includes('sensitive') || w.includes('system'))
  );
}