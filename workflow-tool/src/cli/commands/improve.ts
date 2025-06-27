import chalk from 'chalk';
import ora from 'ora';
import { WorkflowParser } from '../../core/workflow-parser';
import { IterationLoop } from '../../core/iteration-loop';
import { logger } from '../../utils/logger';

interface ImproveOptions {
  maxIterations: string;
  timeout: string;
}

export async function improveCommand(workflowFile: string, options: ImproveOptions) {
  const spinner = ora('Starting workflow improvement...').start();
  
  try {
    const maxIterations = parseInt(options.maxIterations);
    const timeout = parseInt(options.timeout) * 1000; // Convert to milliseconds
    
    logger.info(`Starting improvement for workflow: ${workflowFile}`);
    logger.info(`Max iterations: ${maxIterations}, Timeout: ${timeout}ms`);
    
    // Parse workflow
    const parser = new WorkflowParser();
    const workflow = await parser.parse(workflowFile);
    
    spinner.text = 'Workflow parsed successfully';
    
    // Start improvement loop
    const iterationLoop = new IterationLoop({
      maxIterations,
      timeout,
      workflowFile
    });
    
    const result = await iterationLoop.run(workflow);
    
    spinner.stop();
    
    if (result.success) {
      console.log(chalk.green('✅ Workflow improvement completed successfully!'));
      console.log(chalk.blue(`Iterations: ${result.iterations}`));
      console.log(chalk.blue(`Final status: ${result.finalStatus}`));
      
      if (result.verified) {
        console.log(chalk.green.bold('🎉 WORKFLOW VERIFIED!'));
      }
    } else {
      console.log(chalk.red('❌ Workflow improvement failed'));
      console.log(chalk.red(`Error: ${result.error}`));
    }
    
  } catch (error) {
    spinner.stop();
    console.error(chalk.red('Error during improvement:'), error);
    logger.error('Improvement failed', { error, workflowFile });
    process.exit(1);
  }
}