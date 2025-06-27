import { NextRequest, NextResponse } from 'next/server';
import { AuditLogger } from '@/lib/auditLogger';

export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const url = new URL(request.url);
    const hours = parseInt(url.searchParams.get('hours') || '24');
    const format = url.searchParams.get('format') || 'json';

    // Get security metrics
    const metrics = AuditLogger.getSecurityMetrics(hours);
    
    // Get detailed logs if requested
    const includeDetails = url.searchParams.get('details') === 'true';
    let detailedLogs;
    
    if (includeDetails) {
      const startDate = new Date(Date.now() - (hours * 60 * 60 * 1000));
      detailedLogs = {
        security_violations: AuditLogger.getAuditLogs(startDate, undefined, undefined, 'critical'),
        failed_commands: AuditLogger.getAuditLogs(startDate, undefined, 'COMMAND').filter(log => !log.success),
        high_risk_operations: AuditLogger.getAuditLogs(startDate).filter(log => 
          log.risk_level === 'high' || log.risk_level === 'critical'
        )
      };
    }

    const response = {
      success: true,
      timeframe: `${hours} hours`,
      metrics,
      ...(detailedLogs && { details: detailedLogs }),
      timestamp: new Date().toISOString()
    };

    // Return as CSV if requested
    if (format === 'csv') {
      const csvContent = generateCSV(metrics);
      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="security-metrics-${Date.now()}.csv"`
        }
      });
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error getting security metrics:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve security metrics' },
      { status: 500 }
    );
  }
}

function generateCSV(metrics: any): string {
  const headers = [
    'Metric',
    'Value',
    'Timestamp'
  ];

  const rows = [
    ['Total Events', metrics.total_events, new Date().toISOString()],
    ['Security Violations', metrics.security_violations, new Date().toISOString()],
    ['Failed Commands', metrics.failed_commands, new Date().toISOString()],
    ['High Risk Operations', metrics.high_risk_operations, new Date().toISOString()],
    ...metrics.top_risk_ips.map((item: any) => [`Risk IP: ${item.ip}`, item.count, new Date().toISOString()]),
    ...metrics.top_violations.map((item: any) => [`Violation: ${item.violation}`, item.count, new Date().toISOString()])
  ];

  return [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');
}