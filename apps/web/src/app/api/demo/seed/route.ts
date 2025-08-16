import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { 
  paymentTransaction, 
  fraudAlert, 
  riskAssessment, 
  deviceFingerprint 
} from '@/db/schema/auth';
import { headers } from 'next/headers';
import { eq } from 'drizzle-orm';

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

    const userId = session.user.id;

    // Check if user already has data
    const existingTransactions = await db.select()
      .from(paymentTransaction)
      .where(eq(paymentTransaction.userId, userId))
      .limit(1);

    if (existingTransactions.length > 0) {
      return NextResponse.json({ 
        message: 'Demo data already exists for this user',
        existing: true
      });
    }

    // Generate demo data
    const now = new Date();
    const demoData = {
      transactions: [
        {
          id: `tx_${Date.now()}_1`,
          userId,
          amount: '1250.00',
          currency: 'ZAR',
          recipientName: 'Jane Doe',
          recipientAccount: '1234567890',
          status: 'COMPLETED',
          riskScore: '25.50',
          authMethod: 'OTP',
          stepUpRequired: false,
          createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
          updatedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000)
        },
        {
          id: `tx_${Date.now()}_2`,
          userId,
          amount: '500.00',
          currency: 'ZAR',
          recipientName: 'John Smith',
          recipientAccount: '9876543210',
          status: 'PENDING',
          riskScore: '45.20',
          authMethod: 'BIOMETRIC',
          stepUpRequired: true,
          createdAt: new Date(now.getTime() - 1 * 60 * 60 * 1000), // 1 hour ago
          updatedAt: new Date(now.getTime() - 1 * 60 * 60 * 1000)
        },
        {
          id: `tx_${Date.now()}_3`,
          userId,
          amount: '750.00',
          currency: 'ZAR',
          recipientName: 'Alice Johnson',
          recipientAccount: '5551234567',
          status: 'APPROVED',
          riskScore: '15.80',
          authMethod: 'PUSH',
          stepUpRequired: false,
          createdAt: new Date(now.getTime() - 30 * 60 * 1000), // 30 minutes ago
          updatedAt: new Date(now.getTime() - 30 * 60 * 1000)
        },
        {
          id: `tx_${Date.now()}_4`,
          userId,
          amount: '2000.00',
          currency: 'ZAR',
          recipientName: 'Bob Wilson',
          recipientAccount: '4449876543',
          status: 'ESCROW',
          riskScore: '75.90',
          authMethod: 'OTP',
          stepUpRequired: true,
          escrowReleaseTime: new Date(now.getTime() + 24 * 60 * 60 * 1000), // 24 hours from now
          createdAt: new Date(now.getTime() - 15 * 60 * 1000), // 15 minutes ago
          updatedAt: new Date(now.getTime() - 15 * 60 * 1000)
        },
        {
          id: `tx_${Date.now()}_5`,
          userId,
          amount: '300.00',
          currency: 'ZAR',
          recipientName: 'Carol Davis',
          recipientAccount: '3334567890',
          status: 'DECLINED',
          riskScore: '85.60',
          authMethod: 'BIOMETRIC',
          stepUpRequired: false,
          createdAt: new Date(now.getTime() - 10 * 60 * 1000), // 10 minutes ago
          updatedAt: new Date(now.getTime() - 10 * 60 * 1000)
        }
      ],
      fraudAlerts: [
        {
          id: `alert_${Date.now()}_1`,
          userId,
          alertType: 'SIM_SWAP',
          severity: 'HIGH',
          description: 'SIM card change detected on registered device',
          isResolved: false,
          createdAt: new Date(now.getTime() - 45 * 60 * 1000) // 45 minutes ago
        },
        {
          id: `alert_${Date.now()}_2`,
          userId,
          alertType: 'GEOVELOCITY',
          severity: 'MEDIUM',
          description: 'Unusual location change detected',
          isResolved: true,
          resolvedBy: 'System',
          resolvedAt: new Date(now.getTime() - 20 * 60 * 1000), // 20 minutes ago
          createdAt: new Date(now.getTime() - 60 * 60 * 1000) // 1 hour ago
        },
        {
          id: `alert_${Date.now()}_3`,
          userId,
          alertType: 'DEVICE_CHANGE',
          severity: 'LOW',
          description: 'New device login detected',
          isResolved: false,
          createdAt: new Date(now.getTime() - 30 * 60 * 1000) // 30 minutes ago
        }
      ],
      riskAssessments: [
        {
          id: `risk_${Date.now()}_1`,
          userId,
          riskScore: '25.50',
          riskLevel: 'LOW',
          factors: ['Trusted device', 'Normal location', 'Regular time'],
          assessmentType: 'TRANSACTION',
          createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000) // 2 hours ago
        },
        {
          id: `risk_${Date.now()}_2`,
          userId,
          riskScore: '45.20',
          riskLevel: 'MEDIUM',
          factors: ['New recipient', 'Higher amount', 'Unusual time'],
          assessmentType: 'TRANSACTION',
          createdAt: new Date(now.getTime() - 1 * 60 * 60 * 1000) // 1 hour ago
        },
        {
          id: `risk_${Date.now()}_3`,
          userId,
          riskScore: '75.90',
          riskLevel: 'HIGH',
          factors: ['High amount', 'New recipient', 'Risk score threshold'],
          assessmentType: 'TRANSACTION',
          createdAt: new Date(now.getTime() - 15 * 60 * 1000) // 15 minutes ago
        }
      ],
      devices: [
        {
          id: `device_${Date.now()}_1`,
          userId,
          deviceId: 'demo_device_1',
          lastSeen: now,
          firstSeen: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
          trustScore: '0.95',
          isActive: true,
          metadata: {
            os: 'iOS 17.0',
            browser: 'Safari',
            device: 'iPhone 15 Pro'
          },
          createdAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
          updatedAt: now
        },
        {
          id: `device_${Date.now()}_2`,
          userId,
          deviceId: 'demo_device_2',
          lastSeen: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
          firstSeen: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
          trustScore: '0.75',
          isActive: true,
          metadata: {
            os: 'Windows 11',
            browser: 'Chrome',
            device: 'Desktop PC'
          },
          createdAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
          updatedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000)
        }
      ]
    };

    // Insert demo data
    await Promise.all([
      db.insert(paymentTransaction).values(demoData.transactions),
      db.insert(fraudAlert).values(demoData.fraudAlerts),
      db.insert(riskAssessment).values(demoData.riskAssessments),
      db.insert(deviceFingerprint).values(demoData.devices)
    ]);

    return NextResponse.json({ 
      message: 'Demo data seeded successfully',
      data: {
        transactions: demoData.transactions.length,
        alerts: demoData.fraudAlerts.length,
        riskAssessments: demoData.riskAssessments.length,
        devices: demoData.devices.length
      }
    });

  } catch (error) {
    console.error('Failed to seed demo data:', error);
    return NextResponse.json(
      { error: 'Failed to seed demo data' },
      { 
        status: 500
      }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Test database connection and table access
    const transactionCount = await db.select().from(paymentTransaction);
    
    console.log('Database test - payment_transaction count:', transactionCount.length);
    
    // Try to get a sample transaction
    const sampleTransactions = await db.select().from(paymentTransaction).limit(1);
    
    console.log('Sample transactions:', sampleTransactions);
    
    return NextResponse.json({
      success: true,
      message: 'Database connection test successful',
      transactionCount: transactionCount.length,
      sampleTransactions: sampleTransactions.length
    });
    
  } catch (error) {
    console.error('Database test failed:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Database test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
