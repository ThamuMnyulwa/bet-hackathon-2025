import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { paymentTransaction } from '@/db/schema/auth';
import { eq, desc } from 'drizzle-orm';
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

    // Get query parameters for pagination
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Fetch user's transactions
    const transactions = await db.select({
      id: paymentTransaction.id,
      amount: paymentTransaction.amount,
      currency: paymentTransaction.currency,
      recipientName: paymentTransaction.recipientName,
      recipientAccount: paymentTransaction.recipientAccount,
      status: paymentTransaction.status,
      riskScore: paymentTransaction.riskScore,
      authMethod: paymentTransaction.authMethod,
      stepUpRequired: paymentTransaction.stepUpRequired,
      escrowReleaseTime: paymentTransaction.escrowReleaseTime,
      createdAt: paymentTransaction.createdAt,
      updatedAt: paymentTransaction.updatedAt,
    })
    .from(paymentTransaction)
    .where(eq(paymentTransaction.userId, session.user.id))
    .orderBy(desc(paymentTransaction.createdAt))
    .limit(limit)
    .offset(offset);

    // Format the response
    const formattedTransactions = transactions.map(tx => ({
      id: tx.id,
      amount: parseFloat(tx.amount),
      currency: tx.currency,
      recipientName: tx.recipientName,
      recipientAccount: tx.recipientAccount,
      status: tx.status,
      riskScore: tx.riskScore ? parseFloat(tx.riskScore) : null,
      authMethod: tx.authMethod,
      stepUpRequired: tx.stepUpRequired,
      escrowReleaseTime: tx.escrowReleaseTime,
      createdAt: tx.createdAt,
      updatedAt: tx.updatedAt,
      timeAgo: getTimeAgo(tx.createdAt)
    }));

    return NextResponse.json({
      transactions: formattedTransactions,
      total: transactions.length,
      hasMore: transactions.length === limit
    });

  } catch (error) {
    console.error('Failed to fetch transactions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
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
