import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { 
  fraudAlert, 
  paymentTransaction, 
  riskAssessment, 
  deviceFingerprint 
} from '@/db/schema/auth';
import { eq, and, gte, desc, count, sql } from 'drizzle-orm';
import { headers } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { 
        status: 401
      });
    }

    const { alertId } = await request.json();

    if (!alertId) {
      return NextResponse.json({ error: 'Missing alert ID' }, { 
        status: 400
      });
    }

    const userId = session.user.id;

    // Get the alert details
    const alert = await db.select({
      id: fraudAlert.id,
      alertType: fraudAlert.alertType,
      severity: fraudAlert.severity,
      description: fraudAlert.description,
      metadata: fraudAlert.metadata,
      createdAt: fraudAlert.createdAt,
    })
    .from(fraudAlert)
    .where(eq(fraudAlert.id, alertId))
    .limit(1);

    if (alert.length === 0) {
      return NextResponse.json({ error: 'Alert not found' }, { 
        status: 404
      });
    }

    const alertData = alert[0];

    // Calculate date ranges for analysis
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Gather context data for AI analysis
    const [
      similarAlerts,
      recentTransactions,
      riskAssessments,
      deviceActivity
    ] = await Promise.all([
      // Similar alerts in last 24 hours
      db.select()
        .from(fraudAlert)
        .where(and(
          eq(fraudAlert.userId, userId),
          eq(fraudAlert.alertType, alertData.alertType),
          gte(fraudAlert.createdAt, last24Hours)
        )),
      
      // Recent transactions for pattern analysis
      db.select({
        id: paymentTransaction.id,
        amount: paymentTransaction.amount,
        status: paymentTransaction.status,
        riskScore: paymentTransaction.riskScore,
        createdAt: paymentTransaction.createdAt,
      })
        .from(paymentTransaction)
        .where(and(
          eq(paymentTransaction.userId, userId),
          gte(paymentTransaction.createdAt, last7Days)
        ))
        .orderBy(desc(paymentTransaction.createdAt))
        .limit(20),
      
      // Recent risk assessments
      db.select({
        riskScore: riskAssessment.riskScore,
        riskLevel: riskAssessment.riskLevel,
        factors: riskAssessment.factors,
        createdAt: riskAssessment.createdAt,
      })
        .from(riskAssessment)
        .where(and(
          eq(riskAssessment.userId, userId),
          gte(riskAssessment.createdAt, last7Days)
        ))
        .orderBy(desc(riskAssessment.createdAt))
        .limit(10),
      
      // Device activity
      db.select({
        deviceId: deviceFingerprint.deviceId,
        trustScore: deviceFingerprint.trustScore,
        lastSeen: deviceFingerprint.lastSeen,
        metadata: deviceFingerprint.metadata,
      })
        .from(deviceFingerprint)
        .where(eq(deviceFingerprint.userId, userId))
        .orderBy(desc(deviceFingerprint.lastSeen))
        .limit(5)
    ]);

    // AI Analysis Logic
    const analysis = await performAIAnalysis({
      alert: alertData,
      similarAlerts: similarAlerts.length,
      recentTransactions: recentTransactions,
      riskAssessments: riskAssessments,
      deviceActivity: deviceActivity
    });

          return NextResponse.json(analysis);

  } catch (error) {
    console.error('Failed to perform AI analysis:', error);
    return NextResponse.json(
      { error: 'Failed to perform AI analysis' },
      { 
        status: 500
      }
    );
  }
}

async function performAIAnalysis(context: {
  alert: any;
  similarAlerts: number;
  recentTransactions: any[];
  riskAssessments: any[];
  deviceActivity: any[];
}) {
  const { alert, similarAlerts, recentTransactions, riskAssessments, deviceActivity } = context;

  // Pattern Recognition Analysis
  const patternAnalysis = analyzePatterns(alert, similarAlerts, recentTransactions);
  
  // Risk Assessment
  const riskAnalysis = assessRisk(alert, riskAssessments, deviceActivity);
  
  // Generate AI Recommendations
  const recommendations = generateRecommendations(alert, patternAnalysis, riskAnalysis);

  return {
    patternRecognition: patternAnalysis,
    riskAssessment: riskAnalysis,
    recommendations: recommendations,
    analysisTimestamp: new Date().toISOString(),
    confidenceScore: calculateConfidenceScore(patternAnalysis, riskAnalysis)
  };
}

