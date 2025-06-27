import { NextRequest, NextResponse } from 'next/server';
import { parseCommand } from '@/lib/commandParser';
import { classifyTask } from '@/lib/taskClassifier';
import { validateCommand } from '@/lib/commandValidator';
import { globalTaskQueue } from '@/lib/taskQueue';
import { AuditLogger } from '@/lib/auditLogger';

export async function POST(request: NextRequest) {
  const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';
  
  try {
    const { command } = await request.json();

    if (!command || typeof command !== 'string') {
      AuditLogger.logSecurityViolation(
        'Invalid command format',
        { command, type: typeof command },
        undefined,
        ip,
        userAgent
      );
      
      return NextResponse.json(
        { error: 'Command is required and must be a string' },
        { status: 400 }
      );
    }

    // Parse the natural language command
    const parsedCommand = parseCommand(command);
    
    // Validate and sanitize the command
    const validation = validateCommand(command, parsedCommand);
    
    if (!validation.isValid) {
      // Log security violation for failed validation
      AuditLogger.logSecurityViolation(
        'Command validation failed',
        { 
          command,
          errors: validation.errors,
          warnings: validation.warnings,
          parsedCommand
        },
        undefined,
        ip,
        userAgent
      );
      
      return NextResponse.json(
        { 
          error: 'Command validation failed',
          details: validation.errors,
          warnings: validation.warnings
        },
        { status: 400 }
      );
    }

    // Classify the task for execution planning
    const classification = classifyTask(validation.sanitizedCommand!);
    
    // Log successful command processing
    AuditLogger.logCommandExecution(
      command,
      true,
      classification.riskLevel,
      undefined, // TODO: Add user from session
      ip,
      {
        parsedCommand,
        classification,
        warnings: validation.warnings
      }
    );
    
    // Add to task queue
    const taskId = globalTaskQueue.addTask(validation.sanitizedCommand!, classification);
    
    return NextResponse.json({
      success: true,
      taskId,
      command: validation.sanitizedCommand,
      classification,
      validation: {
        warnings: validation.warnings
      },
      status: 'Command processed and queued for execution',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    // Log system error
    AuditLogger.logSecurityViolation(
      'API execution error',
      { error: error instanceof Error ? error.message : 'Unknown error' },
      undefined,
      ip,
      userAgent
    );
    
    console.error('Error processing command:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const queueStatus = globalTaskQueue.getQueueStatus();
    const recentTasks = globalTaskQueue.getAllTasks().slice(0, 10);
    
    return NextResponse.json({
      success: true,
      queueStatus,
      recentTasks,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting queue status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}