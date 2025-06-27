# OmniTask - AI Personal Assistant

OmniTask is a local-first AI agent that executes natural-language commands across both web and macOS environments. It combines browser automation (Playwright) with desktop automation (AppleScript/Swift APIs), secure credential storage, and a Next.js command dashboard.

## ✨ Features

- **🗣️ Natural Language Commands**: Execute tasks using plain English
- **🌐 Web Automation**: Online shopping, form filling, data extraction, social media tasks
- **🖥️ macOS Automation**: File operations, app control, system tasks, notifications
- **🔒 Secure**: Local credential storage with encryption and sandboxed execution
- **🎨 Modern UI**: Responsive Next.js interface with dark mode support
- **⚡ High Performance**: Caching, memory management, and resource pooling
- **📊 Real-time Monitoring**: Performance metrics and comprehensive logging

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- macOS (for desktop automation features)
- Git

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/liadgez/TerrificMasterAgent.git
   cd omnitask
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Install Playwright browsers:**
   ```bash
   npx playwright install
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. **Open the application:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📖 Usage Examples

### Web Commands
```
"Search for laptops on Amazon under $1000"
"Fill out the contact form on example.com"
"Search Google for latest TypeScript updates"
"Find deals on iPad Pro"
```

### Desktop Commands
```
"Open Spotify and play my workout playlist"
"Create a new folder on Desktop called Projects"
"Set volume to 50%"
"Show me a notification in 5 minutes"
"Lock my computer"
```

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Next.js UI   │────│  Command Parser  │────│  Task Queue     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │                        │
                       ┌────────┴────────┐              │
                       │                 │              │
                ┌─────────────┐   ┌─────────────┐       │
                │ Web Engine  │   │Desktop Engine│      │
                │(Playwright) │   │(AppleScript)│      │
                └─────────────┘   └─────────────┘      │
                       │                 │              │
                ┌─────────────┐   ┌─────────────┐       │
                │   Browser   │   │   macOS     │      │
                │ Automation  │   │ Automation  │      │
                └─────────────┘   └─────────────┘      │
                                                       │
                ┌─────────────────────────────────────────┘
                │
        ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
        │ Performance  │    │   Security   │    │   Logging    │
        │ Monitoring   │    │ Validation   │    │   & Audit    │
        └──────────────┘    └──────────────┘    └──────────────┘
```

## 🛠️ Technology Stack

- **Frontend**: Next.js 15 with TypeScript, Tailwind CSS
- **Backend**: Node.js API Routes
- **Web Automation**: Playwright (Chromium, Firefox, WebKit)
- **Desktop Automation**: AppleScript + Swift APIs
- **Testing**: Jest with comprehensive test coverage
- **Performance**: LRU caching, memory management, resource pooling
- **Security**: Input validation, sandboxed execution, audit logging

## 📁 Project Structure

```
omnitask/
├── src/
│   ├── app/                          # Next.js app directory
│   │   ├── api/                      # API endpoints
│   │   │   ├── commands/             # Command execution
│   │   │   ├── performance/          # Performance monitoring
│   │   │   └── security/             # Security endpoints
│   │   ├── components/               # React components
│   │   └── globals.css              # Global styles
│   ├── lib/                         # Core libraries
│   │   ├── performance/             # Performance optimization
│   │   │   ├── commandCache.ts      # Command parsing cache
│   │   │   ├── memoryManager.ts     # Memory management
│   │   │   ├── browserPool.ts       # Browser resource pooling
│   │   │   └── performanceMonitor.ts # Real-time monitoring
│   │   ├── security/                # Security utilities
│   │   ├── engines/                 # Automation engines
│   │   │   ├── web/                 # Web automation
│   │   │   └── desktop/             # Desktop automation
│   │   ├── commandParser.ts         # Natural language parsing
│   │   ├── taskQueue.ts             # Task execution queue
│   │   └── validation.ts            # Input validation
│   └── types/                       # TypeScript definitions
├── __tests__/                       # Test suites
├── scripts/                         # AppleScript files
└── docs/                           # Documentation
```

## 🔧 API Reference

### Execute Command
```typescript
POST /api/commands/execute
{
  "command": "search for laptops under $1000",
  "options": {
    "dryRun": false,
    "priority": "normal"
  }
}
```

### Performance Monitoring
```typescript
GET /api/performance?action=report
GET /api/performance?action=metrics  
GET /api/performance?action=alerts&level=warning
```

### Security Status
```typescript
GET /api/security/status
GET /api/security/audit-log
```

## 🧪 Testing

Run the comprehensive test suite:

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test categories
npm run test:unit        # Unit tests
npm run test:integration # Integration tests
npm run test:security    # Security tests
npm run test:performance # Performance benchmarks
```

## 🔒 Security Features

- **Input Validation**: All commands validated and sanitized
- **Sandboxed Execution**: Safe execution environment for all tasks
- **Audit Logging**: Comprehensive logging of all operations
- **Rate Limiting**: Protection against abuse
- **Path Traversal Protection**: File system access controls
- **XSS Prevention**: Output sanitization for web content

## 📊 Performance Optimizations

- **Command Caching**: LRU cache with 70%+ hit rate potential
- **Memory Management**: Automatic cleanup and monitoring
- **Browser Pooling**: Efficient resource lifecycle management
- **Real-time Monitoring**: Performance metrics and alerting
- **Async Processing**: Non-blocking task execution

## 🚨 Troubleshooting

### Common Issues

**Commands not executing:**
- Check browser installation: `npx playwright install`
- Verify macOS permissions for automation
- Check console for error messages

**Performance issues:**
- Monitor memory usage: `GET /api/performance?action=metrics`
- Check cache hit rate: `GET /api/performance?action=cache-stats`
- Review performance alerts: `GET /api/performance?action=alerts`

**Security warnings:**
- Review audit log: `GET /api/security/audit-log`
- Check input validation settings
- Verify command patterns aren't triggering false positives

### Debug Mode

Enable detailed logging:
```bash
DEBUG=omnitask:* npm run dev
```

### Memory Management

If experiencing memory issues:
```bash
# Force memory cleanup
curl -X POST http://localhost:3000/api/performance \
  -H "Content-Type: application/json" \
  -d '{"action": "force-cleanup"}'
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Run tests: `npm test`
4. Commit changes: `git commit -m 'Add new feature'`
5. Push to branch: `git push origin feature/new-feature`
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Playwright team for excellent browser automation
- Next.js team for the amazing framework
- macOS automation community for AppleScript resources

---

**Built with ❤️ for automating the digital world**
