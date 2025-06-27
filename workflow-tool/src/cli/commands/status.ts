import chalk from 'chalk';
import { WorkflowParser } from '../../core/workflow-parser';
import { logger } from '../../utils/logger';

export async function statusCommand(workflowFile: string) {
  try {
    logger.info(`Checking status for: ${workflowFile}`);
    
    // Parse workflow
    const parser = new WorkflowParser();
    const workflow = await parser.parse(workflowFile);
    
    console.log(chalk.blue(`📊 Status for workflow: ${workflow.name}`));
    console.log(chalk.blue(`Version: ${workflow.version}`));
    console.log(chalk.blue(`Steps: ${workflow.steps.length}`));
    
    // Show metadata
    const metadata = workflow.metadata;
    console.log(chalk.blue(`Iterations: ${metadata.iterations}`));
    console.log(chalk.blue(`Success Rate: ${(metadata.success_rate * 100).toFixed(1)}%`));
    console.log(chalk.blue(`Status: ${metadata.status}`));
    
    // Show verification status
    if (metadata.verification?.verified) {
      console.log(chalk.green.bold('🎉 VERIFIED'));
      console.log(chalk.green(`Verified at: ${metadata.verification.verified_at}`));
      console.log(chalk.green(`Signature: ${metadata.verification.signature}`));
    } else {
      console.log(chalk.yellow('⏳ Not yet verified'));
    }
    
  } catch (error) {
    console.error(chalk.red('Error checking status:'), error);
    logger.error('Status check failed', { error, workflowFile });
    process.exit(1);
  }
}