import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { paymentTransaction } from '@/db/schema/auth';
import { eq, and } from 'drizzle-orm';
import { headers } from 'next/headers';



export async function PATCH(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { 
        status: 401,
      });
    }

    const { transactionId, status } = await request.json();

    if (!transactionId || !status) {
      return NextResponse.json({ error: 'Missing transaction ID or status' }, { 
        status: 400,
      });
    }

    // Valid status transitions
    const validStatuses = ['PENDING', 'APPROVED', 'COMPLETED', 'DECLINED', 'ESCROW'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { 
        status: 400,
      });
    }

    // Update transaction status
    const result = await db.update(paymentTransaction)
      .set({ 
        status,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(paymentTransaction.id, transactionId),
          eq(paymentTransaction.userId, session.user.id)
        )
      );

    return NextResponse.json({
      success: true,
      transactionId,
      status,
      updatedAt: new Date()
    }, {
    });

  } catch (error) {
    console.error('Failed to update transaction status:', error);
    return NextResponse.json(
      { error: 'Failed to update transaction status' },
      { 
        status: 500,
      }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { 
        status: 401,
      });
    }

    const { transactionId, action, status } = await request.json();

    if (!transactionId || !action) {
      return NextResponse.json({ error: 'Missing transaction ID or action' }, { 
        status: 400,
      });
    }

    // Handle different actions
    if (action === 'COMPLETE_STEP_UP') {
      // Complete step-up authentication and mark transaction as completed
      const result = await db.update(paymentTransaction)
        .set({ 
          status: 'COMPLETED',
          stepUpRequired: false,
          updatedAt: new Date()
        })
        .where(
          and(
            eq(paymentTransaction.id, transactionId),
            eq(paymentTransaction.userId, session.user.id)
          )
        );

      console.log('Step-up completed for transaction:', transactionId);

      return NextResponse.json({
        success: true,
        transactionId,
        status: 'COMPLETED',
        action: 'COMPLETE_STEP_UP',
        updatedAt: new Date()
      }, {
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { 
      status: 400,
    });

  } catch (error) {
    console.error('Failed to process payment action:', error);
    return NextResponse.json(
      { error: 'Failed to process payment action' },
      { 
        status: 500,
      }
    );
  }
}
