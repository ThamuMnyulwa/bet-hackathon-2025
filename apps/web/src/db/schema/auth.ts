import { pgTable, text, timestamp, boolean, serial, decimal, integer, jsonb } from "drizzle-orm/pg-core";

export const user = pgTable("user", {
					id: text("id").primaryKey(),
					name: text('name').notNull(),
 email: text('email').notNull().unique(),
 emailVerified: boolean('email_verified').notNull(),
 image: text('image'),
 createdAt: timestamp('created_at').notNull(),
 updatedAt: timestamp('updated_at').notNull()
				});

export const session = pgTable("session", {
					id: text("id").primaryKey(),
					expiresAt: timestamp('expires_at').notNull(),
 token: text('token').notNull().unique(),
 createdAt: timestamp('created_at').notNull(),
 updatedAt: timestamp('updated_at').notNull(),
 ipAddress: text('ip_address'),
 userAgent: text('user_agent'),
 userId: text('user_id').notNull().references(()=> user.id, { onDelete: 'cascade' })
				});

export const account = pgTable("account", {
					id: text("id").primaryKey(),
					accountId: text('account_id').notNull(),
 providerId: text('provider_id').notNull(),
 userId: text('user_id').notNull().references(()=> user.id, { onDelete: 'cascade' }),
 accessToken: text('access_token'),
 refreshToken: text('refresh_token'),
 idToken: text('id_token'),
 accessTokenExpiresAt: timestamp('access_token_expires_at'),
 refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
 scope: text('scope'),
 password: text('password'),
 createdAt: timestamp('created_at').notNull(),
 updatedAt: timestamp('updated_at').notNull()
				});

export const verification = pgTable("verification", {
					id: text("id").primaryKey(),
					identifier: text('identifier').notNull(),
 value: text('value').notNull(),
 expiresAt: timestamp('expires_at').notNull(),
 createdAt: timestamp('created_at'),
 updatedAt: timestamp('updated_at')
				});

// Project Sentinel - Security Layer Tables

export const deviceFingerprint = pgTable("device_fingerprint", {
  id: text("id").primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  imei: text('imei'),
  deviceId: text('device_id'),
  simCardId: text('sim_card_id'),
  lastSeen: timestamp('last_seen').notNull(),
  firstSeen: timestamp('first_seen').notNull(),
  trustScore: decimal('trust_score', { precision: 3, scale: 2 }).default('0.00'),
  isActive: boolean('is_active').default(true),
  metadata: jsonb('metadata'), // Device details, OS, browser, etc.
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull()
});

export const riskAssessment = pgTable("risk_assessment", {
  id: text("id").primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  deviceId: text('device_id').references(() => deviceFingerprint.id),
  riskScore: decimal('risk_score', { precision: 5, scale: 2 }).notNull(),
  riskLevel: text('risk_level').notNull(), // LOW, MEDIUM, HIGH, CRITICAL
  factors: jsonb('factors'), // Array of risk factors that contributed
  sessionId: text('session_id'),
  ipAddress: text('ip_address'),
  location: text('location'),
  assessmentType: text('assessment_type').notNull(), // LOGIN, TRANSACTION, etc.
  createdAt: timestamp('created_at').notNull()
});

export const paymentTransaction = pgTable("payment_transaction", {
  id: text("id").primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  currency: text('currency').notNull().default('ZAR'),
  recipientId: text('recipient_id'),
  recipientName: text('recipient_name'),
  recipientAccount: text('recipient_account'),
  status: text('status').notNull(), // PENDING, APPROVED, DECLINED, ESCROW, COMPLETED
  riskScore: decimal('risk_score', { precision: 5, scale: 2 }),
  authMethod: text('auth_method'), // OTP, BIOMETRIC, PUSH, etc.
  stepUpRequired: boolean('step_up_required').default(false),
  escrowReleaseTime: timestamp('escrow_release_time'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull()
});

export const fraudAlert = pgTable("fraud_alert", {
  id: text("id").primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  alertType: text('alert_type').notNull(), // SIM_SWAP, GEOVELOCITY, DEVICE_CHANGE, etc.
  severity: text('severity').notNull(), // LOW, MEDIUM, HIGH, CRITICAL
  description: text('description').notNull(),
  isResolved: boolean('is_resolved').default(false),
  resolvedBy: text('resolved_by'),
  resolvedAt: timestamp('resolved_at'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull()
});

export const telcoSignal = pgTable("telco_signal", {
  id: text("id").primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  phoneNumber: text('phone_number').notNull(),
  simChangeTimestamp: timestamp('sim_change_timestamp'),
  imeiHistory: jsonb('imei_history'), // Array of IMEI changes
  networkProvider: text('network_provider'),
  signalStrength: integer('signal_strength'),
  lastUpdated: timestamp('last_updated').notNull(),
  isStale: boolean('is_stale').default(false),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull()
});
