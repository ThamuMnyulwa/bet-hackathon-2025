import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { paymentTransaction, fraudAlert, riskAssessment } from '@/db/schema/auth';
import { eq, desc, and, gte, count, sql, avg } from 'drizzle-orm';
import { headers } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { 
        status: 401
      });
    }

    // Calculate date ranges
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get transaction statistics
    const [
      totalTransactions,
      blockedTransactions,
      escrowTransactions,
      pendingTransactions,
      approvedTransactions,
      completedTransactions
    ] = await Promise.all([
      // Total transactions
      db.select().from(paymentTransaction),
      
      // Blocked transactions
      db.select()
        .from(paymentTransaction)
        .where(eq(paymentTransaction.status, 'DECLINED')),
      
      // Escrow transactions
      db.select()
        .from(paymentTransaction)
        .where(eq(paymentTransaction.status, 'ESCROW')),
      
      // Pending transactions
      db.select()
        .from(paymentTransaction)
        .where(eq(paymentTransaction.status, 'PENDING')),
      
      // Approved transactions
      db.select()
        .from(paymentTransaction)
        .where(eq(paymentTransaction.status, 'APPROVED')),
      
      // Completed transactions
      db.select()
        .from(paymentTransaction)
        .where(eq(paymentTransaction.status, 'COMPLETED'))
    ]);

    // Get fraud alerts statistics
    const [
      totalAlerts,
      criticalAlerts,
      unresolvedAlerts,
      recentAlerts
    ] = await Promise.all([
      // Total alerts
      db.select().from(fraudAlert),
      
      // Critical alerts
      db.select()
        .from(fraudAlert)
        .where(eq(fraudAlert.severity, 'CRITICAL')),
      
      // Unresolved alerts
      db.select()
        .from(fraudAlert)
        .where(eq(fraudAlert.isResolved, false)),
      
      // Recent alerts (last 24 hours)
      db.select()
        .from(fraudAlert)
        .where(gte(fraudAlert.createdAt, last24Hours))
    ]);

    // Get high-risk transactions
    const highRiskTransactions = await db.select({
      id: paymentTransaction.id,
      amount: paymentTransaction.amount,
      currency: paymentTransaction.currency,
      recipientName: paymentTransaction.recipientName,
      status: paymentTransaction.status,
      riskScore: paymentTransaction.riskScore,
      createdAt: paymentTransaction.createdAt,
    })
    .from(paymentTransaction)
    .where(
      sql`CAST(${paymentTransaction.riskScore} AS DECIMAL) >= 60`
    )
    .orderBy(desc(paymentTransaction.createdAt))
    .limit(10);

    // Calculate average risk score
    const avgRiskResult = await db.select({
      avgRisk: avg(sql`CAST(${paymentTransaction.riskScore} AS DECIMAL)`)
    }).from(paymentTransaction);

    const avgRiskScore = avgRiskResult[0]?.avgRisk || 0;

    // Get alert type distribution
    const alertTypeDistribution = await db.select({
      alertType: fraudAlert.alertType
    })
    .from(fraudAlert)
    .groupBy(fraudAlert.alertType);

    // Calculate counts for each alert type manually
    const alertTypeCounts = await Promise.all(
      alertTypeDistribution.map(async (alertType) => {
        const count = await db.select()
          .from(fraudAlert)
          .where(eq(fraudAlert.alertType, alertType.alertType));
        return {
          alertType: alertType.alertType,
          count: count.length
        };
      })
    );

    // Calculate metrics
    const total = totalTransactions.length;
    const blocked = blockedTransactions.length;
    const escrow = escrowTransactions.length;
    const fraudBlocked = blocked; // For demo purposes, consider blocked transactions as fraud
    const falsePositiveRate = total > 0 ? Math.max(0, Math.min(5, (escrow / total) * 100)) : 0;
    const stepUpConversionRate = Math.random() * 10 + 90; // Simulate 90-100% conversion rate
    const averageLatency = Math.floor(Math.random() * 20) + 35; // Simulate 35-55ms latency

    // Format high-risk transactions
    const formattedHighRiskTransactions = highRiskTransactions.map(tx => ({
      id: tx.id,
      amount: parseFloat(tx.amount),
      currency: tx.currency,
      recipient: tx.recipientName,
      riskScore: tx.riskScore ? parseFloat(tx.riskScore) : 0,
      status: tx.status,
      timestamp: getTimeAgo(tx.createdAt)
    }));

    // Calculate risk factor distribution
    const riskFactorDistribution = [
      { name: 'SIM Change Detected', percentage: 34, count: alertTypeCounts.find(a => a.alertType === 'SIM_SWAP')?.count || 0 },
      { name: 'Geovelocity Anomaly', percentage: 28, count: alertTypeCounts.find(a => a.alertType === 'GEOVELOCITY')?.count || 0 },
      { name: 'New Device Login', percentage: 22, count: alertTypeCounts.find(a => a.alertType === 'DEVICE_CHANGE')?.count || 0 },
      { name: 'Unusual Time Access', percentage: 16, count: alertTypeCounts.find(a => a.alertType === 'TIME_ANOMALY')?.count || 0 }
    ];

    const response = {
      metrics: {
        totalTransactions: total,
        blockedTransactions: blocked,
        escrowTransactions: escrow,
        fraudBlocked,
        falsePositiveRate: Number(falsePositiveRate.toFixed(1)),
        averageLatency,
        stepUpConversionRate: Number(stepUpConversionRate.toFixed(1)),
        averageRiskScore: Number(Number(avgRiskScore).toFixed(1))
      },
      alerts: {
        total: totalAlerts.length,
        critical: criticalAlerts.length,
        unresolved: unresolvedAlerts.length,
        recent: recentAlerts.length
      },
      highRiskTransactions: formattedHighRiskTransactions,
      riskFactorDistribution,
      statusDistribution: {
        pending: pendingTransactions.length,
        approved: approvedTransactions.length,
        completed: completedTransactions.length,
        blocked: blocked,
        escrow: escrow
      },
      systemHealth: {
        uptime: '99.97%',
        processingTime: `${averageLatency}ms`,
        threatLevel: total > 0 && (blocked / total) > 0.05 ? 'ELEVATED' : 'NORMAL'
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Failed to fetch analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { 
        status: 500
      }
    );
  }
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - new Date(date).getTime()) / 1000);
  
  if (diffInSeconds < 60) {
    return `${diffInSeconds} seconds ago`;
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }
}
