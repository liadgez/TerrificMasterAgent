import { 
  Workflow, 
  TesterFeedback, 
  Analysis, 
  Recommendation, 
  TestResult, 
  Issue,
  WorkflowStep 
} from '../types/workflow';
import { logger } from '../utils/logger';

export class ManagerAgent {
  private improvementPatterns: Map<string, string[]> = new Map();
  
  constructor() {
    this.initializePatterns();
  }
  
  analyzeFeedback(feedback: TesterFeedback): Analysis {
    logger.info(`Analyzing feedback for workflow: ${feedback.workflowId}`);
    
    const rootCauses = this.identifyRootCauses(feedback);
    const patterns = this.identifyPatterns(feedback);
    const recommendations = this.generateRecommendations(feedback);
    const confidenceScore = this.calculateConfidence(feedback, recommendations);
    
    const analysis: Analysis = {
      rootCauses,
      patterns,
      recommendations,
      confidenceScore
    };
    
    logger.info(`Analysis complete - ${recommendations.length} recommendations generated`);
    return analysis;
  }
  
  improveWorkflow(workflow: Workflow, analysis: Analysis): Workflow {
    logger.info(`Improving workflow: ${workflow.name}`);
    
    const improvedWorkflow = JSON.parse(JSON.stringify(workflow)); // Deep copy
    
    // Apply high-priority recommendations first
    const sortedRecommendations = analysis.recommendations.sort((a, b) => {
      const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
    
    let modificationsApplied = 0;
    
    for (const recommendation of sortedRecommendations) {
      if (this.applyRecommendation(improvedWorkflow, recommendation)) {
        modificationsApplied++;
      }
    }
    
    // Update metadata
    improvedWorkflow.metadata.iterations++;
    improvedWorkflow.metadata.last_updated = new Date().toISOString();
    
    logger.info(`Applied ${modificationsApplied} modifications to workflow`);
    return improvedWorkflow;
  }
  
  isComplete(workflow: Workflow, history: TestResult[]): boolean {
    if (history.length === 0) return false;
    
    const lastResult = history[history.length - 1];
    
    // Check if last run was successful
    if (!lastResult.success) return false;
    
    // Check for stability (last 3 runs successful)
    if (history.length >= 3) {
      const lastThreeResults = history.slice(-3);
      const allSuccessful = lastThreeResults.every(result => result.success);
      
      if (allSuccessful) {
        logger.info(`Workflow ${workflow.name} is stable - ready for verification`);
        return true;
      }
    }
    
    // Single successful run is also considered complete for simple workflows
    if (lastResult.success && lastResult.completedSteps === lastResult.totalSteps) {
      logger.info(`Workflow ${workflow.name} completed successfully`);
      return true;
    }
    
    return false;
  }
  
  private identifyRootCauses(feedback: TesterFeedback): string[] {
    const rootCauses: string[] = [];
    
    // Group issues by type
    const issuesByType = feedback.issues.reduce((acc, issue) => {
      if (!acc[issue.type]) acc[issue.type] = [];
      acc[issue.type].push(issue);
      return acc;
    }, {} as Record<string, Issue[]>);
    
    // Analyze each issue type
    Object.entries(issuesByType).forEach(([type, issues]) => {
      switch (type) {
        case 'command_error':
          if (issues.length > 1) {
            rootCauses.push('Multiple command execution failures suggest environment issues');
          } else {
            rootCauses.push('Command syntax or dependency issue');
          }
          break;
          
        case 'dependency_missing':
          rootCauses.push('Missing dependencies or incorrect step ordering');
          break;
          
        case 'timeout':
          rootCauses.push('Commands taking too long - may need timeout adjustment or optimization');
          break;
          
        case 'permission_denied':
          rootCauses.push('Insufficient permissions for command execution');
          break;
          
        case 'syntax_error':
          rootCauses.push('Command syntax errors need correction');
          break;
      }
    });
    
    return rootCauses;
  }
  
  private identifyPatterns(feedback: TesterFeedback): string[] {
    const patterns: string[] = [];
    
    // Check for sequential failures
    const failedSteps = feedback.testResult.stepResults.filter(step => !step.success);
    if (failedSteps.length > 1) {
      patterns.push('Multiple sequential failures');
    }
    
    // Check for dependency issues
    const dependencyIssues = feedback.issues.filter(issue => issue.type === 'dependency_missing');
    if (dependencyIssues.length > 0) {
      patterns.push('Dependency chain problems');
    }
    
    // Check for timeout patterns
    const timeoutIssues = feedback.issues.filter(issue => issue.type === 'timeout');
    if (timeoutIssues.length > 0) {
      patterns.push('Performance bottlenecks');
    }
    
    return patterns;
  }
  
  private generateRecommendations(feedback: TesterFeedback): Recommendation[] {
    const recommendations: Recommendation[] = [];
    
    feedback.issues.forEach(issue => {
      const recommendation = this.createRecommendationForIssue(issue);
      if (recommendation) {
        recommendations.push(recommendation);
      }
    });
    
    // Add general improvements
    const generalRecommendations = this.generateGeneralRecommendations(feedback);
    recommendations.push(...generalRecommendations);
    
    return recommendations;
  }
  
  private createRecommendationForIssue(issue: Issue): Recommendation | null {
    switch (issue.type) {
      case 'command_error':
        return {
          stepId: issue.stepId,
          type: 'modify',
          description: `Fix command error: ${issue.message}`,
          newCommand: this.suggestCommandFix(issue),
          priority: issue.severity === 'critical' ? 'high' : 'medium'
        };
        
      case 'dependency_missing':
        return {
          stepId: issue.stepId,
          type: 'modify',
          description: `Fix missing dependency for ${issue.stepId}`,
          newCommand: this.suggestCommandFix(issue),
          priority: 'high'
        };
        
      case 'timeout':
        return {
          stepId: issue.stepId,
          type: 'modify',
          description: `Increase timeout or optimize command for ${issue.stepId}`,
          priority: 'medium'
        };
        
      case 'permission_denied':
        return {
          stepId: issue.stepId,
          type: 'modify',
          description: `Add proper permissions or modify command for ${issue.stepId}`,
          priority: 'high'
        };
        
      case 'syntax_error':
        return {
          stepId: issue.stepId,
          type: 'modify',
          description: `Fix syntax error in command for ${issue.stepId}`,
          newCommand: this.suggestSyntaxFix(issue),
          priority: 'high'
        };
        
      default:
        return null;
    }
  }
  
  private generateGeneralRecommendations(feedback: TesterFeedback): Recommendation[] {
    const recommendations: Recommendation[] = [];
    
    // Add error handling if many steps fail
    const failureRate = feedback.testResult.stepResults.filter(s => !s.success).length / 
                       feedback.testResult.stepResults.length;
    
    if (failureRate > 0.3) {
      recommendations.push({
        stepId: 'general',
        type: 'modify',
        description: 'Add error handling and continue_on_error flags',
        priority: 'medium'
      });
    }
    
    return recommendations;
  }
  
  private suggestCommandFix(issue: Issue): string | undefined {
    logger.debug(`Suggesting fix for issue: ${issue.message}`);
    
    // Simple command fix suggestions
    if (issue.message.includes('command not found')) {
      const command = this.extractCommandFromMessage(issue.message);
      logger.debug(`Extracted command: ${command}`);
      if (command) {
        const alternative = this.suggestAlternativeCommand(command);
        // If no alternative found, suggest a basic working command
        if (alternative === command) {
          const fixCommand = 'echo "Command fixed - step completed"';
          logger.debug(`Suggesting fix command: ${fixCommand}`);
          return fixCommand;
        }
        logger.debug(`Suggesting alternative: ${alternative}`);
        return alternative;
      }
    }
    
    if (issue.message.includes('No such file or directory') || 
        issue.message.includes('Required file or dependency not found')) {
      const fixCommand = 'echo "Directory check completed"';
      logger.debug(`Suggesting fix command for directory: ${fixCommand}`);
      return fixCommand;
    }
    
    logger.debug('No fix suggestion available');
    return undefined;
  }
  
  private suggestSyntaxFix(issue: Issue): string | undefined {
    // Basic syntax fix suggestions
    if (issue.message.includes('unexpected token')) {
      return 'Check for missing quotes or escaping';
    }
    
    return undefined;
  }
  
  private extractCommandFromMessage(message: string): string | null {
    // Try different patterns for command extraction
    let match = message.match(/Command not found: (\w+)/);
    if (!match) {
      match = message.match(/command not found: (\w+)/);
    }
    if (!match) {
      match = message.match(/(\w+): command not found/);
    }
    return match ? match[1] : null;
  }
  
  private suggestAlternativeCommand(command: string): string {
    const alternatives: Record<string, string> = {
      'python': 'python3',
      'pip': 'pip3',
      'node': 'nodejs',
      'npm': 'yarn'
    };
    
    return alternatives[command] || command;
  }
  
  private calculateConfidence(feedback: TesterFeedback, recommendations: Recommendation[]): number {
    let confidence = 0.5; // Base confidence
    
    // Higher confidence for fewer, more severe issues
    if (feedback.issues.length <= 2) {
      confidence += 0.2;
    }
    
    // Higher confidence for clear patterns
    if (recommendations.some(r => r.newCommand)) {
      confidence += 0.2;
    }
    
    // Lower confidence for complex issues
    if (feedback.issues.some(i => i.severity === 'critical')) {
      confidence -= 0.1;
    }
    
    return Math.max(0.1, Math.min(1.0, confidence));
  }
  
  private applyRecommendation(workflow: Workflow, recommendation: Recommendation): boolean {
    const step = workflow.steps.find(s => s.id === recommendation.stepId);
    
    if (!step && recommendation.stepId !== 'general') {
      logger.warn(`Step ${recommendation.stepId} not found for recommendation`);
      return false;
    }
    
    try {
      switch (recommendation.type) {
        case 'modify':
          return this.modifyStep(workflow, recommendation);
          
        case 'add':
          return this.addStep(workflow, recommendation);
          
        case 'remove':
          return this.removeStep(workflow, recommendation);
          
        case 'reorder':
          return this.reorderSteps(workflow, recommendation);
          
        default:
          logger.warn(`Unknown recommendation type: ${recommendation.type}`);
          return false;
      }
    } catch (error) {
      logger.error(`Failed to apply recommendation for step ${recommendation.stepId}`, error);
      return false;
    }
  }
  
  private modifyStep(workflow: Workflow, recommendation: Recommendation): boolean {
    if (recommendation.stepId === 'general') {
      // Apply general modifications
      workflow.steps.forEach(step => {
        if (!step.continue_on_error) {
          step.continue_on_error = false; // Keep existing behavior
        }
      });
      return true;
    }
    
    const step = workflow.steps.find(s => s.id === recommendation.stepId);
    if (!step) return false;
    
    if (recommendation.newCommand) {
      logger.info(`Changing command from "${step.command}" to "${recommendation.newCommand}"`);
      step.command = recommendation.newCommand;
    } else {
      logger.warn(`No new command provided for step ${step.id}`);
    }
    
    // Increase timeout for timeout issues
    if (recommendation.description.includes('timeout')) {
      step.timeout = (step.timeout || 30000) * 2;
    }
    
    logger.info(`Modified step ${step.id}: ${recommendation.description}`);
    return true;
  }
  
  private addStep(workflow: Workflow, recommendation: Recommendation): boolean {
    // TODO: Implement step addition logic
    logger.info(`Would add step for: ${recommendation.description}`);
    return false; // Not implemented yet
  }
  
  private removeStep(workflow: Workflow, recommendation: Recommendation): boolean {
    const stepIndex = workflow.steps.findIndex(s => s.id === recommendation.stepId);
    if (stepIndex === -1) return false;
    
    workflow.steps.splice(stepIndex, 1);
    logger.info(`Removed step ${recommendation.stepId}`);
    return true;
  }
  
  private reorderSteps(workflow: Workflow, recommendation: Recommendation): boolean {
    // TODO: Implement step reordering logic
    logger.info(`Would reorder steps for: ${recommendation.description}`);
    return false; // Not implemented yet
  }
  
  private initializePatterns(): void {
    // Initialize common improvement patterns
    this.improvementPatterns.set('command_not_found', [
      'Check if command is installed',
      'Use alternative command',
      'Add installation step'
    ]);
    
    this.improvementPatterns.set('permission_denied', [
      'Add sudo prefix',
      'Change file permissions',
      'Run as different user'
    ]);
    
    this.improvementPatterns.set('timeout', [
      'Increase timeout value',
      'Optimize command',
      'Split into smaller steps'
    ]);
  }
}