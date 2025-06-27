#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { improveCommand } from './commands/improve';
import { validateCommand } from './commands/validate';
import { watchCommand } from './commands/watch';
import { createCommand } from './commands/create';
import { historyCommand } from './commands/history';
import { verifyCommand } from './commands/verify';
import { statusCommand } from './commands/status';

const program = new Command();

program
  .name('workflow-tool')
  .description('Self-improving workflow tool with AI agents')
  .version('1.0.0');

program
  .command('improve')
  .description('Start iterative improvement cycle for a workflow')
  .argument('<workflow-file>', 'Path to workflow file')
  .option('-m, --max-iterations <number>', 'Maximum number of iterations', '10')
  .option('-t, --timeout <number>', 'Timeout per iteration in seconds', '300')
  .action(improveCommand);

program
  .command('validate')
  .description('Validate a workflow without improvements')
  .argument('<workflow-file>', 'Path to workflow file')
  .action(validateCommand);

program
  .command('watch')
  .description('Watch mode - continuous improvement')
  .argument('<workflow-file>', 'Path to workflow file')
  .option('-i, --interval <number>', 'Check interval in seconds', '30')
  .action(watchCommand);

program
  .command('create')
  .description('Create new workflow from template')
  .argument('<name>', 'Workflow name')
  .option('-t, --template <type>', 'Template type', 'basic')
  .action(createCommand);

program
  .command('history')
  .description('Show improvement history for a workflow')
  .argument('<workflow-file>', 'Path to workflow file')
  .action(historyCommand);

program
  .command('verify')
  .description('Force verification check on a workflow')
  .argument('<workflow-file>', 'Path to workflow file')
  .action(verifyCommand);

program
  .command('status')
  .description('Show verification status of a workflow')
  .argument('<workflow-file>', 'Path to workflow file')
  .action(statusCommand);

// Error handling
program.configureOutput({
  writeErr: (str) => process.stderr.write(chalk.red(str)),
});

program.parse();