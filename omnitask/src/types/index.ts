export interface Command {
  id: string;
  text: string;
  type: 'web' | 'desktop' | 'unknown';
  status: 'pending' | 'executing' | 'completed' | 'failed';
  createdAt: Date;
  completedAt?: Date;
  result?: unknown;
  error?: string;
}

export interface ExecutionResponse {
  success: boolean;
  command: string;
  taskType: 'web' | 'desktop' | 'unknown';
  status: string;
  timestamp: string;
  result?: unknown;
  error?: string;
}