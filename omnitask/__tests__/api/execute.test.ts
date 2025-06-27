import { POST, GET } from '@/app/api/execute/route';
import { NextRequest } from 'next/server';

// Mock the imports
jest.mock('@/lib/commandParser');
jest.mock('@/lib/taskClassifier');
jest.mock('@/lib/commandValidator');
jest.mock('@/lib/taskQueue');

const mockParseCommand = jest.fn();
const mockClassifyTask = jest.fn();
const mockValidateCommand = jest.fn();
const mockGlobalTaskQueue = {
  addTask: jest.fn(),
  getQueueStatus: jest.fn(),
  getAllTasks: jest.fn()
};

jest.doMock('@/lib/commandParser', () => ({
  parseCommand: mockParseCommand
}));

jest.doMock('@/lib/taskClassifier', () => ({
  classifyTask: mockClassifyTask
}));

jest.doMock('@/lib/commandValidator', () => ({
  validateCommand: mockValidateCommand
}));

jest.doMock('@/lib/taskQueue', () => ({
  globalTaskQueue: mockGlobalTaskQueue
}));

describe('/api/execute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST', () => {
    test('should process valid command successfully', async () => {
      const mockParsedCommand = {
        type: 'web',
        category: 'shopping',
        action: 'search',
        parameters: { searchTerm: 'laptops' },
        confidence: 0.8
      };

      const mockClassification = {
        type: 'web',
        category: 'shopping',
        priority: 'medium',
        estimatedDuration: 30,
        requiresUserConfirmation: false,
        riskLevel: 'safe'
      };

      const mockValidation = {
        isValid: true,
        errors: [],
        warnings: [],
        sanitizedCommand: mockParsedCommand
      };

      mockParseCommand.mockReturnValue(mockParsedCommand);
      mockClassifyTask.mockReturnValue(mockClassification);
      mockValidateCommand.mockReturnValue(mockValidation);
      mockGlobalTaskQueue.addTask.mockReturnValue('task_123');

      const request = new NextRequest('http://localhost:3000/api/execute', {
        method: 'POST',
        body: JSON.stringify({ command: 'search for laptops' }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.taskId).toBe('task_123');
      expect(data.command).toEqual(mockParsedCommand);
      expect(data.classification).toEqual(mockClassification);
      expect(mockParseCommand).toHaveBeenCalledWith('search for laptops');
      expect(mockValidateCommand).toHaveBeenCalledWith('search for laptops', mockParsedCommand);
      expect(mockClassifyTask).toHaveBeenCalledWith(mockParsedCommand);
      expect(mockGlobalTaskQueue.addTask).toHaveBeenCalledWith(mockParsedCommand, mockClassification);
    });

    test('should reject invalid commands', async () => {
      const mockValidation = {
        isValid: false,
        errors: ['Command contains harmful patterns'],
        warnings: ['Security warning']
      };

      mockParseCommand.mockReturnValue({});
      mockValidateCommand.mockReturnValue(mockValidation);

      const request = new NextRequest('http://localhost:3000/api/execute', {
        method: 'POST',
        body: JSON.stringify({ command: 'rm -rf /' }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBeUndefined();
      expect(data.error).toBe('Command validation failed');
      expect(data.details).toEqual(['Command contains harmful patterns']);
      expect(data.warnings).toEqual(['Security warning']);
    });

    test('should handle missing command', async () => {
      const request = new NextRequest('http://localhost:3000/api/execute', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Command is required and must be a string');
    });

    test('should handle invalid JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/execute', {
        method: 'POST',
        body: 'invalid json',
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });

    test('should handle non-string commands', async () => {
      const request = new NextRequest('http://localhost:3000/api/execute', {
        method: 'POST',
        body: JSON.stringify({ command: 123 }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Command is required and must be a string');
    });
  });

  describe('GET', () => {
    test('should return queue status and recent tasks', async () => {
      const mockQueueStatus = {
        pending: 2,
        executing: 1,
        completed: 5,
        failed: 0,
        total: 8
      };

      const mockRecentTasks = [
        { id: 'task_1', status: 'completed', createdAt: new Date() },
        { id: 'task_2', status: 'executing', createdAt: new Date() }
      ];

      mockGlobalTaskQueue.getQueueStatus.mockReturnValue(mockQueueStatus);
      mockGlobalTaskQueue.getAllTasks.mockReturnValue(mockRecentTasks);

      const request = new NextRequest('http://localhost:3000/api/execute');
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.queueStatus).toEqual(mockQueueStatus);
      expect(data.recentTasks).toEqual(mockRecentTasks);
      expect(data.timestamp).toBeDefined();
    });

    test('should handle errors in GET request', async () => {
      mockGlobalTaskQueue.getQueueStatus.mockImplementation(() => {
        throw new Error('Queue error');
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });
});