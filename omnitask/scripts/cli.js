#!/usr/bin/env node

/**
 * OmniTask CLI - Simple command line interface
 */

const { program } = require('commander');
const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));

program
  .name('omnitask')
  .description('OmniTask - AI-powered automation for web and macOS')
  .version(packageJson.version);

program
  .command('start')
  .description('Start the OmniTask server')
  .option('-p, --port <port>', 'Port to run on', '3000')
  .option('-d, --dev', 'Run in development mode')
  .action((options) => {
    console.log('🚀 Starting OmniTask...');
    
    const script = options.dev ? 'dev' : 'start';
    const env = { ...process.env };
    
    if (options.port) {
      env.PORT = options.port;
    }
    
    try {
      const child = spawn('npm', ['run', script], {
        stdio: 'inherit',
        env
      });
      
      child.on('close', (code) => {
        process.exit(code);
      });
      
    } catch (error) {
      console.error('❌ Failed to start OmniTask:', error.message);
      process.exit(1);
    }
  });

program
  .command('setup')
  .description('Set up OmniTask permissions and dependencies')
  .action(() => {
    console.log('🔧 Setting up OmniTask...');
    
    try {
      execSync('npm run setup:permissions', { stdio: 'inherit' });
      console.log('✅ Setup completed successfully!');
    } catch (error) {
      console.error('❌ Setup failed:', error.message);
      process.exit(1);
    }
  });

program
  .command('verify')
  .description('Verify OmniTask installation')
  .action(() => {
    console.log('🔍 Verifying OmniTask installation...');
    
    try {
      execSync('npm run verify', { stdio: 'inherit' });
    } catch (error) {
      console.error('❌ Verification failed:', error.message);
      process.exit(1);
    }
  });

program
  .command('test')
  .description('Run OmniTask tests')
  .option('-w, --watch', 'Run tests in watch mode')
  .option('-c, --coverage', 'Run tests with coverage')
  .action((options) => {
    console.log('🧪 Running OmniTask tests...');
    
    let script = 'test';
    if (options.watch) {
      script = 'test:watch';
    } else if (options.coverage) {
      script = 'test:coverage';
    }
    
    try {
      execSync(`npm run ${script}`, { stdio: 'inherit' });
    } catch (error) {
      console.error('❌ Tests failed:', error.message);
      process.exit(1);
    }
  });

program
  .command('build')
  .description('Build OmniTask for production')
  .action(() => {
    console.log('🔨 Building OmniTask...');
    
    try {
      execSync('npm run build', { stdio: 'inherit' });
      console.log('✅ Build completed successfully!');
    } catch (error) {
      console.error('❌ Build failed:', error.message);
      process.exit(1);
    }
  });

program
  .command('package')
  .description('Create distribution packages')
  .action(() => {
    console.log('📦 Creating distribution packages...');
    
    try {
      execSync('npm run package:zip', { stdio: 'inherit' });
      console.log('✅ Packages created successfully!');
    } catch (error) {
      console.error('❌ Packaging failed:', error.message);
      process.exit(1);
    }
  });

program
  .command('clean')
  .description('Clean build artifacts and dependencies')
  .action(() => {
    console.log('🧹 Cleaning OmniTask...');
    
    try {
      execSync('npm run clean', { stdio: 'inherit' });
      console.log('✅ Cleaned successfully!');
    } catch (error) {
      console.error('❌ Clean failed:', error.message);
      process.exit(1);
    }
  });

program
  .command('info')
  .description('Show OmniTask system information')
  .action(() => {
    console.log('ℹ️  OmniTask System Information');
    console.log('═'.repeat(40));
    console.log(`Version: ${packageJson.version}`);
    console.log(`Node.js: ${process.version}`);
    console.log(`Platform: ${process.platform}`);
    console.log(`Architecture: ${process.arch}`);
    console.log(`Working Directory: ${process.cwd()}`);
    
    // Check if built
    const buildExists = fs.existsSync(path.join(process.cwd(), '.next'));
    console.log(`Built: ${buildExists ? '✅' : '❌'}`);
    
    // Check config
    const configPath = path.join(require('os').homedir(), '.omnitask', 'config.json');
    const configExists = fs.existsSync(configPath);
    console.log(`Configured: ${configExists ? '✅' : '❌'}`);
  });

// Add help examples
program.on('--help', () => {
  console.log('');
  console.log('Examples:');
  console.log('  $ omnitask start              # Start in production mode');
  console.log('  $ omnitask start --dev        # Start in development mode');
  console.log('  $ omnitask start -p 8080      # Start on port 8080');
  console.log('  $ omnitask setup              # Set up permissions');
  console.log('  $ omnitask verify             # Verify installation');
  console.log('  $ omnitask test --coverage    # Run tests with coverage');
  console.log('  $ omnitask package            # Create distribution package');
  console.log('');
  console.log('For more information, visit:');
  console.log('  https://github.com/liadgez/TerrificMasterAgent');
});

// Parse command line arguments
program.parse();

// If no command provided, show help
if (!process.argv.slice(2).length) {
  program.outputHelp();
}