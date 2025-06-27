import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import { WorkflowStep, StepResult } from '../types/workflow';
import { logger } from '../utils/logger';

const execAsync = promisify(exec);

export class CommandExecutor {
  async executeStep(step: WorkflowStep): Promise<StepResult> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();
    
    logger.info(`Executing step: ${step.name} (${step.id})`);
    logger.debug(`Command: ${step.command}`);
    
    try {
      let result: StepResult;
      
      switch (step.type) {
        case 'shell':
          result = await this.executeShellCommand(step, startTime, timestamp);
          break;
        case 'file':
          result = await this.executeFileOperation(step, startTime, timestamp);
          break;
        case 'api':
          result = await this.executeApiCall(step, startTime, timestamp);
          break;
        default:
          result = await this.executeShellCommand(step, startTime, timestamp);
      }
      
      logger.info(`Step completed: ${step.name} - Success: ${result.success}`);
      return result;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorResult: StepResult = {
        stepId: step.id,
        stepName: step.name,
        command: step.command,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration,
        timestamp
      };
      
      logger.error(`Step failed: ${step.name}`, error);
      return errorResult;
    }
  }
  
  private async executeShellCommand(
    step: WorkflowStep, 
    startTime: number, 
    timestamp: string
  ): Promise<StepResult> {
    try {
      const { stdout, stderr } = await execAsync(step.command, {
        timeout: step.timeout || 30000,
        maxBuffer: 1024 * 1024 // 1MB buffer
      });
      
      const duration = Date.now() - startTime;
      const success = this.isCommandSuccessful(stdout, stderr, step);
      
      return {
        stepId: step.id,
        stepName: step.name,
        command: step.command,
        success,
        output: stdout.trim(),
        error: stderr.trim() || undefined,
        duration,
        timestamp
      };
      
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      return {
        stepId: step.id,
        stepName: step.name,
        command: step.command,
        success: false,
        output: error.stdout?.trim(),
        error: error.message || error.stderr?.trim() || 'Unknown error',
        duration,
        timestamp
      };
    }
  }
  
  private async executeFileOperation(
    step: WorkflowStep,
    startTime: number,
    timestamp: string
  ): Promise<StepResult> {
    // TODO: Implement file operations (copy, move, delete, etc.)
    const duration = Date.now() - startTime;
    
    return {
      stepId: step.id,
      stepName: step.name,
      command: step.command,
      success: false,
      error: 'File operations not yet implemented',
      duration,
      timestamp
    };
  }
  
  private async executeApiCall(
    step: WorkflowStep,
    startTime: number,
    timestamp: string
  ): Promise<StepResult> {
    // TODO: Implement API calls
    const duration = Date.now() - startTime;
    
    return {
      stepId: step.id,
      stepName: step.name,
      command: step.command,
      success: false,
      error: 'API calls not yet implemented',
      duration,
      timestamp
    };
  }
  
  private isCommandSuccessful(stdout: string, stderr: string, step: WorkflowStep): boolean {
    // If there's an expected output, check for it
    if (step.expected_output) {
      const outputLower = stdout.toLowerCase();
      const expectedLower = step.expected_output.toLowerCase();
      
      if (expectedLower === 'success') {
        // Look for success indicators
        return outputLower.includes('success') || 
               outputLower.includes('complete') ||
               outputLower.includes('done') ||
               !stderr; // No error output
      }
      
      return outputLower.includes(expectedLower);
    }
    
    // Default: success if no stderr or stderr is just warnings
    if (!stderr) {
      return true;
    }
    
    // Check if stderr contains only warnings (not errors)
    const stderrLower = stderr.toLowerCase();
    const isWarning = stderrLower.includes('warn') && 
                     !stderrLower.includes('error') && 
                     !stderrLower.includes('fail');
    
    return isWarning;
  }
  
  async validateDependencies(step: WorkflowStep, completedSteps: string[]): Promise<boolean> {
    if (!step.depends_on || step.depends_on.length === 0) {
      return true;
    }
    
    for (const dependency of step.depends_on) {
      if (!completedSteps.includes(dependency)) {
        logger.warn(`Step ${step.id} depends on ${dependency} which hasn't completed`);
        return false;
      }
    }
    
    return true;
  }
}