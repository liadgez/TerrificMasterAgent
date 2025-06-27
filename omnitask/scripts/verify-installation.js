#!/usr/bin/env node

/**
 * Installation verification script for OmniTask
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

class InstallationVerifier {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.homedir = os.homedir();
  }

  async verify() {
    console.log('🔍 Verifying OmniTask installation...\n');

    await this.checkSystemRequirements();
    await this.checkDirectories();
    await this.checkDependencies();
    await this.checkPermissions();
    await this.checkBrowsers();
    await this.performHealthCheck();

    this.generateReport();
  }

  async checkSystemRequirements() {
    console.log('📋 Checking system requirements...');

    // Platform check
    if (os.platform() !== 'darwin') {
      this.errors.push('macOS required for desktop automation');
    } else {
      console.log('   ✓ macOS detected');
    }

    // Node.js version
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.substring(1).split('.')[0]);
    
    if (majorVersion < 18) {
      this.errors.push(`Node.js 18+ required, found ${nodeVersion}`);
    } else {
      console.log(`   ✓ Node.js ${nodeVersion}`);
    }

    // Memory check
    const totalMemory = os.totalmem() / (1024 * 1024 * 1024);
    if (totalMemory < 8) {
      this.warnings.push(`Low memory: ${totalMemory.toFixed(1)}GB (8GB+ recommended)`);
    } else {
      console.log(`   ✓ Memory: ${totalMemory.toFixed(1)}GB`);
    }

    // Disk space check
    try {
      const stats = fs.statSync(process.cwd());
      console.log('   ✓ Application directory accessible');
    } catch (error) {
      this.errors.push('Application directory not accessible');
    }
  }

  async checkDirectories() {
    console.log('📁 Checking directories...');

    const requiredDirs = [
      path.join(this.homedir, '.omnitask'),
      path.join(this.homedir, '.omnitask', 'data'),
      path.join(this.homedir, '.omnitask', 'logs'),
      path.join(this.homedir, '.omnitask', 'cache')
    ];

    for (const dir of requiredDirs) {
      if (fs.existsSync(dir)) {
        console.log(`   ✓ ${path.basename(dir)}/`);
      } else {
        this.warnings.push(`Directory missing: ${dir}`);
      }
    }

    // Check config file
    const configPath = path.join(this.homedir, '.omnitask', 'config.json');
    if (fs.existsSync(configPath)) {
      try {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        console.log(`   ✓ Configuration (v${config.version})`);
      } catch (error) {
        this.warnings.push('Configuration file corrupted');
      }
    } else {
      this.warnings.push('Configuration file missing');
    }
  }

  async checkDependencies() {
    console.log('📦 Checking dependencies...');

    const dependencies = [
      'next',
      'react',
      'playwright',
      '@playwright/test'
    ];

    for (const dep of dependencies) {
      try {
        const pkg = require(`${dep}/package.json`);
        console.log(`   ✓ ${dep} v${pkg.version}`);
      } catch (error) {
        this.errors.push(`Missing dependency: ${dep}`);
      }
    }

    // Check if built
    const buildDir = path.join(process.cwd(), '.next');
    if (fs.existsSync(buildDir)) {
      console.log('   ✓ Application built');
    } else {
      this.warnings.push('Application not built (run: npm run build)');
    }
  }

  async checkPermissions() {
    console.log('🔐 Checking macOS permissions...');

    // Test AppleScript execution
    try {
      execSync('osascript -e "return 1"', { stdio: 'pipe' });
      console.log('   ✓ AppleScript execution');
    } catch (error) {
      this.warnings.push('AppleScript execution requires permissions');
    }

    // Test System Events access
    try {
      execSync('osascript -e "tell application \\"System Events\\" to get name"', 
        { stdio: 'pipe' });
      console.log('   ✓ System Events access');
    } catch (error) {
      this.warnings.push('System Events access requires permissions');
    }

    // Test Finder automation
    try {
      execSync('osascript -e "tell application \\"Finder\\" to get name"', 
        { stdio: 'pipe' });
      console.log('   ✓ Finder automation');
    } catch (error) {
      this.warnings.push('Finder automation requires permissions');
    }

    // Check Terminal access (for file operations)
    try {
      fs.accessSync(process.cwd(), fs.constants.R_OK | fs.constants.W_OK);
      console.log('   ✓ File system access');
    } catch (error) {
      this.errors.push('File system access denied');
    }
  }

  async checkBrowsers() {
    console.log('🌐 Checking browsers...');

    const browsers = ['chromium', 'firefox', 'webkit'];
    const { execSync } = require('child_process');

    for (const browser of browsers) {
      try {
        const result = execSync(`npx playwright install --dry-run ${browser}`, 
          { encoding: 'utf8', stdio: 'pipe' });
        
        if (result.includes('is already installed')) {
          console.log(`   ✓ ${browser} installed`);
        } else {
          this.warnings.push(`${browser} not installed`);
        }
      } catch (error) {
        this.warnings.push(`Cannot check ${browser} installation`);
      }
    }
  }

  async performHealthCheck() {
    console.log('🏥 Performing health check...');

    // Test command parsing
    try {
      const { parseCommand } = require('../src/lib/commandParser');
      const result = parseCommand('search for test');
      
      if (result && result.type && result.confidence > 0) {
        console.log('   ✓ Command parsing');
      } else {
        this.warnings.push('Command parsing may have issues');
      }
    } catch (error) {
      this.errors.push('Command parser not working');
    }

    // Test task queue
    try {
      const { TaskQueue } = require('../src/lib/taskQueue');
      const queue = new TaskQueue(false); // Don't auto-process
      console.log('   ✓ Task queue initialization');
    } catch (error) {
      this.errors.push('Task queue initialization failed');
    }

    // Test performance monitoring
    try {
      const { globalPerformanceMonitor } = require('../src/lib/performance/performanceMonitor');
      const metrics = globalPerformanceMonitor.collectMetrics();
      
      if (metrics && typeof metrics.timestamp === 'number') {
        console.log('   ✓ Performance monitoring');
      } else {
        this.warnings.push('Performance monitoring issues detected');
      }
    } catch (error) {
      this.warnings.push('Performance monitoring not available');
    }

    // Test cache system
    try {
      const { globalCommandCache } = require('../src/lib/performance/commandCache');
      globalCommandCache.set('test', { type: 'test', category: 'test', action: 'test', parameters: {}, confidence: 1 });
      const cached = globalCommandCache.get('test');
      
      if (cached) {
        console.log('   ✓ Command caching');
      } else {
        this.warnings.push('Command caching not working');
      }
    } catch (error) {
      this.warnings.push('Command cache system issues');
    }
  }

  generateReport() {
    console.log('\n📊 Installation Report');
    console.log('═'.repeat(50));

    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log('🎉 Perfect! OmniTask is ready to use.');
      console.log('\n🚀 Start the application:');
      console.log('   npm run dev');
      console.log('\n🌐 Then open: http://localhost:3000');
      return;
    }

    if (this.errors.length > 0) {
      console.log('\n❌ Errors (must be fixed):');
      this.errors.forEach(error => console.log(`   • ${error}`));
    }

    if (this.warnings.length > 0) {
      console.log('\n⚠️  Warnings (recommended to fix):');
      this.warnings.forEach(warning => console.log(`   • ${warning}`));
    }

    console.log('\n🔧 Troubleshooting:');
    
    if (this.errors.some(e => e.includes('dependency'))) {
      console.log('   • Run: npm install');
    }
    
    if (this.warnings.some(w => w.includes('permissions'))) {
      console.log('   • Grant permissions in System Preferences > Security & Privacy');
    }
    
    if (this.warnings.some(w => w.includes('browser'))) {
      console.log('   • Run: npx playwright install');
    }
    
    if (this.warnings.some(w => w.includes('built'))) {
      console.log('   • Run: npm run build');
    }

    console.log('\n📖 For detailed help, see: docs/DEPLOYMENT.md');

    if (this.errors.length > 0) {
      process.exit(1);
    }
  }
}

// Run verification if called directly
if (require.main === module) {
  const verifier = new InstallationVerifier();
  verifier.verify().catch(console.error);
}

module.exports = InstallationVerifier;