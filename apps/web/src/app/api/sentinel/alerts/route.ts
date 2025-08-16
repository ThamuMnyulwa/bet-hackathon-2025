import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { fraudAlert, paymentTransaction, user } from '@/db/schema/auth';
import { eq, desc, and, gte, count, sql } from 'drizzle-orm';
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

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const includeResolved = searchParams.get('includeResolved') === 'true';

    // Build the where condition
    let whereCondition = includeResolved ? undefined : eq(fraudAlert.isResolved, false);

    // Fetch recent fraud alerts
    const alerts = await db.select({
      id: fraudAlert.id,
      alertType: fraudAlert.alertType,
      severity: fraudAlert.severity,
      description: fraudAlert.description,
      isResolved: fraudAlert.isResolved,
      resolvedBy: fraudAlert.resolvedBy,
      resolvedAt: fraudAlert.resolvedAt,
      metadata: fraudAlert.metadata,
      createdAt: fraudAlert.createdAt,
      userId: fraudAlert.userId,
    })
    .from(fraudAlert)
    .where(whereCondition)
    .orderBy(desc(fraudAlert.createdAt))
    .limit(limit);

    // Format the response with time ago
    const formattedAlerts = alerts.map(alert => ({
      ...alert,
      timeAgo: getTimeAgo(alert.createdAt),
      userIdMasked: `user_${alert.userId.slice(-6)}` // Mask user ID for privacy
    }));

    return NextResponse.json({
      alerts: formattedAlerts,
      total: alerts.length
    }, {
    });

  } catch (error) {
    console.error('Failed to fetch fraud alerts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch fraud alerts' },
      { 
        status: 500,
      }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { 
        status: 401
      });
    }

    const { alertId, action } = await request.json();

    if (!alertId || !action) {
      return NextResponse.json({ error: 'Missing alert ID or action' }, { 
        status: 400
      });
    }

    if (action === 'resolve') {
      await db.update(fraudAlert)
        .set({ 
          isResolved: true,
          resolvedBy: session.user.id,
          resolvedAt: new Date()
        })
        .where(eq(fraudAlert.id, alertId));
    }

    return NextResponse.json({
      success: true,
      alertId,
      action
    }, {
    });

  } catch (error) {
    console.error('Failed to update alert:', error);
    return NextResponse.json(
      { error: 'Failed to update alert' },
      { 
        status: 500,
      }
    );
  }
}

// Auto-generate sample alerts for demo purposes
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

    // Create sample alerts for demo
    const sampleAlerts = [
      {
        id: `alert_${Date.now()}_1`,
        userId: session.user.id,
        alertType: 'SIM_SWAP',
        severity: 'CRITICAL',
        description: 'SIM card changed within 2 hours of high-value transaction attempt',
        isResolved: false,
        metadata: { riskScore: 95, transactionAmount: 25000 },
        createdAt: new Date()
      },
      {
        id: `alert_${Date.now()}_2`,
        userId: session.user.id,
        alertType: 'GEOVELOCITY',
        severity: 'HIGH',
        description: 'Impossible travel detected: Cape Town to Johannesburg in 30 minutes',
        isResolved: false,
        metadata: { distance: 1400, timeframe: '30 minutes' },
        createdAt: new Date(Date.now() - 15 * 60 * 1000) // 15 minutes ago
      },
      {
        id: `alert_${Date.now()}_3`,
        userId: session.user.id,
        alertType: 'DEVICE_CHANGE',
        severity: 'MEDIUM',
        description: 'New device detected for user with payment history',
        isResolved: false,
        metadata: { deviceFingerprint: 'new_device_123' },
        createdAt: new Date(Date.now() - 60 * 60 * 1000) // 1 hour ago
      }
    ];

    for (const alert of sampleAlerts) {
      await db.insert(fraudAlert).values(alert);
    }

    return NextResponse.json({
      success: true,
      alertsCreated: sampleAlerts.length
    }, {
    });

  } catch (error) {
    console.error('Failed to create sample alerts:', error);
    return NextResponse.json(
      { error: 'Failed to create sample alerts' },
      { 
        status: 500,
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
