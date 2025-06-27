import { globalCommandCache } from './performance/commandCache';
import { globalPerformanceMonitor } from './performance/performanceMonitor';

export interface ParsedCommand {
  type: 'web' | 'desktop' | 'unknown';
  category: string;
  action: string;
  parameters: Record<string, unknown>;
  confidence: number;
}

const WEB_PATTERNS = {
  shopping: [
    /search.*(?:amazon|ebay|shopping|buy|purchase)/i,
    /(?:search|find).*(?:for|product|item|deal).*(?:under|below|\$)/i,
    /find.*(?:product|item|deal)/i,
    /buy.*(?:online|from)/i
  ],
  browsing: [
    /(?:open|go to|visit|navigate to).*(?:website|url|site|page|http)/i,
    /search.*(?:google|bing|yahoo)/i,
    /browse.*(?:web|internet)/i
  ],
  forms: [
    /fill.*(?:form|application|survey)/i,
    /submit.*(?:form|data)/i,
    /enter.*(?:information|details)/i
  ],
  social: [
    /(?:post|tweet|share).*(?:twitter|facebook|instagram|linkedin)/i,
    /message.*(?:whatsapp|telegram|discord)/i
  ]
};

const DESKTOP_PATTERNS = {
  apps: [
    /(?:open|launch|start|run).*(?:app|application|program)/i,
    /(?:open|start).*(?:spotify|chrome|safari|finder|terminal)/i,
    /play.*(?:music|song|playlist)/i
  ],
  files: [
    /(?:open|create|delete|move|copy).*(?:file|folder|document)/i,
    /(?:save|export|import).*(?:to|from)/i,
    /organize.*(?:files|folders)/i
  ],
  system: [
    /(?:set|change|adjust).*(?:volume|brightness|settings)/i,
    /(?:lock|sleep|restart|shutdown)/i,
    /show.*(?:desktop|dock|menubar)/i
  ]
};

export function parseCommand(command: string): ParsedCommand {
  const startTime = performance.now();
  
  const lowerCommand = command.toLowerCase().trim();
  
  if (!lowerCommand) {
    const result = {
      type: 'unknown' as const,
      category: 'invalid',
      action: 'empty',
      parameters: {},
      confidence: 0
    };
    globalPerformanceMonitor.recordCommandParsingTime(performance.now() - startTime);
    return result;
  }

  // Check cache first
  const cached = globalCommandCache.get(command);
  if (cached) {
    globalPerformanceMonitor.recordCommandParsingTime(performance.now() - startTime);
    return cached;
  }

  let result: ParsedCommand;

  // Check web patterns
  for (const [category, patterns] of Object.entries(WEB_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(lowerCommand)) {
        result = {
          type: 'web',
          category,
          action: extractAction(lowerCommand),
          parameters: extractParameters(lowerCommand, 'web'),
          confidence: calculateConfidence(lowerCommand, pattern)
        };
        globalCommandCache.set(command, result);
        globalPerformanceMonitor.recordCommandParsingTime(performance.now() - startTime);
        return result;
      }
    }
  }

  // Check desktop patterns
  for (const [category, patterns] of Object.entries(DESKTOP_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(lowerCommand)) {
        result = {
          type: 'desktop',
          category,
          action: extractAction(lowerCommand),
          parameters: extractParameters(lowerCommand, 'desktop'),
          confidence: calculateConfidence(lowerCommand, pattern)
        };
        globalCommandCache.set(command, result);
        globalPerformanceMonitor.recordCommandParsingTime(performance.now() - startTime);
        return result;
      }
    }
  }

  result = {
    type: 'unknown',
    category: 'unclassified',
    action: extractAction(lowerCommand),
    parameters: {},
    confidence: 0.1
  };
  
  globalCommandCache.set(command, result);
  globalPerformanceMonitor.recordCommandParsingTime(performance.now() - startTime);
  return result;
}

function extractAction(command: string): string {
  const actionWords = ['open', 'search', 'find', 'buy', 'create', 'delete', 'play', 'start', 'run', 'visit', 'go', 'navigate'];
  const words = command.split(' ');
  
  for (const word of words) {
    if (actionWords.includes(word.toLowerCase())) {
      return word.toLowerCase();
    }
  }
  
  return words[0] || 'unknown';
}

function extractParameters(command: string, type: 'web' | 'desktop'): Record<string, unknown> {
  const params: Record<string, unknown> = {};
  
  if (type === 'web') {
    // Extract URLs (including non-HTTP protocols for validation)
    const urlMatch = command.match(/(?:https?|ftp|file|javascript|data):\/\/[^\s]+/i);
    if (urlMatch) {
      params.url = urlMatch[0];
    }
    
    // Extract search terms (handle quotes)
    const quotedSearchMatch = command.match(/(?:search|find|look)\s+(?:for\s+)?"([^"]+)"/i);
    const normalSearchMatch = command.match(/(?:search|find|look)\s+(?:for\s+)?(.+?)(?:\s+(?:on|in|from|under|below)|$)/i);
    
    if (quotedSearchMatch) {
      params.searchTerm = quotedSearchMatch[1].trim();
    } else if (normalSearchMatch) {
      params.searchTerm = normalSearchMatch[1].trim();
    }
    
    // Extract price range
    const priceMatch = command.match(/(?:under|below|less than|<)\s*\$?(\d+)/i);
    if (priceMatch) {
      params.maxPrice = parseInt(priceMatch[1]);
    }
  } else if (type === 'desktop') {
    // Extract app names
    const appMatch = command.match(/(?:open|start|launch)\s+(.+?)(?:\s+(?:and|to)|$)/i);
    if (appMatch) {
      params.appName = appMatch[1].trim();
    }
    
    // Extract file paths
    const fileMatch = command.match(/(?:file|folder|document)\s+(.+?)(?:\s|$)/i);
    if (fileMatch) {
      params.filePath = fileMatch[1].trim();
    }
  }
  
  return params;
}

function calculateConfidence(command: string, pattern: RegExp): number {
  const match = command.match(pattern);
  if (!match) return 0;
  
  // Base confidence on match length relative to command length
  const matchLength = match[0].length;
  const commandLength = command.length;
  const coverage = matchLength / commandLength;
  
  // Boost confidence for exact keyword matches
  const keywordBonus = /\b(search|open|buy|find|create|play|start)\b/i.test(command) ? 0.2 : 0;
  
  return Math.min(0.5 + coverage * 0.3 + keywordBonus, 1.0);
}