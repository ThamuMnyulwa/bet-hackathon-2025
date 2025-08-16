import { db } from '../../db';
import { riskAssessment, deviceFingerprint, telcoSignal, fraudAlert } from '../../db/schema/auth';
import { eq, and, desc, gte } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export interface RiskFactors {
  simChangeRecent: boolean;
  imeiMismatch: boolean;
  geovelocityAnomaly: boolean;
  deviceBindingAge: number; // in days
  ipLocationChange: boolean;
  unusualTimeAccess: boolean;
  firstTimeDevice: boolean;
  fraudHistoryScore: number;
}

export interface RiskAssessmentResult {
  riskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  factors: RiskFactors;
  stepUpRequired: boolean;
  recommendedAction: 'ALLOW' | 'CHALLENGE' | 'BLOCK' | 'ESCROW';
  confidence: number;
}

export interface TelcoSignals {
  simChangeTimestamp?: Date;
  currentImei?: string;
  imeiHistory?: string[];
  networkProvider?: string;
  signalStrength?: number;
}

export interface DeviceContext {
  fingerprint: string;
  ipAddress: string;
  userAgent: string;
  location?: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  timezone?: string;
}

export class RiskEngine {
  private static readonly RISK_THRESHOLDS = {
    LOW: 0,
    MEDIUM: 30,
    HIGH: 60,
    CRITICAL: 80
  };

  private static readonly SIM_CHANGE_HOURS_THRESHOLD = 24;
  private static readonly GEOVELOCITY_KM_PER_HOUR = 800; // Max reasonable travel speed
  private static readonly MIN_DEVICE_BINDING_DAYS = 7;

  /**
   * Main risk assessment function - completes in <50ms
   */
  async assessRisk(
    userId: string,
    context: DeviceContext,
    assessmentType: 'LOGIN' | 'TRANSACTION' | 'HIGH_VALUE_TRANSACTION' = 'LOGIN'
  ): Promise<RiskAssessmentResult> {
    const startTime = Date.now();
    
    try {
      // Parallel data fetching for speed
      const [telcoData, deviceData, lastSession] = await Promise.all([
        this.getTelcoSignals(userId),
        this.getDeviceFingerprint(userId, context.fingerprint),
        this.getLastSessionLocation(userId)
      ]);

      const factors = await this.calculateRiskFactors({
        userId,
        context,
        telcoData,
        deviceData,
        lastSession,
        assessmentType
      });

      const riskScore = this.calculateRiskScore(factors, assessmentType);
      const riskLevel = this.getRiskLevel(riskScore);
      const stepUpRequired = this.shouldStepUp(riskScore, assessmentType);
      const recommendedAction = this.getRecommendedAction(riskScore, factors);

      const result: RiskAssessmentResult = {
        riskScore,
        riskLevel,
        factors,
        stepUpRequired,
        recommendedAction,
        confidence: this.calculateConfidence(factors, telcoData)
      };

      // Store assessment asynchronously
      this.storeAssessment(userId, context, result, assessmentType).catch(console.error);

      const processingTime = Date.now() - startTime;
      console.log(`Risk assessment completed in ${processingTime}ms`);

      return result;
    } catch (error) {
      console.error('Risk assessment failed:', error);
      // Fail-safe: return medium risk if assessment fails
      return this.getFailSafeAssessment();
    }
  }

