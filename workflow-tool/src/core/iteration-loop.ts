import { Workflow, IterationResult, IterationLoopConfig, TestResult, TesterFeedback } from '../types/workflow';
import { TesterAgent } from '../agents/tester';
import { ManagerAgent } from '../agents/manager';
import { WorkflowParser } from './workflow-parser';
import { logger, logIterationComplete, logWorkflowEvent } from '../utils/logger';

export class IterationLoop {
  private config: IterationLoopConfig;
  private tester: TesterAgent;
  private manager: ManagerAgent;
  private parser: WorkflowParser;
  
  constructor(config: IterationLoopConfig) {
    this.config = config;
    this.tester = new TesterAgent();
    this.manager = new ManagerAgent();
    this.parser = new WorkflowParser();
  }
  
  async run(workflow: Workflow): Promise<IterationResult> {
    logger.info(`Starting iteration loop for workflow: ${workflow.name}`);
    logWorkflowEvent('iteration_start', workflow.name, {
      maxIterations: this.config.maxIterations,
      timeout: this.config.timeout
    });
    
    const history: TestResult[] = [];
    let currentWorkflow = { ...workflow };
    let iterations = 0;
    let lastResult: TestResult | null = null;
    
    try {
      while (iterations < this.config.maxIterations) {
        iterations++;
        logger.info(`Starting iteration ${iterations}/${this.config.maxIterations}`);
        
        // Test current workflow
        const testResult = await this.tester.executeWorkflow(currentWorkflow);
        history.push(testResult);
        lastResult = testResult;
        
        logIterationComplete(iterations, workflow.name, testResult.success, {
          completedSteps: testResult.completedSteps,
          totalSteps: testResult.totalSteps,
          duration: testResult.duration
        });
        
        // Check if workflow is perfect (ready for verification)
        if (testResult.success) {
          // Check if workflow is stable/complete
          if (this.manager.isComplete(currentWorkflow, history)) {
            logger.info(`Workflow stable on iteration ${iterations} - ready for verification`);
            
            // Perform final verification run
            const verificationResult = await this.verifyWorkflow(currentWorkflow);
            
            if (verificationResult) {
              // Update workflow with verification signature
              await this.addVerificationSignature(currentWorkflow);
              
              logWorkflowEvent('workflow_verified', workflow.name, {
                iterations,
                finalSuccessRate: 1.0
              });
              
              return {
                success: true,
                iterations,
                finalStatus: 'verified',
                verified: true,
                history
              };
            }
          } else {
            // Successful but not yet stable, continue iterating
            logger.info(`Workflow successful but not yet stable, continuing...`);
          }
        } else {
          // Workflow failed, use Manager Agent to improve it
          logger.info(`Workflow failed on iteration ${iterations} - analyzing and improving`);
          
          // Generate feedback from Tester Agent
          const feedback = this.tester.generateFeedback(currentWorkflow, testResult);
          
          // Analyze feedback with Manager Agent
          const analysis = this.manager.analyzeFeedback(feedback);
          
          logger.info(`Analysis complete - confidence: ${analysis.confidenceScore.toFixed(2)}`);
          logger.info(`Root causes: ${analysis.rootCauses.join(', ')}`);
          
          // Improve workflow based on analysis
          const improvedWorkflow = this.manager.improveWorkflow(currentWorkflow, analysis);
          
          // Update success rate
          improvedWorkflow.metadata.success_rate = history.filter(r => r.success).length / history.length;
          
          // Save improved workflow
          await this.parser.save(improvedWorkflow, this.config.workflowFile);
          
          currentWorkflow = improvedWorkflow;
          
          logger.info(`Workflow improved for iteration ${iterations + 1}`);
        }
        
        logger.info(`Iteration ${iterations} completed - continuing improvement`);
      }
      
      // Maximum iterations reached or workflow is stable
      const finalStatus = lastResult?.success ? 'stable' : 'failed';
      
      logWorkflowEvent('iteration_complete', workflow.name, {
        iterations,
        finalStatus,
        success: lastResult?.success || false
      });
      
      return {
        success: lastResult?.success || false,
        iterations,
        finalStatus,
        verified: false,
        history
      };
      
    } catch (error) {
      logger.error(`Iteration loop failed for workflow: ${workflow.name}`, error);
      
      return {
        success: false,
        iterations,
        finalStatus: 'error',
        verified: false,
        error: error instanceof Error ? error.message : String(error),
        history
      };
    }
  }
  
  private async verifyWorkflow(workflow: Workflow): Promise<boolean> {
    logger.info(`Performing final verification for workflow: ${workflow.name}`);
    
    // Run one final complete test
    const verificationResult = await this.tester.executeWorkflow(workflow);
    
    // Must be 100% successful for verification
    return verificationResult.success && 
           verificationResult.completedSteps === verificationResult.totalSteps;
  }
  
  private async addVerificationSignature(workflow: Workflow): Promise<void> {
    // Update workflow metadata with verification
    workflow.metadata.verification = {
      verified: true,
      verified_at: new Date().toISOString(),
      signature: 'VERIFIED',
      total_iterations: workflow.metadata.iterations,
      final_success_rate: 1.0
    };
    
    workflow.metadata.status = 'verified';
    workflow.metadata.last_updated = new Date().toISOString();
    
    // Save updated workflow
    await this.parser.save(workflow, this.config.workflowFile);
    
    logger.info(`Added VERIFIED signature to workflow: ${workflow.name}`);
  }
}