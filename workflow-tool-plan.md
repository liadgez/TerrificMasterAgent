# Self-Improving Workflow Tool - Project Plan

## Project Overview
Building a local agent-based development tool that automatically refines workflows through iterative testing. The system uses two AI agents to continuously improve workflow documentation until it reaches an executable, "perfect" state.

## Core Concept
- **Input**: Incomplete/flawed workflow file (`realworkflow1.presentTested`)
- **Process**: Tester Agent attempts execution → Manager Agent refines workflow → Repeat
- **Output**: Refined, executable workflow that runs without errors

## Two-Agent Architecture

### Tester Agent
- **Role**: Execution and validation
- **Responsibilities**:
  - Parse workflow steps from file
  - Attempt to execute each step
  - Identify failure points and error types
  - Generate detailed feedback reports
  - Validate workflow completeness

### Manager Agent  
- **Role**: Analysis and improvement
- **Responsibilities**:
  - Analyze tester feedback
  - Identify root causes of failures
  - Rewrite/refine workflow steps
  - Update the workflow file
  - Decide when workflow is "complete"

## Technology Stack
- **Language**: Node.js with TypeScript
- **CLI Framework**: Commander.js or Yargs
- **AI Integration**: OpenAI API or local LLM
- **File Handling**: Native fs operations
- **Execution**: Child processes for shell commands
- **Logging**: Winston for detailed audit trails

## Workflow File Format

### Structure
```yaml
# realworkflow1.presentTested
workflow:
  name: "Example Workflow"
  version: 1
  description: "Brief description"
  
steps:
  - id: "step_1"
    name: "Install dependencies"
    command: "npm install"
    type: "shell"
    expected_output: "success"
    
  - id: "step_2"
    name: "Run tests"
    command: "npm test"
    type: "shell"
    depends_on: ["step_1"]
    
metadata:
  iterations: 0
  last_updated: "2025-06-27"
  success_rate: 0.0
  status: "in_progress"  # "in_progress", "verified"
  verification:
    verified: false
    verified_at: null
    signature: null
```

## Implementation Plan - Todo Items

### Phase 1: Core Infrastructure
- [ ] Set up Node.js project with TypeScript
- [ ] Create CLI interface and command structure
- [ ] Implement workflow file parser (YAML/JSON)
- [ ] Build basic execution engine for shell commands
- [ ] Add logging and error handling framework

### Phase 2: Tester Agent
- [ ] Create Tester Agent class with execution logic
- [ ] Implement step-by-step workflow execution
- [ ] Add failure detection and categorization
- [ ] Build feedback report generation
- [ ] Add validation for workflow completeness

### Phase 3: Manager Agent
- [ ] Create Manager Agent class with analysis logic
- [ ] Implement feedback parsing and root cause analysis
- [ ] Add workflow refinement algorithms
- [ ] Build workflow file updating mechanism
- [ ] Add completion criteria evaluation

### Phase 4: Integration & Iteration Loop
- [ ] Connect Tester and Manager agents
- [ ] Implement the main iteration loop
- [ ] Add convergence detection (when to stop)
- [ ] Build progress tracking and reporting
- [ ] Add safety limits (max iterations, timeouts)
- [ ] Implement verification system with final validation run
- [ ] Add "VERIFIED" signature generation for perfect workflows

### Phase 5: Enhancement & Polish
- [ ] Add support for different workflow types
- [ ] Implement workflow templates and patterns
- [ ] Add detailed logging and analytics
- [ ] Create workflow visualization tools
- [ ] Build comprehensive test suite

### Phase 6: CLI & User Experience
- [ ] Create intuitive CLI commands
- [ ] Add interactive mode for workflow editing
- [ ] Implement watch mode for continuous improvement
- [ ] Add configuration file support
- [ ] Build help system and documentation

## Project Structure
```
workflow-tool/
├── src/
│   ├── agents/
│   │   ├── tester.ts          # Tester Agent
│   │   └── manager.ts         # Manager Agent
│   ├── core/
│   │   ├── workflow-parser.ts # YAML/JSON parsing
│   │   ├── executor.ts        # Command execution
│   │   └── iteration-loop.ts  # Main improvement loop
│   ├── types/
│   │   └── workflow.ts        # TypeScript definitions
│   ├── utils/
│   │   ├── logger.ts          # Logging utilities
│   │   └── file-utils.ts      # File operations
│   └── cli/
│       └── commands.ts        # CLI interface
├── templates/                 # Workflow templates
├── examples/                  # Example workflows
└── tests/                     # Test suite
```

## CLI Commands Design
```bash
# Start improvement cycle
workflow-tool improve <workflow-file>

# Watch mode (continuous improvement)
workflow-tool watch <workflow-file>

# Validate workflow
workflow-tool validate <workflow-file>

# Create new workflow from template
workflow-tool create <name> --template <type>

# Show improvement history
workflow-tool history <workflow-file>
```

## Success Criteria
- Successfully parse and execute workflow files
- Automatically identify and fix common workflow issues
- Reduce manual intervention in workflow refinement
- Achieve convergence on executable workflows
- Provide clear feedback and improvement history
- Handle edge cases and failures gracefully

## Key Features
- **Iterative Improvement**: Automatic refinement through test-fix cycles
- **Intelligent Analysis**: AI-powered root cause analysis
- **Safety Limits**: Prevent infinite loops and resource exhaustion
- **Detailed Logging**: Complete audit trail of all changes
- **Template System**: Pre-built workflow patterns
- **Watch Mode**: Continuous monitoring and improvement
- **Verification Signature**: Automatic "VERIFIED" signature after perfect execution

## Verification System

### Final Verification Process
1. **Convergence Detection**: Manager determines workflow is stable
2. **Final Validation Run**: One complete execution without errors  
3. **Signature Generation**: Add "VERIFIED" signature with timestamp
4. **Status Update**: Mark workflow as verified in metadata

### Verification Signature Format
```yaml
# Added to workflow metadata after successful verification
verification:
  verified: true
  verified_at: "2025-06-27T14:30:00Z"
  signature: "VERIFIED"
  total_iterations: 5
  final_success_rate: 1.0
```

### CLI Verification Commands
```bash
# Force verification check
workflow-tool verify <workflow-file>

# Show verification status
workflow-tool status <workflow-file>
```

## Next Steps
1. Validate this plan and get approval
2. Set up the basic project structure
3. Implement the workflow parser
4. Build the Tester Agent
5. Create the Manager Agent  
6. Connect everything in the iteration loop
7. Add verification system with "VERIFIED" signature

---
*Created: 2025-06-27*
*Status: Planning Phase*