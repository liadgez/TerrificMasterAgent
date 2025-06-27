export interface WorkflowStep {
  id: string;
  name: string;
  command: string;
  type: 'shell' | 'file' | 'api' | 'custom';
  expected_output?: string;
  depends_on?: string[];
  timeout?: number;
  retry_count?: number;
  continue_on_error?: boolean;
}

export interface WorkflowMetadata {
  iterations: number;
  last_updated: string;
  success_rate: number;
  status: 'in_progress' | 'verified';
  verification?: {
    verified: boolean;
    verified_at: string | null;
    signature: string | null;
    total_iterations?: number;
    final_success_rate?: number;
  };
}

export interface Workflow {
  name: string;
  version: number;
  description: string;
  steps: WorkflowStep[];
  metadata: WorkflowMetadata;
}

export interface StepResult {
  stepId: string;
  stepName: string;
  command: string;
  success: boolean;
  output?: string;
  error?: string;
  duration: number;
  timestamp: string;
}

export interface TestResult {
  success: boolean;
  completedSteps: number;
  totalSteps: number;
  stepResults: StepResult[];
  duration: number;
  timestamp: string;
  failedStep?: WorkflowStep;
  error?: string;
}

export interface TesterFeedback {
  workflowId: string;
  testResult: TestResult;
  issues: Issue[];
  suggestions: string[];
  riskAssessment: 'low' | 'medium' | 'high';
}

export interface Issue {
  stepId: string;
  type: 'command_error' | 'dependency_missing' | 'timeout' | 'permission_denied' | 'syntax_error';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  suggestion?: string;
}

export interface Analysis {
  rootCauses: string[];
  patterns: string[];
  recommendations: Recommendation[];
  confidenceScore: number;
}

export interface Recommendation {
  stepId: string;
  type: 'modify' | 'add' | 'remove' | 'reorder';
  description: string;
  newCommand?: string;
  priority: 'low' | 'medium' | 'high';
}

export interface IterationResult {
  success: boolean;
  iterations: number;
  finalStatus: string;
  verified: boolean;
  error?: string;
  history: TestResult[];
}

export interface IterationLoopConfig {
  maxIterations: number;
  timeout: number;
  workflowFile: string;
}