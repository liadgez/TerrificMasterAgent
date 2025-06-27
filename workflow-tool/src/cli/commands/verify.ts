import chalk from 'chalk';
import { WorkflowParser } from '../../core/workflow-parser';
import { TesterAgent } from '../../agents/tester';
import { logger } from '../../utils/logger';

export async function verifyCommand(workflowFile: string) {
  try {
    logger.info(`Force verifying workflow: ${workflowFile}`);
    
    // Parse workflow
    const parser = new WorkflowParser();
    const workflow = await parser.parse(workflowFile);
    
    console.log(chalk.blue(`🔍 Verifying workflow: ${workflow.name}`));
    
    // Run verification test
    const tester = new TesterAgent();
    const result = await tester.executeWorkflow(workflow);
    
    if (result.success) {
      console.log(chalk.green('✅ Verification PASSED - Workflow ready for VERIFIED status'));
      
      // TODO: Add verification signature to workflow file
      console.log(chalk.green.bold('🎉 WORKFLOW VERIFIED!'));
      
    } else {
      console.log(chalk.red('❌ Verification FAILED - Workflow needs improvement'));
      console.log(chalk.red(`Failed at: ${result.failedStep?.name || 'unknown step'}`));
    }
    
  } catch (error) {
    console.error(chalk.red('Error during verification:'), error);
    logger.error('Verification failed', { error, workflowFile });
    process.exit(1);
  }
}