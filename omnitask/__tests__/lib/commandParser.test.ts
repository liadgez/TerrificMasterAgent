import { parseCommand, ParsedCommand } from '@/lib/commandParser';

describe('Command Parser', () => {
  describe('Web Commands', () => {
    test('should parse shopping command with price filter', () => {
      const command = 'search for laptops on amazon under $1000';
      const result = parseCommand(command);

      expect(result.type).toBe('web');
      expect(result.category).toBe('shopping');
      expect(result.action).toBe('search');
      expect(result.parameters.searchTerm).toBe('laptops');
      expect(result.parameters.maxPrice).toBe(1000);
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    test('should parse google search command', () => {
      const command = 'search google for typescript tutorial';
      const result = parseCommand(command);

      expect(result.type).toBe('web');
      expect(result.category).toBe('browsing');
      expect(result.action).toBe('search');
      expect(result.parameters.searchTerm).toContain('typescript tutorial');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    test('should parse navigation command', () => {
      const command = 'open github website';
      const result = parseCommand(command);

      expect(result.type).toBe('web');
      expect(result.category).toBe('browsing');
      expect(result.action).toBe('open');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    test('should parse form filling command', () => {
      const command = 'fill out the contact form';
      const result = parseCommand(command);

      expect(result.type).toBe('web');
      expect(result.category).toBe('forms');
      expect(result.action).toBe('fill');
      expect(result.confidence).toBeGreaterThan(0.5);
    });
  });

  describe('Desktop Commands', () => {
    test('should parse Spotify command', () => {
      const command = 'open spotify and play my workout playlist';
      const result = parseCommand(command);

      expect(result.type).toBe('desktop');
      expect(result.category).toBe('apps');
      expect(result.action).toBe('open');
      expect(result.parameters.appName).toContain('spotify');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    test('should parse file operation command', () => {
      const command = 'create a new folder on desktop';
      const result = parseCommand(command);

      expect(result.type).toBe('desktop');
      expect(result.category).toBe('files');
      expect(result.action).toBe('create');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    test('should parse system control command', () => {
      const command = 'set volume to 50';
      const result = parseCommand(command);

      expect(result.type).toBe('desktop');
      expect(result.category).toBe('system');
      expect(result.action).toBe('set');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    test('should parse music playback command', () => {
      const command = 'play music';
      const result = parseCommand(command);

      expect(result.type).toBe('desktop');
      expect(result.category).toBe('apps');
      expect(result.action).toBe('play');
      expect(result.confidence).toBeGreaterThan(0.5);
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty command', () => {
      const result = parseCommand('');

      expect(result.type).toBe('unknown');
      expect(result.category).toBe('invalid');
      expect(result.action).toBe('empty');
      expect(result.confidence).toBe(0);
    });

    test('should handle unknown command', () => {
      const command = 'xyz abc unknown command';
      const result = parseCommand(command);

      expect(result.type).toBe('unknown');
      expect(result.category).toBe('unclassified');
      expect(result.confidence).toBeLessThan(0.5);
    });

    test('should extract parameters correctly', () => {
      const command = 'search for "gaming laptop" under $1500';
      const result = parseCommand(command);

      expect(result.parameters.searchTerm).toContain('gaming laptop');
      expect(result.parameters.maxPrice).toBe(1500);
    });
  });

  describe('Confidence Scoring', () => {
    test('should have high confidence for clear commands', () => {
      const command = 'search amazon for wireless headphones';
      const result = parseCommand(command);

      expect(result.confidence).toBeGreaterThan(0.7);
    });

    test('should have lower confidence for ambiguous commands', () => {
      const command = 'do something with stuff';
      const result = parseCommand(command);

      expect(result.confidence).toBeLessThan(0.3);
    });
  });
});