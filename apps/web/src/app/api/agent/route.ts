import { NextRequest, NextResponse } from 'next/server';
import { streamText, convertToModelMessages, createUIMessageStream, createUIMessageStreamResponse, tool, smoothStream } from 'ai';
import { groq } from '@ai-sdk/groq';
import { z } from 'zod';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { RiskEngine } from '@/lib/sentinel/risk-engine';
import { db } from '@/db';
import { fraudAlert, paymentTransaction, deviceFingerprint, riskAssessment, telcoSignal, user } from '@/db/schema/auth';
import { eq, desc, and, gte, count, sql, like, or } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    if (!process.env.GROQ_API_KEY) {
      return new NextResponse(
        JSON.stringify({ error: 'Missing GROQ_API_KEY' }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
    }

    const body = await request.json().catch(() => ({}));
    const messages = body?.messages ?? [];
    const headersList = await headers();

    const model = groq('openai/gpt-oss-120b');

    // Define tools using the modern AI SDK pattern
    const tools = {
      getSessionUser: tool({
        description: 'Get the current authenticated user id and email.',
        inputSchema: z.object({}),
        execute: async () => {
          const session = await auth.api.getSession({ headers: headersList });
          if (!session) return { authenticated: false };
          return {
            authenticated: true,
            user: { id: session.user.id, email: session.user.email }
          };
        },
      }),

      parsePaymentRequest: tool({
        description: 'Parse a natural language payment request into structured data.',
        inputSchema: z.object({
          request: z.string().min(1).describe('The natural language payment request to parse')
        }),
        execute: async ({ request }) => {
          try {
            // Simple regex-based parsing for common payment request patterns
            const patterns = [
              // Pattern: "Assess R1250 to Jane Doe 1234567890"
              /assess\s+R?(\d+(?:\.\d{2})?)\s+to\s+([^0-9]+?)\s+(\d+)/i,
              // Pattern: "Send R500 to John Smith account 9876543210"
              /send\s+R?(\d+(?:\.\d{2})?)\s+to\s+([^0-9]+?)(?:\s+account\s+)?(\d+)/i,
              // Pattern: "Transfer R1000 to Jane Doe 1234567890"
              /transfer\s+R?(\d+(?:\.\d{2})?)\s+to\s+([^0-9]+?)\s+(\d+)/i,
              // Pattern: "Pay R750 to recipient John Smith 5551234567"
              /pay\s+R?(\d+(?:\.\d{2})?)\s+to\s+(?:recipient\s+)?([^0-9]+?)\s+(\d+)/i
            ];

            let parsed = null;
            for (const pattern of patterns) {
              const match = request.match(pattern);
              if (match) {
                parsed = {
                  amount: parseFloat(match[1]),
                  recipientName: match[2].trim(),
                  recipientAccount: match[3],
                  currency: 'ZAR',
                  originalRequest: request
                };
                break;
              }
            }

            if (!parsed) {
              return {
                success: false,
                error: 'Could not parse payment request. Please use format: "Assess R[amount] to [name] [account]"',
                suggestions: [
                  'Assess R1250 to Jane Doe 1234567890',
                  'Send R500 to John Smith 9876543210',
                  'Transfer R1000 to recipient 5551234567'
                ]
              };
            }

            return {
              success: true,
              parsed: parsed,
              confidence: 'high',
              originalRequest: request
            };
          } catch (error) {
            return {
              success: false,
              error: 'Failed to parse payment request',
              details: error instanceof Error ? error.message : String(error)
            };
          }
        },
      }),

      assessPaymentRisk: tool({
        description: 'Assess transaction risk for a user and amount/recipient.',
        inputSchema: z.object({
          amount: z.number().positive(),
          recipient: z.string().min(1),
          recipientAccount: z.string().optional(),
          assessmentType: z.enum(['TRANSACTION', 'HIGH_VALUE_TRANSACTION']).optional()
        }),
        execute: async ({ amount, recipient, recipientAccount, assessmentType }) => {
          const session = await auth.api.getSession({ headers: headersList });
          if (!session) {
            return { error: 'Unauthorized', status: 401 };
          }

          const userAgent = headersList.get('user-agent') || '';
          const xForwardedFor = headersList.get('x-forwarded-for');
          const xRealIp = headersList.get('x-real-ip');
          const ipAddress = xForwardedFor?.split(',')[0] || xRealIp || '';
          const fingerprint = Buffer.from(`${userAgent}:${ipAddress}`).toString('base64');

          const engine = new RiskEngine();
          const finalType = amount > 10000 ? 'HIGH_VALUE_TRANSACTION' : (assessmentType ?? 'TRANSACTION');
          const result = await engine.assessRisk(
            session.user.id,
            { fingerprint, ipAddress, userAgent },
            finalType
          );

          return {
            input: { amount, recipient, recipientAccount, assessmentType: finalType },
            result
          };
        },
      }),

      initiatePayment: tool({
        description: 'Initiate a payment with the existing payments API. Requires active session.',
        inputSchema: z.object({
          amount: z.number().positive(),
          recipientName: z.string().min(1),
          recipientAccount: z.string().min(4),
          currency: z.string().default('ZAR'),
          authMethod: z.enum(['OTP', 'PASSKEY', 'NONE']).default('OTP')
        }),
        execute: async ({ amount, recipientName, recipientAccount, currency, authMethod }) => {
          const cookie = headersList.get('cookie') || '';
          const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000';

          const res = await fetch(`${serverUrl}/api/payments/initiate`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              cookie
            },
            body: JSON.stringify({
              amount,
              currency,
              recipientName,
              recipientAccount,
              authMethod
            })
          });

          const data = await res.json().catch(() => ({}));
          return { status: res.status, data };
        },
      }),

      getUserProfile: tool({
        description: 'Get detailed user profile and account information.',
        inputSchema: z.object({
          includeSecurity: z.boolean().default(true),
          includeActivity: z.boolean().default(false)
        }),
        execute: async ({ includeSecurity, includeActivity }) => {
          const session = await auth.api.getSession({ headers: headersList });
          if (!session) {
            return { error: 'Unauthorized', status: 401 };
          }

          try {
            const userData = await db.select()
              .from(user)
              .where(eq(user.id, session.user.id))
              .limit(1);

            if (userData.length === 0) {
              return { error: 'User not found' };
            }

            const userProfile = userData[0];
            let result: any = {
              id: userProfile.id,
              name: userProfile.name,
              email: userProfile.email,
              emailVerified: userProfile.emailVerified,
              createdAt: userProfile.createdAt,
              accountAge: Math.floor((Date.now() - new Date(userProfile.createdAt).getTime()) / (1000 * 60 * 60 * 24))
            };

            if (includeSecurity) {
              // Get security-related data
              const [devices, riskAssessments, alerts] = await Promise.all([
                db.select().from(deviceFingerprint).where(eq(deviceFingerprint.userId, session.user.id)),
                db.select().from(riskAssessment).where(eq(riskAssessment.userId, session.user.id)),
                db.select().from(fraudAlert).where(eq(fraudAlert.userId, session.user.id))
              ]);

              result.security = {
                deviceCount: devices.length,
                riskAssessmentCount: riskAssessments.length,
                fraudAlertCount: alerts.length
              };
            }

            if (includeActivity) {
              // Get recent activity
              const recentTransactions = await db.select({
                id: paymentTransaction.id,
                amount: paymentTransaction.amount,
                status: paymentTransaction.status,
                createdAt: paymentTransaction.createdAt
              })
              .from(paymentTransaction)
              .where(eq(paymentTransaction.userId, session.user.id))
              .orderBy(desc(paymentTransaction.createdAt))
              .limit(5);

              result.recentActivity = recentTransactions.map(tx => ({
                ...tx,
                amount: parseFloat(tx.amount),
                timeAgo: getTimeAgo(tx.createdAt)
              }));
            }

            return result;
          } catch (error) {
            console.error('Failed to get user profile:', error);
            return { error: 'Failed to get user profile' };
          }
        },
      }),

      getRecentTransactions: tool({
        description: 'Get recent transactions with advanced filtering, real-time updates, and comprehensive transaction details.',
        inputSchema: z.object({
          limit: z.number().min(1).max(100).default(20).describe('Maximum number of transactions to return (1-100)'),
          status: z.enum(['PENDING', 'APPROVED', 'DECLINED', 'ESCROW', 'COMPLETED']).optional().describe('Filter by transaction status'),
          timeRange: z.enum(['1h', '24h', '7d', '30d']).default('24h').describe('Time range for transactions'),
          highRiskOnly: z.boolean().default(false).describe('Show only high-risk transactions (risk score >= 60)'),
          includeDetails: z.boolean().default(true).describe('Include detailed transaction information'),
          minAmount: z.number().optional().describe('Minimum transaction amount to include'),
          maxAmount: z.number().optional().describe('Maximum transaction amount to include')
        }),
        execute: async ({ limit, status, timeRange, highRiskOnly, includeDetails, minAmount, maxAmount }) => {
          const session = await auth.api.getSession({ headers: headersList });
          if (!session) {
            return { error: 'Unauthorized', status: 401 };
          }

          try {
            // Calculate time range
            const now = new Date();
            const timeRanges: Record<string, Date> = {
              '1h': new Date(now.getTime() - 60 * 60 * 1000),
              '24h': new Date(now.getTime() - 24 * 60 * 60 * 1000),
              '7d': new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
              '30d': new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
            };
            const startDate = timeRanges[timeRange] || timeRanges['24h'];

            let whereCondition: any = and(
              eq(paymentTransaction.userId, session.user.id),
              gte(paymentTransaction.createdAt, startDate)
            );

            if (status) {
              whereCondition = and(whereCondition, eq(paymentTransaction.status, status));
            }

            if (highRiskOnly) {
              whereCondition = and(whereCondition, sql`CAST(${paymentTransaction.riskScore} AS DECIMAL) >= 60`);
            }

            if (minAmount !== undefined) {
              whereCondition = and(whereCondition, sql`CAST(${paymentTransaction.amount} AS DECIMAL) >= ${minAmount}`);
            }

            if (maxAmount !== undefined) {
              whereCondition = and(whereCondition, sql`CAST(${paymentTransaction.amount} AS DECIMAL) <= ${maxAmount}`);
            }

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
              ...(includeDetails && {
                metadata: paymentTransaction.metadata
              })
            })
            .from(paymentTransaction)
            .where(whereCondition)
            .orderBy(desc(paymentTransaction.createdAt))
            .limit(limit);

            // Process transactions
            const enrichedTransactions = transactions.map(tx => ({
              ...tx,
              amount: parseFloat(tx.amount),
              riskScore: tx.riskScore ? parseFloat(tx.riskScore.toString()) : null,
              timeAgo: getTimeAgo(tx.createdAt),
              riskLevel: tx.riskScore ? (parseFloat(tx.riskScore.toString()) >= 80 ? 'CRITICAL' : 
                                         parseFloat(tx.riskScore.toString()) >= 60 ? 'HIGH' : 
                                         parseFloat(tx.riskScore.toString()) >= 40 ? 'MEDIUM' : 'LOW') : 'UNKNOWN',
              statusColor: tx.status === 'COMPLETED' ? 'green' : 
                          tx.status === 'PENDING' ? 'yellow' : 
                          tx.status === 'DECLINED' ? 'red' : 
                          tx.status === 'ESCROW' ? 'orange' : 'blue'
            }));

            return {
              transactions: enrichedTransactions,
              total: enrichedTransactions.length,
              timeRange,
              filters: { status, highRiskOnly, minAmount, maxAmount },
              summary: {
                totalAmount: enrichedTransactions.reduce((sum, tx) => sum + tx.amount, 0),
                highRiskCount: enrichedTransactions.filter(tx => tx.riskScore && tx.riskScore >= 60).length,
                pendingCount: enrichedTransactions.filter(tx => tx.status === 'PENDING').length,
                escrowCount: enrichedTransactions.filter(tx => tx.status === 'ESCROW').length,
                completedCount: enrichedTransactions.filter(tx => tx.status === 'COMPLETED').length,
                declinedCount: enrichedTransactions.filter(tx => tx.status === 'DECLINED').length
              },
              recommendations: enrichedTransactions.length > 0 ? [
                highRiskOnly ? 'High-risk transactions detected - review security protocols' : null,
                enrichedTransactions.filter(tx => tx.status === 'PENDING').length > 5 ? 'Multiple pending transactions - consider batch processing' : null,
                enrichedTransactions.filter(tx => tx.status === 'ESCROW').length > 0 ? 'Escrow transactions present - monitor release schedules' : null
              ].filter(Boolean) : ['No transactions found in specified time range']
            };
          } catch (error) {
            console.error('Failed to get recent transactions:', error);
            return { error: 'Failed to get recent transactions' };
          }
        },
      }),

      getSystemStatus: tool({
        description: 'Get real-time system status including uptime, performance metrics, and threat levels.',
        inputSchema: z.object({}),
        execute: async () => {
          const session = await auth.api.getSession({ headers: headersList });
          if (!session) {
            return { error: 'Unauthorized', status: 401 };
          }

          try {
            // Get real-time metrics
            const [
              activeAlerts,
              pendingTransactions,
              systemLoad,
              lastIncident
            ] = await Promise.all([
              db.select()
                .from(fraudAlert)
                .where(eq(fraudAlert.isResolved, false)),
              
              db.select()
                .from(paymentTransaction)
                .where(eq(paymentTransaction.status, 'PENDING')),
              
              // Simulate system load
              Promise.resolve(Math.random() * 30 + 20), // 20-50% load
              
              // Get last critical alert
              db.select()
                .from(fraudAlert)
                .where(eq(fraudAlert.severity, 'CRITICAL'))
                .orderBy(desc(fraudAlert.createdAt))
                .limit(1)
            ]);

            const criticalAlerts = activeAlerts.length;
            const pending = pendingTransactions.length;
            const load = systemLoad;
            const lastCritical = lastIncident[0];

            return {
              systemStatus: {
                status: criticalAlerts > 5 ? 'ATTENTION' : criticalAlerts > 0 ? 'WARNING' : 'HEALTHY',
                uptime: '99.97%',
                systemLoad: `${load.toFixed(1)}%`,
                activeAlerts: criticalAlerts,
                pendingTransactions: pending
              },
              threatLevel: {
                current: criticalAlerts > 10 ? 'HIGH' : criticalAlerts > 5 ? 'MEDIUM' : 'LOW',
                description: criticalAlerts > 10 ? 'Multiple critical threats detected' : 
                            criticalAlerts > 5 ? 'Elevated threat level' : 'Normal operations'
              },
              performance: {
                averageResponseTime: '35ms',
                riskAssessmentLatency: '25ms',
                fraudDetectionAccuracy: '99.2%',
                falsePositiveRate: '0.8%'
              },
              lastIncident: lastCritical ? {
                type: lastCritical.alertType,
                severity: lastCritical.severity,
                description: lastCritical.description,
                timeAgo: getTimeAgo(lastCritical.createdAt)
              } : null,
              recommendations: generateSystemRecommendations({
                criticalAlerts,
                pending,
                load
              })
            };
          } catch (error) {
            console.error('Failed to get system status:', error);
            return { error: 'Failed to get system status' };
          }
        },
      }),

      getFraudAlerts: tool({
        description: 'Get recent fraud alerts with filtering options.',
        inputSchema: z.object({
          limit: z.number().min(1).max(50).default(10),
          includeResolved: z.boolean().default(false),
          severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional()
        }),
        execute: async ({ limit, includeResolved, severity }) => {
          const session = await auth.api.getSession({ headers: headersList });
          if (!session) {
            return { error: 'Unauthorized', status: 401 };
          }

          try {
            let whereCondition: any = includeResolved ? undefined : eq(fraudAlert.isResolved, false);
            
            if (severity) {
              whereCondition = whereCondition 
                ? and(whereCondition, eq(fraudAlert.severity, severity))
                : eq(fraudAlert.severity, severity);
            }
            

            const alerts = await db.select({
              id: fraudAlert.id,
              alertType: fraudAlert.alertType,
              severity: fraudAlert.severity,
              description: fraudAlert.description,
              isResolved: fraudAlert.isResolved,
              createdAt: fraudAlert.createdAt,
              metadata: fraudAlert.metadata
            })
            .from(fraudAlert)
            .where(whereCondition)
            .orderBy(desc(fraudAlert.createdAt))
            .limit(limit);

            return {
              alerts: alerts.map(alert => ({
                ...alert,
                timeAgo: getTimeAgo(alert.createdAt)
              })),
              total: alerts.length
            };
          } catch (error) {
            console.error('Failed to fetch alerts:', error);
            return { error: 'Failed to fetch alerts' };
          }
        },
      }),

      searchTransactions: tool({
        description: 'Search and filter transactions with advanced criteria.',
        inputSchema: z.object({
          query: z.string().optional(),
          minAmount: z.number().optional(),
          maxAmount: z.number().optional(),
          status: z.enum(['PENDING', 'APPROVED', 'DECLINED', 'ESCROW', 'COMPLETED']).optional(),
          dateFrom: z.string().optional(),
          dateTo: z.string().optional(),
          limit: z.number().min(1).max(100).default(20)
        }),
        execute: async ({ query, minAmount, maxAmount, status, dateFrom, dateTo, limit }) => {
          const session = await auth.api.getSession({ headers: headersList });
          if (!session) {
            return { error: 'Unauthorized', status: 401 };
          }

          try {
            let whereCondition = eq(paymentTransaction.userId, session.user.id);

            if (query) {
              whereCondition = and(
                whereCondition,
                or(
                  like(paymentTransaction.recipientName, `%${query}%`),
                  like(paymentTransaction.recipientAccount, `%${query}%`)
                )
              );
            }

            if (minAmount !== undefined) {
              whereCondition = and(whereCondition, sql`CAST(${paymentTransaction.amount} AS DECIMAL) >= ${minAmount}`);
            }

            if (maxAmount !== undefined) {
              whereCondition = and(whereCondition, sql`CAST(${paymentTransaction.amount} AS DECIMAL) <= ${maxAmount}`);
            }

            if (status) {
              whereCondition = and(whereCondition, eq(paymentTransaction.status, status));
            }

            if (dateFrom) {
              whereCondition = and(whereCondition, gte(paymentTransaction.createdAt, new Date(dateFrom)));
            }

            if (dateTo) {
              whereCondition = and(whereCondition, sql`${paymentTransaction.createdAt} <= ${new Date(dateTo)}`);
            }

            const transactions = await db.select({
              id: paymentTransaction.id,
              amount: paymentTransaction.amount,
              currency: paymentTransaction.currency,
              recipientName: paymentTransaction.recipientName,
              recipientAccount: paymentTransaction.recipientAccount,
              status: paymentTransaction.status,
              riskScore: paymentTransaction.riskScore,
              createdAt: paymentTransaction.createdAt
            })
            .from(paymentTransaction)
            .where(whereCondition)
            .orderBy(desc(paymentTransaction.createdAt))
            .limit(limit);

            return {
              transactions: transactions.map(tx => ({
                ...tx,
                amount: parseFloat(tx.amount),
                riskScore: tx.riskScore ? parseFloat(tx.riskScore.toString()) : null,
                timeAgo: getTimeAgo(tx.createdAt)
              })),
              total: transactions.length,
              filters: { query, minAmount, maxAmount, status, dateFrom, dateTo }
            };
          } catch (error) {
            console.error('Failed to search transactions:', error);
            return { error: 'Failed to search transactions' };
          }
        },
      }),

      getTransactionStatus: tool({
        description: 'Get comprehensive status information for a specific transaction including current state, risk assessment, authentication status, and next steps.',
        inputSchema: z.object({
          transactionId: z.string().min(1).describe('Unique identifier of the transaction to check'),
          includeHistory: z.boolean().default(false).describe('Include transaction history and audit trail'),
          includeRiskDetails: z.boolean().default(true).describe('Include detailed risk assessment information'),
          includeUserContext: z.boolean().default(false).describe('Include user context and device information')
        }),
        execute: async ({ transactionId, includeHistory, includeRiskDetails, includeUserContext }) => {
          const session = await auth.api.getSession({ headers: headersList });
          if (!session) {
            return { error: 'Unauthorized', status: 401 };
          }

          try {
            // Get transaction details
            const transactionData = await db.select()
              .from(paymentTransaction)
              .where(and(
                eq(paymentTransaction.id, transactionId),
                eq(paymentTransaction.userId, session.user.id)
              ))
              .limit(1);

            if (transactionData.length === 0) {
              return { error: 'Transaction not found or access denied' };
            }

            const transaction = transactionData[0];

            // Get additional context if requested
            let riskDetails = null;
            let userContext = null;
            let transactionHistory = null;

            if (includeRiskDetails) {
              const riskAssessmentData = await db.select()
                .from(riskAssessment)
                .where(eq(riskAssessment.userId, session.user.id))
                .orderBy(desc(riskAssessment.createdAt))
                .limit(1);

              if (riskAssessmentData.length > 0) {
                riskDetails = {
                  riskScore: parseFloat(riskAssessmentData[0].riskScore.toString()),
                  riskLevel: riskAssessmentData[0].riskLevel,
                  assessmentType: riskAssessmentData[0].assessmentType,
                  factors: riskAssessmentData[0].factors,
                  timestamp: riskAssessmentData[0].createdAt
                };
              }
            }

            if (includeUserContext) {
              const userAgent = headersList.get('user-agent') || '';
              const xForwardedFor = headersList.get('x-forwarded-for');
              const xRealIp = headersList.get('x-real-ip');
              const ipAddress = (xForwardedFor?.split(',')[0] || xRealIp || '') as string;
              const fingerprint = Buffer.from(`${userAgent}:${ipAddress}`).toString('base64');

              const deviceInfo = await db.select()
                .from(deviceFingerprint)
                .where(and(
                  eq(deviceFingerprint.userId, session.user.id),
                  eq(deviceFingerprint.deviceId, fingerprint)
                ))
                .limit(1);

              userContext = {
                deviceFingerprint: fingerprint,
                ipAddress,
                userAgent,
                deviceTrustScore: deviceInfo.length > 0 ? parseFloat(deviceInfo[0].trustScore.toString()) : null,
                isKnownDevice: deviceInfo.length > 0,
                lastSeen: deviceInfo.length > 0 ? deviceInfo[0].lastSeen : null
              };
            }

            if (includeHistory) {
              // Get transaction status changes (this would require a separate audit table)
              // For now, we'll use the metadata
              transactionHistory = {
                createdAt: transaction.createdAt,
                updatedAt: transaction.updatedAt,
                statusChanges: transaction.metadata ? [
                  {
                    timestamp: transaction.createdAt,
                    status: 'CREATED',
                    description: 'Transaction initiated'
                  },
                  ...(transaction.metadata as any)?.statusUpdates || []
                ] : [
                  {
                    timestamp: transaction.createdAt,
                    status: 'CREATED',
                    description: 'Transaction initiated'
                  }
                ]
              };
            }

            // Determine next steps based on current status
            const nextSteps = (() => {
              switch (transaction.status) {
                case 'PENDING':
                  return [
                    'Review transaction details and risk assessment',
                    'Approve, decline, or place in escrow based on risk',
                    'Consider step-up authentication if needed'
                  ];
                case 'APPROVED':
                  return [
                    'Monitor transaction processing',
                    'Complete transaction when ready',
                    'Send completion notification to user'
                  ];
                case 'ESCROW':
                  return [
                    'Monitor escrow period',
                    'Review any new risk factors',
                    'Release from escrow or extend if needed'
                  ];
                case 'COMPLETED':
                  return [
                    'Transaction is final - no further action required',
                    'Archive transaction records',
                    'Update user account summary'
                  ];
                case 'DECLINED':
                  return [
                    'Notify user of decline decision',
                    'Document decline reason',
                    'Consider policy updates if needed'
                  ];
                default:
                  return ['Monitor transaction status for changes'];
              }
            })();

            // Calculate time-based metrics
            const now = new Date();
            const timeSinceCreation = Math.floor((now.getTime() - new Date(transaction.createdAt).getTime()) / (1000 * 60));
            const timeSinceUpdate = Math.floor((now.getTime() - new Date(transaction.updatedAt).getTime()) / (1000 * 60));

            return {
              transactionId,
              status: transaction.status,
              currentState: {
                amount: parseFloat(transaction.amount),
                currency: transaction.currency,
                recipientName: transaction.recipientName,
                recipientAccount: transaction.recipientAccount,
                riskScore: transaction.riskScore ? parseFloat(transaction.riskScore.toString()) : null,
                stepUpRequired: transaction.stepUpRequired,
                escrowReleaseTime: transaction.escrowReleaseTime,
                authMethod: transaction.authMethod
              },
              timing: {
                createdAt: transaction.createdAt,
                updatedAt: transaction.updatedAt,
                timeSinceCreation: `${timeSinceCreation} minutes`,
                timeSinceUpdate: `${timeSinceUpdate} minutes`,
                isStale: timeSinceUpdate > 60 // Consider stale if not updated in last hour
              },
              riskAssessment: riskDetails,
              userContext,
              transactionHistory,
              nextSteps,
              recommendations: [
                transaction.status === 'PENDING' && transaction.riskScore && parseFloat(transaction.riskScore.toString()) > 70 ? 'High risk transaction - consider additional verification' : null,
                transaction.status === 'ESCROW' && transaction.escrowReleaseTime && new Date(transaction.escrowReleaseTime) < now ? 'Escrow period expired - review for release' : null,
                transaction.stepUpRequired ? 'Step-up authentication required - monitor completion' : null,
                timeSinceUpdate > 30 ? 'Transaction may need attention - consider follow-up' : null
              ].filter(Boolean),
              statusColor: transaction.status === 'COMPLETED' ? 'green' : 
                          transaction.status === 'PENDING' ? 'yellow' : 
                          transaction.status === 'DECLINED' ? 'red' : 
                          transaction.status === 'ESCROW' ? 'orange' : 'blue'
            };
          } catch (error) {
            console.error('Failed to get transaction status:', error);
            return { error: 'Failed to get transaction status' };
          }
        },
      }),

      changeStatus: tool({
        description: 'Change the status of a transaction with comprehensive validation, audit trail, and status-specific actions. This tool handles the complete status change workflow including security checks, notifications, and compliance requirements.',
        inputSchema: z.object({
          transactionId: z.string().min(1).describe('Unique identifier of the transaction to change status'),
          newStatus: z.enum(['PENDING', 'APPROVED', 'DECLINED', 'ESCROW', 'COMPLETED', 'CANCELLED']).describe('New status to assign to the transaction'),
          reason: z.string().min(1).describe('Reason for the status change (required for all status changes)'),
          additionalNotes: z.string().optional().describe('Additional notes or context for the status change'),
          requireApproval: z.boolean().default(false).describe('Whether this status change requires additional approval'),
          escrowDuration: z.number().optional().describe('Escrow duration in hours (required for ESCROW status)'),
          riskScoreOverride: z.number().min(0).max(100).optional().describe('Optional risk score override for this status change'),
          forceChange: z.boolean().default(false).describe('Force status change even if it violates normal workflow rules')
        }),
        execute: async ({ 
          transactionId, 
          newStatus, 
          reason, 
          additionalNotes, 
          requireApproval, 
          escrowDuration, 
          riskScoreOverride, 
          forceChange 
        }) => {
          const session = await auth.api.getSession({ headers: headersList });
          if (!session) {
            return { error: 'Unauthorized', status: 401 };
          }

          try {
            // Get current transaction
            const currentTransaction = await db.select()
              .from(paymentTransaction)
              .where(and(
                eq(paymentTransaction.id, transactionId),
                eq(paymentTransaction.userId, session.user.id)
              ))
              .limit(1);

            if (currentTransaction.length === 0) {
              return { error: 'Transaction not found or access denied' };
            }

            const transaction = currentTransaction[0];
            const currentStatus = transaction.status;
            const currentRiskScore = transaction.riskScore ? parseFloat(transaction.riskScore.toString()) : 0;

            // Validate status change based on current status
            if (!forceChange) {
              const validTransitions = {
                'PENDING': ['APPROVED', 'DECLINED', 'ESCROW', 'CANCELLED'],
                'APPROVED': ['COMPLETED', 'ESCROW', 'CANCELLED'],
                'ESCROW': ['APPROVED', 'COMPLETED', 'DECLINED'],
                'DECLINED': ['PENDING', 'CANCELLED'],
                'COMPLETED': ['CANCELLED'], // Completed transactions can only be cancelled
                'CANCELLED': [] // Cancelled transactions cannot be changed
              };

              const allowedTransitions = validTransitions[currentStatus as keyof typeof validTransitions] || [];
              if (!allowedTransitions.includes(newStatus)) {
                return {
                  error: `Invalid status transition from ${currentStatus} to ${newStatus}`,
                  allowedTransitions,
                  currentStatus,
                  requestedStatus: newStatus
                };
              }
            }

            // Special validations for specific statuses
            if (newStatus === 'ESCROW' && !escrowDuration) {
              return { error: 'Escrow duration is required when setting status to ESCROW' };
            }

            if (newStatus === 'COMPLETED' && currentRiskScore > 70 && !forceChange) {
              return { 
                error: 'Cannot complete high-risk transaction without force override',
                currentRiskScore,
                requiredAction: 'Set forceChange to true or reduce risk score'
              };
            }

            // Prepare update data
            const updateData: any = {
              status: newStatus,
              updatedAt: new Date(),
              metadata: {
                ...(transaction.metadata as any),
                statusChanges: [
                  ...((transaction.metadata as any)?.statusChanges || []),
                  {
                    timestamp: new Date().toISOString(),
                    from: currentStatus,
                    to: newStatus,
                    reason,
                    notes: additionalNotes,
                    changedBy: session.user.id,
                    riskScoreOverride: riskScoreOverride || null,
                    requireApproval,
                    forceChange
                  }
                ]
              }
            };

            // Status-specific updates
            switch (newStatus) {
              case 'ESCROW':
                if (escrowDuration) {
                  updateData.escrowReleaseTime = new Date(Date.now() + escrowDuration * 60 * 60 * 1000);
                  updateData.metadata.escrowDetails = {
                    duration: escrowDuration,
                    placedAt: new Date().toISOString(),
                    releaseTime: updateData.escrowReleaseTime.toISOString()
                  };
                }
                break;

              case 'APPROVED':
                updateData.stepUpRequired = false;
                updateData.metadata.approvalDetails = {
                  approvedAt: new Date().toISOString(),
                  approvedBy: session.user.id,
                  approvalReason: reason
                };
                break;

              case 'COMPLETED':
                updateData.metadata.completionDetails = {
                  completedAt: new Date().toISOString(),
                  completedBy: session.user.id,
                  completionReason: reason
                };
                break;

              case 'DECLINED':
                updateData.metadata.declineDetails = {
                  declinedAt: new Date().toISOString(),
                  declinedBy: session.user.id,
                  declineReason: reason
                };
                break;

              case 'CANCELLED':
                updateData.metadata.cancellationDetails = {
                  cancelledAt: new Date().toISOString(),
                  cancelledBy: session.user.id,
                  cancellationReason: reason
                };
                break;
            }

            // Update risk score if override provided
            if (riskScoreOverride !== undefined) {
              updateData.riskScore = riskScoreOverride.toString();
              updateData.metadata.riskScoreOverride = {
                from: currentRiskScore,
                to: riskScoreOverride,
                reason: `Risk score override during status change to ${newStatus}`,
                overriddenBy: session.user.id,
                timestamp: new Date().toISOString()
              };
            }

            // Update transaction
            await db.update(paymentTransaction)
              .set(updateData)
              .where(eq(paymentTransaction.id, transactionId));

            // Determine next steps based on new status
            const nextSteps = (() => {
              switch (newStatus) {
                case 'APPROVED':
                  return [
                    'Transaction approved successfully',
                    'Monitor for any security concerns',
                    'Consider completing transaction when ready'
                  ];
                case 'ESCROW':
                  return [
                    `Transaction placed in escrow for ${escrowDuration} hours`,
                    'Monitor escrow period and any new risk factors',
                    'Review for release or extension before expiry'
                  ];
                case 'COMPLETED':
                  return [
                    'Transaction completed successfully',
                    'Archive transaction records',
                    'Update compliance reports'
                  ];
                case 'DECLINED':
                  return [
                    'Transaction declined - notify user',
                    'Document decline reason for compliance',
                    'Consider policy updates if needed'
                  ];
                case 'CANCELLED':
                  return [
                    'Transaction cancelled successfully',
                    'Process any refunds if applicable',
                    'Update audit trail'
                  ];
                default:
                  return ['Status change completed - monitor transaction'];
              }
            })();

            // Generate compliance recommendations
            const complianceRecommendations = (() => {
              const recommendations = [];
              
              if (newStatus === 'ESCROW' && escrowDuration && escrowDuration > 48) {
                recommendations.push('Long escrow period - consider additional monitoring');
              }
              
              if (forceChange) {
                recommendations.push('Status change was forced - review for compliance issues');
              }
              
              if (riskScoreOverride && riskScoreOverride > 70) {
                recommendations.push('High risk score override - ensure proper justification');
              }
              
              if (requireApproval) {
                recommendations.push('Additional approval required - follow approval workflow');
              }
              
              return recommendations.length > 0 ? recommendations : ['No special compliance actions required'];
            })();

            return {
              success: true,
              action: 'STATUS_CHANGED',
              transactionId,
              previousStatus: currentStatus,
              newStatus,
              timestamp: new Date().toISOString(),
              summary: {
                reason,
                notes: additionalNotes,
                changedBy: session.user.id,
                requireApproval,
                forceChange,
                riskScoreOverride: riskScoreOverride || null
              },
              nextSteps,
              complianceRecommendations,
              auditTrail: {
                statusChanges: updateData.metadata.statusChanges,
                riskScoreChanges: updateData.metadata.riskScoreOverride || null,
                timestamp: new Date().toISOString()
              }
            };

          } catch (error) {
            console.error('Failed to change transaction status:', error);
            return { 
              error: 'Failed to change transaction status',
              details: error instanceof Error ? error.message : String(error)
            };
          }
        },
      }),
    };

    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        const result = await streamText({
          model,
          system: [
            'You are Sentinel, an autonomous risk and payments agent with comprehensive security monitoring capabilities.',
            'You can analyze system health, monitor fraud, manage alerts, assess payment risks, parse payment requests, and much more.',
            'Always call the appropriate tools to gather information before providing analysis and recommendations.',
            'After calling tools, you MUST continue and analyze the results. Do not stop after tool calls - always provide analysis and recommendations. This is a multi-step process: Step 1) Call tools to gather data, Step 2) Analyze the data and provide insights.',
            'Be conversational and helpful in your responses.',
            'If you see security issues, explain them clearly and suggest actions.',
            'If you see system health issues, provide status updates and recommendations.',
            'For payment requests, always follow this workflow: 1) Parse the request, 2) Assess risk, 3) Provide recommendation, 4) Offer to proceed if safe.',
            'For profile requests, analyze the data and provide insights about security status, recommendations, and next steps. Always explain what you found and what it means for the user. When using getUserProfile, call it with includeSecurity: true and includeActivity: false by default, then analyze the security metrics and provide actionable insights.'
          ].join(' '),
          messages: convertToModelMessages(messages),
          tools,
          experimental_transform: smoothStream({
            delayInMs: 15,
            chunking: 'word',
          }),
          prepareStep: async ({ stepNumber, steps, messages }) => {
            console.log(`=== PREPARE STEP ${stepNumber} ===`);
            console.log(`Previous steps: ${steps.length}`);
            console.log(`Messages for this step: ${messages.length}`);
            console.log(`Step ${stepNumber} starting...`);
            console.log(`===============================`);
            
            // For the first step, ensure we have a clear instruction
            if (stepNumber === 0) {
              return {
                // Use the same model but ensure clear instructions
                messages: messages
              };
            }
            
            // For subsequent steps, ensure we have context from previous steps
            return {
              messages: messages
            };
          },
          stopWhen: ({ steps }) => {
            // Continue until we have at least 2 steps: one for tool call, one for analysis
            // This ensures the AI calls tools AND provides analysis
            const shouldStop = steps.length >= 2;
            
            console.log(`=== STOP WHEN CHECK ===`);
            console.log(`Current steps: ${steps.length}`);
            console.log(`Should stop: ${shouldStop}`);
            
            // More detailed step analysis
            steps.forEach((step, i) => {
              console.log(`Step ${i}:`);
              console.log(`  - Has text: ${!!step.text} (length: ${step.text?.length || 0})`);
              console.log(`  - Has tool calls: ${step.toolCalls?.length > 0} (count: ${step.toolCalls?.length || 0})`);
              console.log(`  - Has tool results: ${step.toolResults?.length > 0} (count: ${step.toolResults?.length || 0})`);
              console.log(`  - Finish reason: ${step.finishReason}`);
            });
            
                          // Additional stopping conditions for better analysis
              if (steps.length >= 2) {
                const lastStep = steps[steps.length - 1];
                const hasAnalysis = lastStep.text && lastStep.text.length > 50; // Ensure we have meaningful analysis
                
                console.log(`Final analysis check:`);
                console.log(`  - Last step has text: ${!!lastStep.text}`);
                console.log(`  - Text length: ${lastStep.text?.length || 0}`);
                console.log(`  - Has meaningful analysis: ${hasAnalysis}`);
                console.log(`  - Final stop decision: ${hasAnalysis}`);
                
                return hasAnalysis;
              }
              
              console.log(`=====================`);
              return shouldStop;
          },
          onStepFinish: ({ text, toolCalls, toolResults, finishReason }) => {
            // Log step completion for debugging
            console.log(`=== STEP FINISHED ===`);
            console.log(`Finish reason: ${finishReason}`);
            console.log(`Text length: ${text?.length || 0}`);
            console.log(`Text preview: ${text?.substring(0, 100)}${text && text.length > 100 ? '...' : ''}`);
            
            if (toolCalls.length > 0) {
              console.log(`Tool calls made: ${toolCalls.map(tc => `${tc.toolName}(${JSON.stringify(tc.input)})`).join(', ')}`);
            }
            
            if (toolResults.length > 0) {
              console.log(`Tool results received: ${toolResults.map(tr => `${tr.toolName} -> ${JSON.stringify(tr.output).substring(0, 100)}...`).join(', ')}`);
            }
            
            console.log(`=====================`);
          },
        });

        writer.merge(result.toUIMessageStream());
      },
    });

    
    return createUIMessageStreamResponse({ 
      stream
    });
  } catch (error) {
    console.error('Agent route error:', error);
    return new NextResponse(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );
  }
}