function analyzePatterns(alert: any, similarAlerts: number, transactions: any[]) {
  const patterns = {
    alertFrequency: similarAlerts,
    geographicClustering: false,
    timePatterns: false,
    amountPatterns: false,
    devicePatterns: false,
    riskScoreTrends: false
  };

  // Analyze transaction patterns
  if (transactions.length > 0) {
    const amounts = transactions.map(t => parseFloat(t.amount));
    const riskScores = transactions.map(t => parseFloat(t.riskScore || '0'));
    
    // Check for unusual amount patterns
    const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const maxAmount = Math.max(...amounts);
    if (maxAmount > avgAmount * 3) {
      patterns.amountPatterns = true;
    }

    // Check for risk score trends
    if (riskScores.length > 1) {
      const recentRisk = riskScores.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
      const olderRisk = riskScores.slice(-3).reduce((a, b) => a + b, 0) / 3;
      if (recentRisk > olderRisk * 1.5) {
        patterns.riskScoreTrends = true;
      }
    }
  }

  // Simulate geographic clustering detection
  if (alert.alertType === 'GEOVELOCITY') {
    patterns.geographicClustering = true;
  }

  // Simulate time pattern detection
  const alertHour = new Date(alert.createdAt).getHours();
  if (alertHour < 6 || alertHour > 22) {
    patterns.timePatterns = true;
  }

  return patterns;
}

function assessRisk(alert: any, riskAssessments: any[], deviceActivity: any[]) {
  let threatLevel = 'MEDIUM';
  let confidenceScore = 70;
  let falsePositiveRisk = 'MEDIUM';

  // Analyze risk assessments
  if (riskAssessments.length > 0) {
    const recentRiskScores = riskAssessments.slice(0, 3).map(r => parseFloat(r.riskScore));
    const avgRecentRisk = recentRiskScores.reduce((a, b) => a + b, 0) / recentRiskScores.length;
    
    if (avgRecentRisk > 80) {
      threatLevel = 'CRITICAL';
      confidenceScore = 95;
    } else if (avgRecentRisk > 60) {
      threatLevel = 'HIGH';
      confidenceScore = 85;
    } else if (avgRecentRisk < 30) {
      threatLevel = 'LOW';
      confidenceScore = 60;
      falsePositiveRisk = 'HIGH';
    }
  }

  // Analyze device activity
  if (deviceActivity.length > 0) {
    const lowTrustDevices = deviceActivity.filter(d => parseFloat(d.trustScore) < 0.5);
    if (lowTrustDevices.length > 0) {
      threatLevel = threatLevel === 'LOW' ? 'MEDIUM' : threatLevel;
      confidenceScore = Math.min(confidenceScore + 10, 95);
    }
  }

  // Adjust based on alert severity
  if (alert.severity === 'CRITICAL') {
    threatLevel = 'CRITICAL';
    confidenceScore = Math.max(confidenceScore, 90);
  }

  return {
    threatLevel,
    confidenceScore,
    falsePositiveRisk,
    riskFactors: generateRiskFactors(alert, riskAssessments, deviceActivity)
  };
}

function generateRiskFactors(alert: any, riskAssessments: any[], deviceActivity: any[]) {
  const factors = [];

  if (alert.severity === 'CRITICAL') {
    factors.push('Critical severity alert');
  }

  if (riskAssessments.length > 0) {
    const highRiskCount = riskAssessments.filter(r => parseFloat(r.riskScore) > 70).length;
    if (highRiskCount > 0) {
      factors.push(`${highRiskCount} high-risk assessments in recent history`);
    }
  }

  if (deviceActivity.length > 0) {
    const untrustedDevices = deviceActivity.filter(d => parseFloat(d.trustScore) < 0.3).length;
    if (untrustedDevices > 0) {
      factors.push(`${untrustedDevices} low-trust devices detected`);
    }
  }

  return factors;
}

function generateRecommendations(alert: any, patterns: any, risk: any) {
  const recommendations: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  } = {
    immediate: [],
    shortTerm: [],
    longTerm: []
  };

  // Immediate actions
  if (risk.threatLevel === 'CRITICAL') {
    recommendations.immediate.push('Block suspicious IP addresses immediately');
    recommendations.immediate.push('Freeze affected user accounts');
  }

  if (patterns.amountPatterns) {
    recommendations.immediate.push('Review recent high-value transactions');
  }

  // Short-term actions
  if (patterns.devicePatterns) {
    recommendations.shortTerm.push('Enable additional authentication for affected user');
    recommendations.shortTerm.push('Review device trust scores');
  }

  if (patterns.riskScoreTrends) {
    recommendations.shortTerm.push('Implement enhanced monitoring for user');
  }

  // Long-term actions
  recommendations.longTerm.push('Review and update security policies');
  recommendations.longTerm.push('Implement machine learning-based anomaly detection');
  recommendations.longTerm.push('Conduct security awareness training');

  return recommendations;
}

function calculateConfidenceScore(patterns: any, risk: any) {
  let score = 70; // Base score

  // Adjust based on pattern analysis
  if (patterns.alertFrequency > 1) score += 10;
  if (patterns.geographicClustering) score += 5;
  if (patterns.timePatterns) score += 5;
  if (patterns.amountPatterns) score += 5;
  if (patterns.riskScoreTrends) score += 5;

  // Adjust based on risk assessment
  if (risk.threatLevel === 'CRITICAL') score += 10;
  if (risk.threatLevel === 'HIGH') score += 5;

  return Math.min(score, 95);
}
