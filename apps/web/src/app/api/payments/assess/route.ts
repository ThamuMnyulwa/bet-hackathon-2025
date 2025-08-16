import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { riskEngine } from '@/lib/sentinel/risk-engine';
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

    const { amount, recipient, assessmentType = 'TRANSACTION' } = await request.json();

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { 
        status: 400
      });
    }

    // Extract device context
    const headersList = await headers();
    const userAgent = headersList.get('user-agent') || '';
    const xForwardedFor = headersList.get('x-forwarded-for');
    const xRealIp = headersList.get('x-real-ip');
    const ipAddress = xForwardedFor?.split(',')[0] || xRealIp || '';

    // Generate device fingerprint (simplified)
    const deviceFingerprint = Buffer.from(`${userAgent}:${ipAddress}`).toString('base64');

    const context = {
      fingerprint: deviceFingerprint,
      ipAddress,
      userAgent,
      // In production, you'd get location from client-side geolocation
      location: undefined,
      timezone: headersList.get('x-timezone') || undefined
    };

    // Determine assessment type based on amount
    const finalAssessmentType = amount > 10000 ? 'HIGH_VALUE_TRANSACTION' : assessmentType;

    const riskResult = await riskEngine.assessRisk(
      session.user.id,
      context,
      finalAssessmentType
    );

    return NextResponse.json({
      riskScore: riskResult.riskScore,
      riskLevel: riskResult.riskLevel,
      stepUpRequired: riskResult.stepUpRequired,
      recommendedAction: riskResult.recommendedAction,
      confidence: riskResult.confidence,
      assessmentId: `assessment_${Date.now()}`
    });

  } catch (error) {
    console.error('Payment risk assessment failed:', error);
    return NextResponse.json(
      { error: 'Assessment failed' },
      { 
        status: 500
      }
    );
  }
}