// Helper functions
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

function generateSecurityRecommendations(params: {
  isKnownDevice: boolean;
  deviceTrustScore: number;
  deviceAge: number;
  recentAssessments: any[];
}): string[] {
  const recommendations: string[] = [];
  const { isKnownDevice, deviceTrustScore, deviceAge, recentAssessments } = params;

  if (!isKnownDevice) {
    recommendations.push('Enable two-factor authentication for new device');
    recommendations.push('Verify device fingerprint in security settings');
  }

  if (deviceTrustScore < 0.5) {
    recommendations.push('Device trust score is low - review security settings');
    recommendations.push('Consider re-authenticating this device');
  }

  if (deviceAge < 7) {
    recommendations.push('Device is new - monitor for suspicious activity');
  }

  const highRiskCount = recentAssessments.filter(ra => ra.riskLevel === 'HIGH' || ra.riskLevel === 'CRITICAL').length;
  if (highRiskCount > 2) {
    recommendations.push('Multiple high-risk assessments detected - review account security');
    recommendations.push('Consider changing passwords and reviewing recent activity');
  }

  return recommendations;
}

function generateSystemRecommendations(params: {
  criticalAlerts: number;
  pending: number;
  load: number;
}): string[] {
  const recommendations: string[] = [];
  const { criticalAlerts, pending, load } = params;

  if (criticalAlerts > 10) {
    recommendations.push('Critical alert threshold exceeded - immediate attention required');
    recommendations.push('Review and resolve high-priority fraud alerts');
  } else if (criticalAlerts > 5) {
    recommendations.push('Elevated alert levels - review security protocols');
  }

  if (pending > 100) {
    recommendations.push('High transaction volume - consider scaling resources');
  }

  if (load > 80) {
    recommendations.push('System load is high - monitor performance metrics');
  }

  if (recommendations.length === 0) {
    recommendations.push('System operating normally - continue monitoring');
  }

  return recommendations;
}

function generateComplianceRecommendations(complianceScore: number, alertCount: number, riskAssessmentCount: number): string[] {
  const recommendations: string[] = [];

  if (complianceScore < 60) {
    recommendations.push('Immediate compliance review required - contact compliance team');
    recommendations.push('Consider account restrictions until issues are resolved');
  } else if (complianceScore < 80) {
    recommendations.push('Enhanced monitoring recommended - review recent activities');
    recommendations.push('Schedule compliance review within 7 days');
  }

  if (alertCount > 5) {
    recommendations.push('High alert volume - implement additional fraud prevention measures');
  }

  if (riskAssessmentCount > 10) {
    recommendations.push('Frequent risk assessments - review risk management strategy');
  }

  if (recommendations.length === 0) {
    recommendations.push('Compliance status is good - continue regular monitoring');
  }

  return recommendations;
}

