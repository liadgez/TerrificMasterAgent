import { NextRequest, NextResponse } from 'next/server';
import { globalTaskQueue } from '@/lib/taskQueue';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;
    
    if (!taskId) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 }
      );
    }

    const task = globalTaskQueue.getTask(taskId);
    
    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      task,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error getting task:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;
    
    if (!taskId) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 }
      );
    }

    const cancelled = globalTaskQueue.cancelTask(taskId);
    
    if (!cancelled) {
      return NextResponse.json(
        { error: 'Task could not be cancelled (not found or already executing)' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Task cancelled successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error cancelling task:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}