import { Workflow, TestResult, StepResult, WorkflowStep, TesterFeedback, Issue } from '../types/workflow';
import { CommandExecutor } from '../core/executor';
import { logger, logStepExecution } from '../utils/logger';

export class TesterAgent {
  private executor: CommandExecutor;
  
  constructor() {
    this.executor = new CommandExecutor();
  }
  
  async executeWorkflow(workflow: Workflow): Promise<TestResult> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();
    
    logger.info(`Starting workflow execution: ${workflow.name}`);
    
    const stepResults: StepResult[] = [];
    const completedSteps: string[] = [];
    let failedStep: WorkflowStep | undefined;
    let totalSteps = workflow.steps.length;
    let completedCount = 0;
    
    try {
      for (const step of workflow.steps) {
        // Check dependencies
        const dependenciesMet = await this.executor.validateDependencies(step, completedSteps);
        
        if (!dependenciesMet) {
          const errorResult: StepResult = {
            stepId: step.id,
            stepName: step.name,
            command: step.command,
            success: false,
            error: 'Dependencies not met',
            duration: 0,
            timestamp: new Date().toISOString()
          };
          
          stepResults.push(errorResult);
          failedStep = step;
          break;
        }
        
        // Execute step
        const stepResult = await this.executor.executeStep(step);
        stepResults.push(stepResult);
        
        // Log step execution
        logStepExecution(step.id, step.name, stepResult.success, {
          duration: stepResult.duration,
          output: stepResult.output?.substring(0, 200) // Truncate for logging
        });
        
        if (stepResult.success) {
          completedSteps.push(step.id);
          completedCount++;
        } else {
          failedStep = step;
          if (!step.continue_on_error) {
            break; // Stop execution on failure
          }
        }
      }
      
      const duration = Date.now() - startTime;
      const success = completedCount === totalSteps && !failedStep;
      
      const result: TestResult = {
        success,
        completedSteps: completedCount,
        totalSteps,
        stepResults,
        duration,
        timestamp,
        failedStep,
        error: failedStep ? `Failed at step: ${failedStep.name}` : undefined
      };
      
      logger.info(`Workflow execution completed: ${workflow.name} - Success: ${success}`);
      return result;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      logger.error(`Workflow execution error: ${workflow.name}`, error);
      
      return {
        success: false,
        completedSteps: completedCount,
        totalSteps,
        stepResults,
        duration,
        timestamp,
        failedStep,
        error: errorMessage
      };
    }
  }
  
  generateFeedback(workflow: Workflow, testResult: TestResult): TesterFeedback {
    logger.info(`Generating feedback for workflow: ${workflow.name}`);
    
    const issues = this.identifyIssues(testResult);
    const suggestions = this.generateSuggestions(testResult, issues);
    const riskAssessment = this.assessRisk(issues);
    
    const feedback: TesterFeedback = {
      workflowId: workflow.name,
      testResult,
      issues,
      suggestions,
      riskAssessment
    };
    
    logger.info(`Generated ${issues.length} issues and ${suggestions.length} suggestions`);
    return feedback;
  }
  
  private identifyIssues(testResult: TestResult): Issue[] {
    const issues: Issue[] = [];
    
    testResult.stepResults.forEach(stepResult => {
      if (!stepResult.success && stepResult.error) {
        const issue = this.analyzeStepFailure(stepResult);
        if (issue) {
          issues.push(issue);
        }
      }
    });
    
    return issues;
  }
  
  private analyzeStepFailure(stepResult: StepResult): Issue | null {
    const error = stepResult.error || '';
    const errorLower = error.toLowerCase();
    
    // Command not found
    if (errorLower.includes('command not found') || errorLower.includes('not recognized')) {
      return {
        stepId: stepResult.stepId,
        type: 'command_error',
        severity: 'high',
        message: `Command not found: ${this.extractCommand(stepResult.command)}`,
        suggestion: 'Check if the command is installed or use an alternative'
      };
    }
    
    // Permission denied
    if (errorLower.includes('permission denied') || errorLower.includes('access denied')) {
      return {
        stepId: stepResult.stepId,
        type: 'permission_denied',
        severity: 'high',
        message: 'Permission denied for command execution',
        suggestion: 'Check file permissions or run with appropriate privileges'
      };
    }
    
    // Timeout
    if (errorLower.includes('timeout') || stepResult.duration > 30000) {
      return {
        stepId: stepResult.stepId,
        type: 'timeout',
        severity: 'medium',
        message: 'Command execution timed out',
        suggestion: 'Increase timeout or optimize the command'
      };
    }
    
    // Syntax error
    if (errorLower.includes('syntax error') || errorLower.includes('unexpected token')) {
      return {
        stepId: stepResult.stepId,
        type: 'syntax_error',
        severity: 'high',
        message: 'Command syntax error',
        suggestion: 'Check command syntax and escape special characters'
      };
    }
    
    // Dependency missing (file not found, etc.)
    if (errorLower.includes('no such file') || errorLower.includes('not found')) {
      return {
        stepId: stepResult.stepId,
        type: 'dependency_missing',
        severity: 'medium',
        message: 'Required file or dependency not found',
        suggestion: 'Check if previous steps completed successfully or add missing dependencies'
      };
    }
    
    // Generic error
    return {
      stepId: stepResult.stepId,
      type: 'command_error',
      severity: 'medium',
      message: error,
      suggestion: 'Review command and check logs for more details'
    };
  }
  
  private extractCommand(commandString: string): string {
    return commandString.split(' ')[0];
  }
  
  private generateSuggestions(testResult: TestResult, issues: Issue[]): string[] {
    const suggestions: string[] = [];
    
    // Add specific suggestions based on issues
    issues.forEach(issue => {
      if (issue.suggestion) {
        suggestions.push(`${issue.stepId}: ${issue.suggestion}`);
      }
    });
    
    // Add general suggestions
    const failureRate = issues.length / testResult.totalSteps;
    
    if (failureRate > 0.5) {
      suggestions.push('Consider breaking down complex steps into smaller, simpler commands');
      suggestions.push('Add validation steps to check prerequisites');
    }
    
    if (issues.some(i => i.type === 'timeout')) {
      suggestions.push('Consider adding progress indicators for long-running commands');
    }
    
    if (issues.some(i => i.type === 'dependency_missing')) {
      suggestions.push('Review step dependencies and execution order');
    }
    
    return suggestions;
  }
  
  private assessRisk(issues: Issue[]): 'low' | 'medium' | 'high' {
    if (issues.length === 0) return 'low';
    
    const criticalIssues = issues.filter(i => i.severity === 'critical').length;
    const highIssues = issues.filter(i => i.severity === 'high').length;
    
    if (criticalIssues > 0 || highIssues > 2) return 'high';
    if (highIssues > 0 || issues.length > 3) return 'medium';
    
    return 'low';
  }
}