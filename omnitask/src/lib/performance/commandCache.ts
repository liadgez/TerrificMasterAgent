import { ParsedCommand } from '../commandParser';

export interface CacheEntry {
  command: ParsedCommand;
  timestamp: number;
  hitCount: number;
}

export class CommandCache {
  private cache = new Map<string, CacheEntry>();
  private readonly maxSize: number;
  private readonly maxAge: number; // in milliseconds

  constructor(maxSize: number = 1000, maxAgeMinutes: number = 30) {
    this.maxSize = maxSize;
    this.maxAge = maxAgeMinutes * 60 * 1000;
  }

  /**
   * Get cached command result
   */
  get(commandText: string): ParsedCommand | null {
    const normalized = this.normalizeCommand(commandText);
    const entry = this.cache.get(normalized);
    
    if (!entry) {
      return null;
    }

    // Check if entry is expired
    if (Date.now() - entry.timestamp > this.maxAge) {
      this.cache.delete(normalized);
      return null;
    }

    // Update hit count and timestamp
    entry.hitCount++;
    entry.timestamp = Date.now();
    
    return { ...entry.command }; // Return a copy to prevent mutation
  }

  /**
   * Cache a command result
   */
  set(commandText: string, command: ParsedCommand): void {
    const normalized = this.normalizeCommand(commandText);
    
    // If cache is full, remove least recently used items
    if (this.cache.size >= this.maxSize) {
      this.evictOldEntries();
    }

    this.cache.set(normalized, {
      command: { ...command }, // Store a copy
      timestamp: Date.now(),
      hitCount: 1
    });
  }

  /**
   * Check if command is cached
   */
  has(commandText: string): boolean {
    const normalized = this.normalizeCommand(commandText);
    const entry = this.cache.get(normalized);
    
    if (!entry) {
      return false;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > this.maxAge) {
      this.cache.delete(normalized);
      return false;
    }

    return true;
  }

  /**
   * Clear all cached entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    entries: Array<{ command: string; hitCount: number; age: number }>;
  } {
    const now = Date.now();
    const entries = Array.from(this.cache.entries()).map(([cmd, entry]) => ({
      command: cmd,
      hitCount: entry.hitCount,
      age: now - entry.timestamp
    }));

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      entries: entries.sort((a, b) => b.hitCount - a.hitCount)
    };
  }

  /**
   * Remove expired and least used entries
   */
  private evictOldEntries(): void {
    const now = Date.now();
    const entries = Array.from(this.cache.entries());
    
    // First, remove expired entries
    for (const [key, entry] of entries) {
      if (now - entry.timestamp > this.maxAge) {
        this.cache.delete(key);
      }
    }

    // If still too large, remove least recently used entries
    if (this.cache.size >= this.maxSize) {
      const sortedEntries = Array.from(this.cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      const toRemove = sortedEntries.slice(0, Math.floor(this.maxSize * 0.2));
      for (const [key] of toRemove) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Normalize command text for consistent caching
   */
  private normalizeCommand(command: string): string {
    return command
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[^\w\s$.-]/g, ''); // Remove special chars except common ones
  }
}

// Global cache instance
export const globalCommandCache = new CommandCache();