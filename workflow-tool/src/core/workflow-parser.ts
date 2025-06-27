import * as fs from 'fs/promises';
import * as YAML from 'yaml';
import { Workflow, WorkflowStep, WorkflowMetadata } from '../types/workflow';
import { logger } from '../utils/logger';

export class WorkflowParser {
  async parse(filePath: string): Promise<Workflow> {
    try {
      logger.info(`Parsing workflow file: ${filePath}`);
      
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const parsed = YAML.parse(fileContent);
      
      // Validate structure
      this.validateWorkflowStructure(parsed);
      
      const workflow: Workflow = {
        name: parsed.workflow.name,
        version: parsed.workflow.version || 1,
        description: parsed.workflow.description || '',
        steps: this.parseSteps(parsed.steps),
        metadata: this.parseMetadata(parsed.metadata)
      };
      
      logger.info(`Successfully parsed workflow: ${workflow.name} with ${workflow.steps.length} steps`);
      return workflow;
      
    } catch (error) {
      logger.error(`Failed to parse workflow file: ${filePath}`, error);
      throw new Error(`Failed to parse workflow: ${error}`);
    }
  }
  
  async save(workflow: Workflow, filePath: string): Promise<void> {
    try {
      logger.info(`Saving workflow to: ${filePath}`);
      
      const yamlContent = YAML.stringify({
        workflow: {
          name: workflow.name,
          version: workflow.version,
          description: workflow.description
        },
        steps: workflow.steps,
        metadata: workflow.metadata
      }, {
        indent: 2,
        lineWidth: 0
      });
      
      await fs.writeFile(filePath, yamlContent, 'utf-8');
      logger.info(`Successfully saved workflow: ${workflow.name}`);
      
    } catch (error) {
      logger.error(`Failed to save workflow to: ${filePath}`, error);
      throw new Error(`Failed to save workflow: ${error}`);
    }
  }
  
  private validateWorkflowStructure(parsed: any): void {
    if (!parsed.workflow) {
      throw new Error('Missing workflow section');
    }
    
    if (!parsed.workflow.name) {
      throw new Error('Missing workflow name');
    }
    
    if (!parsed.steps || !Array.isArray(parsed.steps)) {
      throw new Error('Missing or invalid steps array');
    }
    
    if (parsed.steps.length === 0) {
      throw new Error('Workflow must have at least one step');
    }
    
    // Validate each step
    parsed.steps.forEach((step: any, index: number) => {
      if (!step.id) {
        throw new Error(`Step ${index + 1} missing id`);
      }
      
      if (!step.name) {
        throw new Error(`Step ${index + 1} missing name`);
      }
      
      if (!step.command) {
        throw new Error(`Step ${index + 1} missing command`);
      }
      
      if (!step.type) {
        step.type = 'shell'; // Default to shell
      }
    });
  }
  
  private parseSteps(steps: any[]): WorkflowStep[] {
    return steps.map((step: any) => ({
      id: step.id,
      name: step.name,
      command: step.command,
      type: step.type || 'shell',
      expected_output: step.expected_output,
      depends_on: step.depends_on || [],
      timeout: step.timeout || 30000, // 30 seconds default
      retry_count: step.retry_count || 0,
      continue_on_error: step.continue_on_error || false
    }));
  }
  
  private parseMetadata(metadata: any): WorkflowMetadata {
    const defaultMetadata: WorkflowMetadata = {
      iterations: 0,
      last_updated: new Date().toISOString(),
      success_rate: 0.0,
      status: 'in_progress',
      verification: {
        verified: false,
        verified_at: null,
        signature: null
      }
    };
    
    if (!metadata) {
      return defaultMetadata;
    }
    
    return {
      iterations: metadata.iterations || 0,
      last_updated: metadata.last_updated || new Date().toISOString(),
      success_rate: metadata.success_rate || 0.0,
      status: metadata.status || 'in_progress',
      verification: metadata.verification || defaultMetadata.verification
    };
  }
}