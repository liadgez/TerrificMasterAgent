#!/usr/bin/env node

/**
 * Setup script for macOS permissions and initial configuration
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

class SetupManager {
  constructor() {
    this.platform = os.platform();
    this.homedir = os.homedir();
    this.appDir = process.cwd();
  }

  async run() {
    console.log('🚀 Setting up OmniTask for macOS...\n');

    try {
      await this.checkPlatform();
      await this.checkNodeVersion();
      await this.createDirectories();
      await this.setupMacOSPermissions();
      await this.installPlaywrightBrowsers();
      await this.verifyInstallation();
      
      console.log('\n✅ Setup completed successfully!');
      console.log('\n📖 Next steps:');
      console.log('   1. Run: npm run dev');
      console.log('   2. Open: http://localhost:3000');
      console.log('   3. Grant any additional permissions when prompted');
      
    } catch (error) {
      console.error('\n❌ Setup failed:', error.message);
      process.exit(1);
    }
  }

  async checkPlatform() {
    console.log('🔍 Checking platform compatibility...');
    
    if (this.platform !== 'darwin') {
      throw new Error('OmniTask requires macOS for desktop automation features');
    }

    // Check macOS version
    try {
      const version = execSync('sw_vers -productVersion', { encoding: 'utf8' }).trim();
      const [major, minor] = version.split('.').map(Number);
      
      if (major < 10 || (major === 10 && minor < 15)) {
        throw new Error(`macOS 10.15 or later required. Found: ${version}`);
      }
      
      console.log(`   ✓ macOS ${version} detected`);
    } catch (error) {
      throw new Error('Unable to determine macOS version');
    }
  }

  async checkNodeVersion() {
    console.log('🔍 Checking Node.js version...');
    
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.substring(1).split('.')[0]);
    
    if (majorVersion < 18) {
      throw new Error(`Node.js 18+ required. Found: ${nodeVersion}`);
    }
    
    console.log(`   ✓ Node.js ${nodeVersion} detected`);
  }

  async createDirectories() {
    console.log('📁 Creating application directories...');
    
    const dirs = [
      path.join(this.homedir, '.omnitask'),
      path.join(this.homedir, '.omnitask', 'data'),
      path.join(this.homedir, '.omnitask', 'logs'),
      path.join(this.homedir, '.omnitask', 'cache'),
      path.join(this.homedir, '.omnitask', 'scripts')
    ];

    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`   ✓ Created: ${dir}`);
      } else {
        console.log(`   ✓ Exists: ${dir}`);
      }
    }
  }

  async setupMacOSPermissions() {
    console.log('🔐 Setting up macOS permissions...');
    
    // Check if accessibility permissions are needed
    try {
      // Test AppleScript execution
      execSync('osascript -e "tell application \\"System Events\\" to get name of processes"', 
        { stdio: 'pipe' });
      console.log('   ✓ Accessibility permissions verified');
    } catch (error) {
      console.log('   ⚠️  Accessibility permissions may be required');
      console.log('   👉 You may need to grant accessibility permissions in:');
      console.log('      System Preferences > Security & Privacy > Privacy > Accessibility');
    }

    // Check automation permissions
    try {
      execSync('osascript -e "tell application \\"Finder\\" to get name"', 
        { stdio: 'pipe' });
      console.log('   ✓ Automation permissions verified');
    } catch (error) {
      console.log('   ⚠️  Automation permissions may be required');
      console.log('   👉 You may need to grant automation permissions when prompted');
    }

    // Create sample AppleScript for testing
    const testScript = `#!/usr/bin/osascript
tell application "System Events"
    display notification "OmniTask is ready!" with title "Setup Complete"
end tell`;

    const scriptPath = path.join(this.homedir, '.omnitask', 'scripts', 'test-notification.scpt');
    fs.writeFileSync(scriptPath, testScript);
    console.log('   ✓ Test script created');
  }

  async installPlaywrightBrowsers() {
    console.log('🌐 Installing Playwright browsers...');
    
    try {
      // Install chromium only for faster setup
      execSync('npx playwright install chromium', { stdio: 'inherit' });
      console.log('   ✓ Chromium browser installed');
    } catch (error) {
      console.log('   ⚠️  Browser installation failed, will retry on first use');
    }
  }

  async verifyInstallation() {
    console.log('🔬 Verifying installation...');
    
    // Test Node.js modules
    try {
      require('playwright');
      console.log('   ✓ Playwright module loaded');
    } catch (error) {
      throw new Error('Playwright module not found');
    }

    // Test Next.js
    try {
      require('next');
      console.log('   ✓ Next.js module loaded');
    } catch (error) {
      throw new Error('Next.js module not found');
    }

    // Test AppleScript execution
    try {
      execSync('osascript -e "return 1"', { stdio: 'pipe' });
      console.log('   ✓ AppleScript execution verified');
    } catch (error) {
      console.log('   ⚠️  AppleScript execution may require permissions');
    }

    // Create initial configuration
    const configPath = path.join(this.homedir, '.omnitask', 'config.json');
    if (!fs.existsSync(configPath)) {
      const config = {
        version: '1.0.0',
        setupDate: new Date().toISOString(),
        platform: this.platform,
        nodeVersion: process.version,
        features: {
          webAutomation: true,
          desktopAutomation: true,
          performanceMonitoring: true,
          securityAudit: true
        }
      };
      
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      console.log('   ✓ Configuration file created');
    }
  }
}

// Run setup if called directly
if (require.main === module) {
  const setup = new SetupManager();
  setup.run().catch(console.error);
}

module.exports = SetupManager;