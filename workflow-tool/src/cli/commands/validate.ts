import chalk from 'chalk';
import { WorkflowParser } from '../../core/workflow-parser';
import { TesterAgent } from '../../agents/tester';
import { logger } from '../../utils/logger';

export async function validateCommand(workflowFile: string) {
  try {
    logger.info(`Validating workflow: ${workflowFile}`);
    
    // Parse workflow
    const parser = new WorkflowParser();
    const workflow = await parser.parse(workflowFile);
    
    console.log(chalk.blue(`Validating workflow: ${workflow.name}`));
    
    // Run validation with Tester Agent
    const tester = new TesterAgent();
    const result = await tester.executeWorkflow(workflow);
    
    if (result.success) {
      console.log(chalk.green('✅ Workflow validation passed'));
      console.log(chalk.blue(`Executed ${result.completedSteps} steps successfully`));
    } else {
      console.log(chalk.red('❌ Workflow validation failed'));
      console.log(chalk.red(`Failed at step: ${result.failedStep?.name || 'unknown'}`));
      console.log(chalk.red(`Error: ${result.error}`));
    }
    
    // Show detailed results
    result.stepResults.forEach((stepResult, index) => {
      const status = stepResult.success ? chalk.green('✅') : chalk.red('❌');
      console.log(`${status} Step ${index + 1}: ${stepResult.stepName}`);
      
      if (!stepResult.success) {
        console.log(chalk.red(`   Error: ${stepResult.error}`));
      }
    });
    
  } catch (error) {
    console.error(chalk.red('Error during validation:'), error);
    logger.error('Validation failed', { error, workflowFile });
    process.exit(1);
  }
}