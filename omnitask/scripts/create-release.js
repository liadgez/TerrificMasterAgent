#!/usr/bin/env node

/**
 * Release packaging script for OmniTask
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const archiver = require('archiver');

class ReleasePackager {
  constructor() {
    this.packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    this.version = this.packageJson.version;
    this.releaseDir = path.join(process.cwd(), 'releases');
    this.tempDir = path.join(this.releaseDir, 'temp');
  }

  async createRelease() {
    console.log(`📦 Creating OmniTask v${this.version} release package...\n`);

    try {
      await this.prepareDirectories();
      await this.buildApplication();
      await this.copyFiles();
      await this.createPackages();
      await this.generateChecksums();
      await this.cleanup();
      
      console.log('\n✅ Release packages created successfully!');
      this.showReleaseInfo();
      
    } catch (error) {
      console.error('\n❌ Release creation failed:', error.message);
      await this.cleanup();
      process.exit(1);
    }
  }

  async prepareDirectories() {
    console.log('📁 Preparing directories...');

    // Clean and create release directories
    if (fs.existsSync(this.releaseDir)) {
      fs.rmSync(this.releaseDir, { recursive: true, force: true });
    }

    fs.mkdirSync(this.releaseDir, { recursive: true });
    fs.mkdirSync(this.tempDir, { recursive: true });
    
    console.log('   ✓ Release directories prepared');
  }

  async buildApplication() {
    console.log('🔨 Building application...');

    try {
      // Clean previous build
      if (fs.existsSync('.next')) {
        fs.rmSync('.next', { recursive: true, force: true });
      }

      // Run linting and tests
      console.log('   → Running linter...');
      execSync('npm run lint', { stdio: 'pipe' });

      console.log('   → Running tests...');
      execSync('npm run test', { stdio: 'pipe' });

      // Build application
      console.log('   → Building Next.js application...');
      execSync('npm run build', { stdio: 'pipe' });

      console.log('   ✓ Application built successfully');
      
    } catch (error) {
      throw new Error('Build failed: ' + error.message);
    }
  }

  async copyFiles() {
    console.log('📋 Copying release files...');

    const filesToCopy = [
      // Core files
      'package.json',
      'package-lock.json',
      'next.config.ts',
      'tsconfig.json',
      'tailwind.config.ts',
      'postcss.config.mjs',
      'README.md',
      'LICENSE',
      
      // Application code
      { from: 'src', to: 'src' },
      { from: '.next', to: '.next' },
      { from: 'public', to: 'public' },
      
      // Scripts and configuration
      { from: 'scripts', to: 'scripts' },
      { from: 'docs', to: 'docs' },
      
      // Tests (optional for development releases)
      { from: '__tests__', to: '__tests__' },
      { from: 'jest.config.js', to: 'jest.config.js' },
      { from: 'jest.setup.js', to: 'jest.setup.js' }
    ];

    for (const file of filesToCopy) {
      try {
        if (typeof file === 'string') {
          this.copyFileOrDir(file, path.join(this.tempDir, file));
        } else {
          this.copyFileOrDir(file.from, path.join(this.tempDir, file.to));
        }
      } catch (error) {
        console.log(`   ⚠️  Skipped: ${typeof file === 'string' ? file : file.from}`);
      }
    }

    // Create installation scripts
    await this.createInstallationFiles();
    
    console.log('   ✓ Files copied to release package');
  }

  copyFileOrDir(source, destination) {
    const stat = fs.statSync(source);
    
    if (stat.isDirectory()) {
      fs.mkdirSync(destination, { recursive: true });
      const files = fs.readdirSync(source);
      
      for (const file of files) {
        this.copyFileOrDir(
          path.join(source, file),
          path.join(destination, file)
        );
      }
    } else {
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.copyFileSync(source, destination);
    }
  }

  async createInstallationFiles() {
    console.log('📜 Creating installation files...');

    // Create install script
    const installScript = `#!/bin/bash
# OmniTask Installation Script

set -e

echo "🚀 Installing OmniTask v${this.version}..."

# Check requirements
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required but not installed."
    echo "Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node --version | cut -d 'v' -f 2 | cut -d '.' -f 1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js 18+ is required. Found: $(node --version)"
    exit 1
fi

# Check macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "❌ OmniTask requires macOS for desktop automation features."
    exit 1
fi

echo "✓ System requirements met"

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --production

echo "🔧 Setting up permissions and browsers..."
npm run setup:permissions

echo "🧪 Verifying installation..."
npm run verify

echo "✅ OmniTask installation complete!"
echo ""
echo "🚀 To start OmniTask:"
echo "   npm run dev"
echo ""
echo "🌐 Then open: http://localhost:3000"
echo ""
echo "📖 Documentation: ./docs/"
`;

    fs.writeFileSync(path.join(this.tempDir, 'install.sh'), installScript);
    fs.chmodSync(path.join(this.tempDir, 'install.sh'), '755');

    // Create Windows batch file (limited functionality)
    const windowsInstallScript = `@echo off
echo OmniTask is designed for macOS and requires manual setup on Windows.
echo Please refer to the documentation for manual installation instructions.
echo.
echo For full functionality, please use macOS.
pause
`;

    fs.writeFileSync(path.join(this.tempDir, 'install.bat'), windowsInstallScript);

    // Create quick start guide
    const quickStart = `# OmniTask Quick Start

## Installation

### macOS (Recommended)
\`\`\`bash
chmod +x install.sh
./install.sh
\`\`\`

### Manual Installation
\`\`\`bash
npm ci --production
npm run setup:permissions
npm run verify
\`\`\`

## First Run

1. Start the application:
   \`\`\`bash
   npm run dev
   \`\`\`

2. Open your browser to: http://localhost:3000

3. Try your first command:
   \`\`\`
   "search google for today's weather"
   \`\`\`

## Documentation

- Full documentation: \`docs/\`
- User guide: \`docs/USER_GUIDE.md\`
- API reference: \`docs/API.md\`
- Deployment: \`docs/DEPLOYMENT.md\`

## Support

- Issues: https://github.com/liadgez/TerrificMasterAgent/issues
- Discussions: https://github.com/liadgez/TerrificMasterAgent/discussions

---

**Built with ❤️ for automating the digital world**
`;

    fs.writeFileSync(path.join(this.tempDir, 'QUICK_START.md'), quickStart);

    console.log('   ✓ Installation files created');
  }

  async createPackages() {
    console.log('📦 Creating release packages...');

    const packageName = `omnitask-v${this.version}`;
    
    // Create ZIP package
    await this.createZipPackage(packageName);
    
    // Create TAR.GZ package
    await this.createTarPackage(packageName);
    
    // Create NPM package
    await this.createNpmPackage();
    
    console.log('   ✓ All packages created');
  }

  async createZipPackage(packageName) {
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(path.join(this.releaseDir, `${packageName}.zip`));
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', () => {
        console.log(`   ✓ ZIP package: ${packageName}.zip (${archive.pointer()} bytes)`);
        resolve();
      });

      archive.on('error', reject);
      archive.pipe(output);
      archive.directory(this.tempDir, packageName);
      archive.finalize();
    });
  }

  async createTarPackage(packageName) {
    try {
      const tarPath = path.join(this.releaseDir, `${packageName}.tar.gz`);
      
      execSync(`tar -czf "${tarPath}" -C "${path.dirname(this.tempDir)}" "${path.basename(this.tempDir)}"`, 
        { stdio: 'pipe' });
      
      // Rename to include package name
      const finalTarPath = path.join(this.releaseDir, `${packageName}.tar.gz`);
      if (tarPath !== finalTarPath) {
        fs.renameSync(tarPath, finalTarPath);
      }
      
      const stats = fs.statSync(finalTarPath);
      console.log(`   ✓ TAR.GZ package: ${packageName}.tar.gz (${stats.size} bytes)`);
      
    } catch (error) {
      console.log('   ⚠️  TAR.GZ package creation failed');
    }
  }

  async createNpmPackage() {
    try {
      // Create npm package in temp directory
      const originalDir = process.cwd();
      process.chdir(this.tempDir);
      
      execSync('npm pack', { stdio: 'pipe' });
      
      // Move package to releases directory
      const npmPackage = `omnitask-${this.version}.tgz`;
      fs.renameSync(npmPackage, path.join(this.releaseDir, npmPackage));
      
      process.chdir(originalDir);
      
      const stats = fs.statSync(path.join(this.releaseDir, npmPackage));
      console.log(`   ✓ NPM package: ${npmPackage} (${stats.size} bytes)`);
      
    } catch (error) {
      console.log('   ⚠️  NPM package creation failed');
    }
  }

  async generateChecksums() {
    console.log('🔐 Generating checksums...');

    const crypto = require('crypto');
    const files = fs.readdirSync(this.releaseDir)
      .filter(file => file.endsWith('.zip') || file.endsWith('.tar.gz') || file.endsWith('.tgz'));

    const checksums = [];

    for (const file of files) {
      const filePath = path.join(this.releaseDir, file);
      const content = fs.readFileSync(filePath);
      
      const sha256 = crypto.createHash('sha256').update(content).digest('hex');
      const md5 = crypto.createHash('md5').update(content).digest('hex');
      
      checksums.push(`SHA256: ${sha256}  ${file}`);
      checksums.push(`MD5:    ${md5}  ${file}`);
      checksums.push('');
    }

    fs.writeFileSync(
      path.join(this.releaseDir, 'CHECKSUMS.txt'),
      checksums.join('\n')
    );

    console.log('   ✓ Checksums generated');
  }

  async cleanup() {
    if (fs.existsSync(this.tempDir)) {
      fs.rmSync(this.tempDir, { recursive: true, force: true });
    }
  }

  showReleaseInfo() {
    console.log('\n📋 Release Information');
    console.log('═'.repeat(50));
    console.log(`Version: ${this.version}`);
    console.log(`Date: ${new Date().toISOString()}`);
    console.log(`Platform: macOS (darwin)`);
    console.log(`Node.js: ${process.version}`);
    
    console.log('\n📦 Package Files:');
    const files = fs.readdirSync(this.releaseDir);
    files.forEach(file => {
      const stats = fs.statSync(path.join(this.releaseDir, file));
      const size = (stats.size / 1024 / 1024).toFixed(2);
      console.log(`   • ${file} (${size} MB)`);
    });

    console.log('\n🚀 Distribution:');
    console.log('   • Extract package and run install.sh');
    console.log('   • Or use npm package for Node.js projects');
    console.log('   • Check CHECKSUMS.txt for integrity verification');
    
    console.log('\n📖 Documentation included:');
    console.log('   • QUICK_START.md - Installation and first steps');
    console.log('   • docs/USER_GUIDE.md - Complete user guide');
    console.log('   • docs/API.md - API reference');
    console.log('   • docs/DEPLOYMENT.md - Production deployment');
  }
}

// Add archiver as dependency if not present
function ensureArchiver() {
  try {
    require('archiver');
  } catch (error) {
    console.log('Installing archiver dependency...');
    execSync('npm install archiver --save-dev', { stdio: 'inherit' });
  }
}

// Run packaging if called directly
if (require.main === module) {
  ensureArchiver();
  const packager = new ReleasePackager();
  packager.createRelease().catch(console.error);
}

module.exports = ReleasePackager;