import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { 
  paymentTransaction, 
  fraudAlert, 
  riskAssessment, 
  deviceFingerprint,
  user 
} from '@/db/schema/auth';
import { eq, desc, and, gte, count, sql, avg, max } from 'drizzle-orm';
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

    const userId = session.user.id;
    console.log('Dashboard request for userId:', userId);

    // Calculate date ranges
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get transaction counts and other data
    const [
      totalTransactions,
      pendingTransactions,
      approvedTransactions,
      completedTransactions,
      declinedTransactions,
      escrowTransactions,
      totalAlerts,
      criticalAlerts,
      unresolvedAlerts,
      recentAlerts,
      avgRiskScore,
      highRiskTransactions,
      // Device information
      activeDevices,
      recentRiskAssessments
    ] = await Promise.all([
      // Total transactions
      db.select()
        .from(paymentTransaction)
        .where(eq(paymentTransaction.userId, userId)),
      
      // Pending transactions
      db.select()
        .from(paymentTransaction)
        .where(and(
          eq(paymentTransaction.userId, userId),
          eq(paymentTransaction.status, 'PENDING')
        )),
      
      // Approved transactions
      db.select()
        .from(paymentTransaction)
        .where(and(
          eq(paymentTransaction.userId, userId),
          eq(paymentTransaction.status, 'APPROVED')
        )),
      
      // Completed transactions
      db.select()
        .from(paymentTransaction)
        .where(and(
          eq(paymentTransaction.userId, userId),
          eq(paymentTransaction.status, 'COMPLETED')
        )),
      
      // Declined transactions
      db.select()
        .from(paymentTransaction)
        .where(and(
          eq(paymentTransaction.userId, userId),
          eq(paymentTransaction.status, 'DECLINED')
        )),
      
      // Escrow transactions
      db.select()
        .from(paymentTransaction)
        .where(and(
          eq(paymentTransaction.userId, userId),
          eq(paymentTransaction.status, 'ESCROW')
        )),
      
      // Total alerts
      db.select()
        .from(fraudAlert)
        .where(eq(fraudAlert.userId, userId)),
      
      // Critical alerts
      db.select()
        .from(fraudAlert)
        .where(and(
          eq(fraudAlert.userId, userId),
          eq(fraudAlert.severity, 'CRITICAL')
        )),
      
      // Unresolved alerts
      db.select()
        .from(fraudAlert)
        .where(and(
          eq(fraudAlert.userId, userId),
          eq(fraudAlert.isResolved, false)
        )),
      
      // Recent alerts (last 24 hours)
      db.select()
        .from(fraudAlert)
        .where(and(
          eq(fraudAlert.userId, userId),
          gte(fraudAlert.createdAt, last24Hours)
        )),
      
      // Average risk score
      db.select({ avgRisk: avg(sql`CAST(${paymentTransaction.riskScore} AS DECIMAL)`) })
        .from(paymentTransaction)
        .where(eq(paymentTransaction.userId, userId)),
      
      // High-risk transactions (last 10)
      db.select({
        id: paymentTransaction.id,
        amount: paymentTransaction.amount,
        currency: paymentTransaction.currency,
        recipientName: paymentTransaction.recipientName,
        status: paymentTransaction.status,
        riskScore: paymentTransaction.riskScore,
        createdAt: paymentTransaction.createdAt,
      })
        .from(paymentTransaction)
        .where(and(
          eq(paymentTransaction.userId, userId),
          sql`CAST(${paymentTransaction.riskScore} AS DECIMAL) >= 60`
        ))
        .orderBy(desc(paymentTransaction.createdAt))
        .limit(10),
      
      // Active devices
      db.select()
        .from(deviceFingerprint)
        .where(and(
          eq(deviceFingerprint.userId, userId),
          eq(deviceFingerprint.isActive, true)
        )),
      
      // Recent risk assessments (last 5)
      db.select({
        id: riskAssessment.id,
        riskScore: riskAssessment.riskScore,
        riskLevel: riskAssessment.riskLevel,
        assessmentType: riskAssessment.assessmentType,
        createdAt: riskAssessment.createdAt,
      })
        .from(riskAssessment)
        .where(eq(riskAssessment.userId, userId))
        .orderBy(desc(riskAssessment.createdAt))
        .limit(5)
    ]);

    console.log('Transaction counts:', {
      total: totalTransactions.length,
      pending: pendingTransactions.length,
      approved: approvedTransactions.length,
      completed: completedTransactions.length,
      declined: declinedTransactions.length,
      escrow: escrowTransactions.length
    });

    // Get recent transactions for overview
    const recentTransactions = await db.select({
      id: paymentTransaction.id,
      amount: paymentTransaction.amount,
      currency: paymentTransaction.currency,
      recipientName: paymentTransaction.recipientName,
      status: paymentTransaction.status,
      createdAt: paymentTransaction.createdAt,
    })
      .from(paymentTransaction)
      .where(eq(paymentTransaction.userId, userId))
      .orderBy(desc(paymentTransaction.createdAt))
      .limit(5);

    console.log('Recent transactions found:', recentTransactions.length);
    console.log('Recent transactions:', recentTransactions);

    // Calculate security score based on various factors
    const totalTx = totalTransactions.length;
    const declinedTx = declinedTransactions.length;
    const criticalAlertsCount = criticalAlerts.length;
    const unresolvedAlertsCount = unresolvedAlerts.length;
    
    let securityScore = 100;
    if (totalTx > 0) {
      securityScore -= (declinedTx / totalTx) * 30; // Declined transactions reduce score
    }
    securityScore -= criticalAlertsCount * 10; // Each critical alert reduces score
    securityScore -= unresolvedAlertsCount * 5; // Each unresolved alert reduces score
    securityScore = Math.max(0, Math.min(100, securityScore));

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

    // Format recent transactions
    const formattedRecentTransactions = recentTransactions.map(tx => ({
      id: tx.id,
      amount: parseFloat(tx.amount),
      currency: tx.currency,
      recipient: tx.recipientName,
      status: tx.status,
      timestamp: getTimeAgo(tx.createdAt)
    }));

    // Format recent risk assessments
    const formattedRiskAssessments = recentRiskAssessments.map(ra => ({
      id: ra.id,
      riskScore: parseFloat(ra.riskScore),
      riskLevel: ra.riskLevel,
      assessmentType: ra.assessmentType,
      timestamp: getTimeAgo(ra.createdAt)
    }));

    const response = {
      overview: {
        totalTransactions: totalTx,
        securityScore: Math.round(securityScore),
        activeAlerts: unresolvedAlertsCount,
        activeDevices: activeDevices.length
      },
      transactions: {
        summary: {
          pending: pendingTransactions.length,
          approved: approvedTransactions.length,
          completed: completedTransactions.length,
          declined: declinedTx,
          escrow: escrowTransactions.length
        },
        recent: formattedRecentTransactions,
        highRisk: formattedHighRiskTransactions
      },
      security: {
        alerts: {
          total: totalAlerts.length,
          critical: criticalAlertsCount,
          unresolved: unresolvedAlertsCount,
          recent: recentAlerts.length
        },
        riskAssessment: {
          averageScore: avgRiskScore[0]?.avgRisk ? Number(Number(avgRiskScore[0].avgRisk).toFixed(1)) : 0,
          recentAssessments: formattedRiskAssessments
        },
        systemHealth: {
          uptime: '99.97%',
          threatLevel: securityScore < 70 ? 'ELEVATED' : securityScore < 50 ? 'HIGH' : 'NORMAL',
          lastUpdated: now.toISOString()
        }
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Failed to fetch dashboard data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
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
