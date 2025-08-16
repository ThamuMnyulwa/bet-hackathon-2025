import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { paymentTransaction } from '@/db/schema/auth';
import { riskEngine } from '@/lib/sentinel/risk-engine';
import { headers } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';



function getStatusMessage(status: string, stepUpRequired: boolean): string {
  switch (status) {
    case 'DECLINED':
      return 'Transaction blocked due to high fraud risk. Please contact support.';
    case 'ESCROW':
      return 'Transaction placed in secure escrow for additional verification.';
    case 'PENDING':
      return stepUpRequired 
        ? 'Additional authentication required for this transaction.'
        : 'Transaction pending processing.';
    case 'APPROVED':
      return 'Transaction approved and processing.';
    default:
      return 'Transaction status unknown.';
  }
}

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

    const { 
      amount, 
      currency = 'ZAR', 
      recipientName, 
      recipientAccount, 
      authMethod = 'OTP' 
    } = await request.json();

    console.log('Payment initiation request:', {
      userId: session.user.id,
      amount,
      currency,
      recipientName,
      recipientAccount,
      authMethod
    });

    if (!amount || amount <= 0 || !recipientName || !recipientAccount) {
      return NextResponse.json({ error: 'Invalid payment details' }, { 
        status: 400
      });
    }

    // Risk assessment
    const headersList = await headers();
    const userAgent = headersList.get('user-agent') || '';
    const xForwardedFor = headersList.get('x-forwarded-for');
    const xRealIp = headersList.get('x-real-ip');
    const ipAddress = xForwardedFor?.split(',')[0] || xRealIp || '';
    
    const deviceFingerprint = Buffer.from(`${userAgent}:${ipAddress}`).toString('base64');
    const context = {
      fingerprint: deviceFingerprint,
      ipAddress,
      userAgent
    };

    const assessmentType = amount > 10000 ? 'HIGH_VALUE_TRANSACTION' : 'TRANSACTION';
    const riskResult = await riskEngine.assessRisk(session.user.id, context, assessmentType);

    console.log('Risk assessment result:', riskResult);

    // Generate transaction ID
    const transactionId = `txn_${Date.now()}_${uuidv4().slice(0, 8)}`;

    // Determine initial status based on risk
    let status = 'PENDING';
    let escrowReleaseTime = null;

    switch (riskResult.recommendedAction) {
      case 'BLOCK':
        status = 'DECLINED';
        break;
      case 'ESCROW':
        status = 'ESCROW';
        escrowReleaseTime = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        break;
      case 'CHALLENGE':
        status = 'PENDING';
        break;
      case 'ALLOW':
        status = riskResult.stepUpRequired ? 'PENDING' : 'APPROVED';
        break;
    }

    console.log('Transaction details before insert:', {
      transactionId,
      status,
      escrowReleaseTime,
      stepUpRequired: riskResult.stepUpRequired,
      recommendedAction: riskResult.recommendedAction
    });

    // Store transaction
    await db.insert(paymentTransaction).values({
      id: transactionId,
      userId: session.user.id,
      amount: amount.toString(), // Convert to string for decimal field
      currency,
      recipientName,
      recipientAccount,
      status,
      riskScore: riskResult.riskScore.toString(),
      authMethod,
      stepUpRequired: riskResult.stepUpRequired,
      escrowReleaseTime,
      metadata: {
        riskFactors: riskResult.factors,
        userAgent,
        ipAddress
      },
      createdAt: new Date(),
      updatedAt: new Date()
    });

    console.log('Transaction successfully inserted into database with ID:', transactionId);
    console.log('Transaction status:', status, 'Step-up required:', riskResult.stepUpRequired);

    return NextResponse.json({
      transactionId,
      status,
      riskScore: riskResult.riskScore,
      riskLevel: riskResult.riskLevel,
      stepUpRequired: riskResult.stepUpRequired,
      escrowReleaseTime,
      message: getStatusMessage(status, riskResult.stepUpRequired)
    });

  } catch (error) {
    console.error('Payment initiation failed:', error);
    return NextResponse.json(
      { error: 'Payment initiation failed' },
      { 
        status: 500
      }
    );
  }
}
