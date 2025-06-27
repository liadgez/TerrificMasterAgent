import { ParsedCommand } from './commandParser';

export interface TaskClassification {
  type: 'web' | 'desktop' | 'unknown';
  category: string;
  priority: 'low' | 'medium' | 'high';
  estimatedDuration: number; // in seconds
  requiresUserConfirmation: boolean;
  riskLevel: 'safe' | 'moderate' | 'high';
}

export function classifyTask(parsedCommand: ParsedCommand): TaskClassification {
  const { type, category, confidence } = parsedCommand;
  
  // Determine priority based on category and confidence
  const priority = determinePriority(category, confidence);
  
  // Estimate duration based on task type
  const estimatedDuration = estimateTaskDuration(type, category);
  
  // Check if user confirmation is required
  const requiresUserConfirmation = requiresConfirmation(category, parsedCommand.parameters);
  
  // Assess risk level
  const riskLevel = assessRiskLevel(category, parsedCommand.parameters);
  
  return {
    type,
    category,
    priority,
    estimatedDuration,
    requiresUserConfirmation,
    riskLevel
  };
}

function determinePriority(category: string, confidence: number): 'low' | 'medium' | 'high' {
  // High confidence commands get higher priority
  if (confidence > 0.8) {
    return 'high';
  }
  
  // Certain categories are inherently high priority
  const highPriorityCategories = ['system', 'files'];
  if (highPriorityCategories.includes(category)) {
    return 'high';
  }
  
  // Medium priority for most automation tasks
  const mediumPriorityCategories = ['shopping', 'apps', 'browsing'];
  if (mediumPriorityCategories.includes(category)) {
    return 'medium';
  }
  
  return 'low';
}

function estimateTaskDuration(type: string, category: string): number {
  const durations: Record<string, Record<string, number>> = {
    web: {
      shopping: 30,      // 30 seconds for simple searches
      browsing: 10,      // 10 seconds to open pages
      forms: 45,         // 45 seconds for form filling
      social: 15,        // 15 seconds for posts
      default: 20
    },
    desktop: {
      apps: 5,           // 5 seconds to launch apps
      files: 10,         // 10 seconds for file operations
      system: 3,         // 3 seconds for system commands
      default: 8
    }
  };
  
  return durations[type]?.[category] || durations[type]?.default || 15;
}

function requiresConfirmation(category: string, parameters: Record<string, unknown>): boolean {
  // Always require confirmation for potentially destructive actions
  const destructiveCategories = ['files', 'system'];
  if (destructiveCategories.includes(category)) {
    return true;
  }
  
  // Require confirmation for purchases
  if (category === 'shopping' && typeof parameters.maxPrice === 'number' && parameters.maxPrice > 100) {
    return true;
  }
  
  // Require confirmation for social media posts
  if (category === 'social') {
    return true;
  }
  
  return false;
}

function assessRiskLevel(category: string, parameters: Record<string, unknown>): 'safe' | 'moderate' | 'high' {
  // High risk categories
  const highRiskCategories = ['system', 'files'];
  if (highRiskCategories.includes(category)) {
    return 'high';
  }
  
  // Moderate risk for shopping with high values
  if (category === 'shopping' && typeof parameters.maxPrice === 'number' && parameters.maxPrice > 500) {
    return 'moderate';
  }
  
  // Moderate risk for social media
  if (category === 'social') {
    return 'moderate';
  }
  
  // Most web browsing and app launching is safe
  return 'safe';
}

export function canExecuteAutomatically(classification: TaskClassification): boolean {
  return (
    !classification.requiresUserConfirmation &&
    classification.riskLevel === 'safe' &&
    classification.priority !== 'high'
  );
}