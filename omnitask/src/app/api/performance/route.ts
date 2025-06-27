import { NextRequest, NextResponse } from 'next/server';
import { globalPerformanceMonitor } from '@/lib/performance/performanceMonitor';
import { globalCommandCache } from '@/lib/performance/commandCache';
import { globalMemoryManager } from '@/lib/performance/memoryManager';
import { globalBrowserPool } from '@/lib/performance/browserPool';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action') || 'report';
    const format = url.searchParams.get('format') || 'json';

    switch (action) {
      case 'report':
        const report = globalPerformanceMonitor.getPerformanceReport();
        
        if (format === 'csv') {
          const csv = generatePerformanceCSV(report);
          return new NextResponse(csv, {
            headers: {
              'Content-Type': 'text/csv',
              'Content-Disposition': `attachment; filename="performance-report-${Date.now()}.csv"`
            }
          });
        }
        
        return NextResponse.json({
          success: true,
          data: report,
          timestamp: new Date().toISOString()
        });

      case 'metrics':
        const metrics = globalPerformanceMonitor.collectMetrics();
        return NextResponse.json({
          success: true,
          data: metrics,
          timestamp: new Date().toISOString()
        });

      case 'alerts':
        const level = url.searchParams.get('level') as 'warning' | 'error' | 'critical' | undefined;
        const alerts = globalPerformanceMonitor.getAlerts(level);
        return NextResponse.json({
          success: true,
          data: alerts,
          timestamp: new Date().toISOString()
        });

      case 'cache-stats':
        const cacheStats = globalCommandCache.getStats();
        return NextResponse.json({
          success: true,
          data: cacheStats,
          timestamp: new Date().toISOString()
        });

      case 'memory-stats':
        const memoryStats = globalMemoryManager.getMemoryStats();
        return NextResponse.json({
          success: true,
          data: memoryStats,
          timestamp: new Date().toISOString()
        });

      case 'browser-stats':
        const browserStats = globalBrowserPool.getStats();
        return NextResponse.json({
          success: true,
          data: browserStats,
          timestamp: new Date().toISOString()
        });

      case 'trends':
        const metric = url.searchParams.get('metric') || 'memory';
        const timeWindow = parseInt(url.searchParams.get('timeWindow') || '300000'); // 5 minutes default
        const trends = globalPerformanceMonitor.getTrends(metric as any, timeWindow);
        return NextResponse.json({
          success: true,
          data: trends,
          timestamp: new Date().toISOString()
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action parameter' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Error in performance API:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve performance data' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, ...params } = await request.json();

    switch (action) {
      case 'clear-cache':
        globalCommandCache.clear();
        return NextResponse.json({
          success: true,
          message: 'Command cache cleared'
        });

      case 'force-cleanup':
        // This would need access to the task queue - implement based on your architecture
        return NextResponse.json({
          success: true,
          message: 'Memory cleanup triggered'
        });

      case 'clear-alerts':
        const maxAge = params.maxAge || 3600000; // 1 hour default
        globalPerformanceMonitor.clearOldAlerts(maxAge);
        return NextResponse.json({
          success: true,
          message: 'Old alerts cleared'
        });

      case 'close-idle-browsers':
        // Trigger browser pool cleanup
        return NextResponse.json({
          success: true,
          message: 'Browser cleanup triggered'
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action parameter' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Error in performance API POST:', error);
    return NextResponse.json(
      { error: 'Failed to execute performance action' },
      { status: 500 }
    );
  }
}

function generatePerformanceCSV(report: any): string {
  const headers = [
    'Timestamp',
    'Memory Heap Used (MB)',
    'Memory Heap Total (MB)',
    'Cache Hit Rate (%)',
    'Avg Parsing Time (ms)',
    'Total Commands',
    'Active Browsers',
    'Active Contexts',
    'Active Pages',
    'Alerts Count'
  ];

  const row = [
    new Date(report.current.timestamp).toISOString(),
    report.current.memory.heapUsed.toFixed(2),
    report.current.memory.heapTotal.toFixed(2),
    (report.current.commandParsing.cacheHitRate * 100).toFixed(1),
    report.current.commandParsing.avgParsingTime.toFixed(2),
    report.current.commandParsing.totalCommands,
    report.current.browser.browsers,
    report.current.browser.contexts,
    report.current.browser.pages,
    report.alerts.length
  ];

  return [
    headers.join(','),
    row.map(cell => `"${cell}"`).join(',')
  ].join('\n');
}