  /**
   * Calculate individual risk factors
   */
  private async calculateRiskFactors(params: {
    userId: string;
    context: DeviceContext;
    telcoData: TelcoSignals | null;
    deviceData: any;
    lastSession: any;
    assessmentType: string;
  }): Promise<RiskFactors> {
    const { userId, context, telcoData, deviceData, lastSession } = params;

    // SIM Change Detection
    const simChangeRecent = telcoData?.simChangeTimestamp 
      ? this.isWithinHours(telcoData.simChangeTimestamp, RiskEngine.SIM_CHANGE_HOURS_THRESHOLD)
      : false;

    // IMEI Mismatch Detection
    const imeiMismatch = telcoData?.currentImei && deviceData?.imei
      ? telcoData.currentImei !== deviceData.imei
      : false;

    // Geovelocity Analysis
    const geovelocityAnomaly = lastSession && context.location
      ? await this.checkGeovelocity(lastSession, context)
      : false;

    // Device Binding Age
    const deviceBindingAge = deviceData?.firstSeen
      ? Math.floor((Date.now() - new Date(deviceData.firstSeen).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    // IP Location Change
    const ipLocationChange = lastSession?.ipAddress !== context.ipAddress;

    // Unusual Time Access (3AM - 6AM local time)
    const unusualTimeAccess = this.isUnusualAccessTime(context.timezone);

    // First Time Device
    const firstTimeDevice = !deviceData || deviceBindingAge === 0;

    // Fraud History Score
    const fraudHistoryScore = await this.getFraudHistoryScore(userId);

    return {
      simChangeRecent,
      imeiMismatch,
      geovelocityAnomaly,
      deviceBindingAge,
      ipLocationChange,
      unusualTimeAccess,
      firstTimeDevice,
      fraudHistoryScore
    };
  }

  /**
   * Calculate overall risk score based on factors
   */
  private calculateRiskScore(factors: RiskFactors, assessmentType: string): number {
    let score = 0;
    const weights = this.getWeights(assessmentType);

    // Critical factors
    if (factors.simChangeRecent) score += 40 * weights.simChange;
    if (factors.imeiMismatch) score += 35 * weights.imeiMismatch;
    if (factors.geovelocityAnomaly) score += 30 * weights.geovelocity;

    // Medium factors
    if (factors.firstTimeDevice) score += 20 * weights.newDevice;
    if (factors.ipLocationChange) score += 15 * weights.ipChange;
    if (factors.unusualTimeAccess) score += 10 * weights.timeAnomaly;

    // Positive factors (reduce risk)
    if (factors.deviceBindingAge > RiskEngine.MIN_DEVICE_BINDING_DAYS) {
      score -= Math.min(20, factors.deviceBindingAge * 2);
    }

    // Fraud history
    score += factors.fraudHistoryScore * weights.fraudHistory;

    return Math.max(0, Math.min(100, score));
  }

  private getWeights(assessmentType: string) {
    const baseWeights = {
      simChange: 1.0,
      imeiMismatch: 1.0,
      geovelocity: 1.0,
      newDevice: 1.0,
      ipChange: 1.0,
      timeAnomaly: 1.0,
      fraudHistory: 1.0
    };

    // Increase weights for high-value transactions
    if (assessmentType === 'HIGH_VALUE_TRANSACTION') {
      return {
        ...baseWeights,
        simChange: 1.5,
        imeiMismatch: 1.3,
        geovelocity: 1.2
      };
    }

    return baseWeights;
  }

  private getRiskLevel(score: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (score >= RiskEngine.RISK_THRESHOLDS.CRITICAL) return 'CRITICAL';
    if (score >= RiskEngine.RISK_THRESHOLDS.HIGH) return 'HIGH';
    if (score >= RiskEngine.RISK_THRESHOLDS.MEDIUM) return 'MEDIUM';
    return 'LOW';
  }

  private shouldStepUp(score: number, assessmentType: string): boolean {
    const threshold = assessmentType === 'HIGH_VALUE_TRANSACTION' ? 40 : 50;
    return score >= threshold;
  }

  private getRecommendedAction(score: number, factors: RiskFactors): 'ALLOW' | 'CHALLENGE' | 'BLOCK' | 'ESCROW' {
    if (score >= 85 || (factors.simChangeRecent && factors.imeiMismatch)) return 'BLOCK';
    if (score >= 70) return 'ESCROW';
    if (score >= 40) return 'CHALLENGE';
    return 'ALLOW';
  }

  /**
   * Helper methods
   */
  private async getTelcoSignals(userId: string): Promise<TelcoSignals | null> {
    try {
      const signals = await db.select()
        .from(telcoSignal)
        .where(eq(telcoSignal.userId, userId))
        .orderBy(desc(telcoSignal.lastUpdated))
        .limit(1);

      if (signals.length === 0) return null;

      const signal = signals[0];
      return {
        simChangeTimestamp: signal.simChangeTimestamp || undefined,
        currentImei: signal.imeiHistory?.[0] as string || undefined,
        imeiHistory: signal.imeiHistory as string[] || [],
        networkProvider: signal.networkProvider || undefined,
        signalStrength: signal.signalStrength || undefined
      };
    } catch (error) {
      console.error('Failed to fetch telco signals:', error);
      return null;
    }
  }

  private async getDeviceFingerprint(userId: string, fingerprint: string) {
    try {
      const devices = await db.select()
        .from(deviceFingerprint)
        .where(
          and(
            eq(deviceFingerprint.userId, userId),
            eq(deviceFingerprint.deviceId, fingerprint)
          )
        );

      return devices[0] || null;
    } catch (error) {
      console.error('Failed to fetch device fingerprint:', error);
      return null;
    }
  }

  private async getLastSessionLocation(userId: string) {
    try {
      const sessions = await db.select()
        .from(riskAssessment)
        .where(eq(riskAssessment.userId, userId))
        .orderBy(desc(riskAssessment.createdAt))
        .limit(1);

      return sessions[0] || null;
    } catch (error) {
      console.error('Failed to fetch last session:', error);
      return null;
    }
  }

  private async checkGeovelocity(lastSession: any, context: DeviceContext): Promise<boolean> {
    if (!lastSession?.location || !context.location) return false;

    const lastLocation = JSON.parse(lastSession.location);
    const timeDiff = (Date.now() - new Date(lastSession.createdAt).getTime()) / (1000 * 60 * 60); // hours
    
    if (timeDiff < 0.5) return false; // Skip if too recent

    const distance = this.calculateDistance(
      lastLocation.latitude,
      lastLocation.longitude,
      context.location.latitude,
      context.location.longitude
    );

    const velocity = distance / timeDiff; // km/h
    return velocity > RiskEngine.GEOVELOCITY_KM_PER_HOUR;
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private isWithinHours(timestamp: Date, hours: number): boolean {
    const diff = Date.now() - new Date(timestamp).getTime();
    return diff <= (hours * 60 * 60 * 1000);
  }

  private isUnusualAccessTime(timezone?: string): boolean {
    if (!timezone) return false;
    
    try {
      const now = new Date();
      const localTime = new Date(now.toLocaleString("en-US", { timeZone: timezone }));
      const hour = localTime.getHours();
      return hour >= 3 && hour <= 6; // 3AM - 6AM
    } catch {
      return false;
    }
  }

  private async getFraudHistoryScore(userId: string): Promise<number> {
    try {
      const alerts = await db.select()
        .from(fraudAlert)
        .where(
          and(
            eq(fraudAlert.userId, userId),
            gte(fraudAlert.createdAt, new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)) // Last 90 days
          )
        );

      return Math.min(30, alerts.length * 5); // Max 30 points for fraud history
    } catch (error) {
      console.error('Failed to calculate fraud history score:', error);
      return 0;
    }
  }

  private calculateConfidence(factors: RiskFactors, telcoData: TelcoSignals | null): number {
    let confidence = 50; // Base confidence

    // Increase confidence based on available data
    if (telcoData?.simChangeTimestamp) confidence += 20;
    if (telcoData?.currentImei) confidence += 15;
    if (factors.deviceBindingAge > 0) confidence += 10;
    if (!factors.firstTimeDevice) confidence += 5;

    return Math.min(100, confidence);
  }

  private async storeAssessment(
    userId: string,
    context: DeviceContext,
    result: RiskAssessmentResult,
    assessmentType: string
  ): Promise<void> {
    try {
      await db.insert(riskAssessment).values({
        id: this.generateId(),
        userId,
        riskScore: result.riskScore.toString(),
        riskLevel: result.riskLevel,
        factors: result.factors,
        ipAddress: context.ipAddress,
        location: context.location ? JSON.stringify(context.location) : null,
        assessmentType,
        createdAt: new Date()
      });
    } catch (error) {
      console.error('Failed to store risk assessment:', error);
    }
  }

  private getFailSafeAssessment(): RiskAssessmentResult {
    return {
      riskScore: 50,
      riskLevel: 'MEDIUM',
      factors: {
        simChangeRecent: false,
        imeiMismatch: false,
        geovelocityAnomaly: false,
        deviceBindingAge: 0,
        ipLocationChange: false,
        unusualTimeAccess: false,
        firstTimeDevice: true,
        fraudHistoryScore: 0
      },
      stepUpRequired: true,
      recommendedAction: 'CHALLENGE',
      confidence: 30
    };
  }

  private generateId(): string {
    return `risk_${Date.now()}_${uuidv4().slice(0, 8)}`;
  }
}

export const riskEngine = new RiskEngine();
