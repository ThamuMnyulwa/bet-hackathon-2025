# Product Requirements Document
## SIM-Swap Aware Agentic Payment Risk Engine

**Version:** 1.0  
**Date:** August 15, 2025  
**Team:** Payment Security Engineering  
**Platform:** Google Cloud Platform + ADK  

---

## 1. Executive Summary

### 1.1 Problem Statement
SIM-swap fraud represents a multi-billion rand annual loss in the South African financial ecosystem. Traditional OTP-based authentication is fundamentally compromised when attackers gain control of a user's mobile number through SIM-swapping, enabling complete account takeovers within minutes of initiating fraudulent transactions.

### 1.2 Solution Overview
Project Sentinel is an **agentic payment risk engine** that leverages Google Cloud's AI/ML capabilities to provide real-time, intelligent fraud detection before funds are released. The system combines telco signal analysis, device fingerprinting, and behavioral analytics through an AI agent that learns and adapts to emerging fraud patterns.

### 1.3 Business Impact
- **Revenue Protection:** Prevent R2.5B+ annual fraud losses
- **Customer Trust:** Maintain seamless experience for legitimate users
- **Compliance:** Meet SARB and PCI-DSS security requirements
- **Market Advantage:** Enable confident adoption of fast payment systems

---

## 2. Product Goals & Success Metrics

### 2.1 Primary Goals
1. **Fraud Prevention:** Block 95%+ of SIM-swap initiated fraudulent transactions
2. **User Experience:** Maintain <200ms decision latency for legitimate transactions
3. **Adaptive Intelligence:** Continuously improve detection accuracy through ML
4. **Scalability:** Handle 1M+ transactions per hour with 99.9% availability

### 2.2 Key Performance Indicators (KPIs)

| Metric                             | Target | Measurement Method                |
| ---------------------------------- | ------ | --------------------------------- |
| Fraud Blocked per 10K Transactions | >50    | Real-time monitoring dashboard    |
| Step-up Conversion Rate            | >85%   | Authentication flow completion    |
| False Positive Rate                | <2%    | Customer feedback + manual review |
| Decision Latency (P95)             | <50ms  | Cloud Monitoring alerts           |
| Agent Learning Accuracy            | >92%   | ML model performance metrics      |
| System Availability                | 99.9%  | SLA monitoring                    |

---

## 3. Target Users & Use Cases

### 3.1 Primary Users
- **Banks & Financial Institutions:** Core payment processing systems
- **Fintech Companies:** Digital wallets, payment apps
- **Payment Processors:** Transaction routing and clearing
- **E-commerce Platforms:** High-value transaction processing

### 3.2 Core Use Cases

#### Use Case 1: Real-time Payment Assessment
**Actor:** Payment System  
**Flow:**
1. User initiates payment transaction
2. System triggers risk assessment API
3. AI agent analyzes multi-signal risk profile
4. Returns risk score and recommended action
5. System applies appropriate authentication level

#### Use Case 2: Adaptive Fraud Pattern Learning
**Actor:** AI Agent  
**Flow:**
1. Continuously ingests transaction outcomes
2. Identifies new fraud patterns and attack vectors
3. Updates risk models automatically
4. Validates model performance against ground truth
5. Deploys improved models with A/B testing

#### Use Case 3: Emergency Response
**Actor:** Security Operations  
**Flow:**
1. Detect coordinated attack campaign
2. AI agent escalates unusual pattern clusters
3. Automatically adjust risk thresholds
4. Notify security team with contextual analysis
5. Implement temporary protective measures

---

## 4. Functional Requirements

### 4.1 Core Risk Assessment Engine

#### 4.1.1 Multi-Signal Analysis
**Requirements:**
- **SIM Change Detection:** Query telco APIs for recent SIM replacement events
- **Device Fingerprinting:** Track IMEI drift and device behavior changes
- **Geolocation Analysis:** Detect impossible travel patterns and IP geovelocity
- **Behavioral Profiling:** Analyze transaction patterns and user behavior
- **Network Intelligence:** Monitor cellular network indicators and signal strength

**Input Signals:**
```json
{
  "transaction": {
    "amount": 50000.00,
    "currency": "ZAR",
    "recipient": "merchant_id_123",
    "timestamp": "2025-08-15T14:30:00Z"
  },
  "user": {
    "msisdn": "+27821234567",
    "device_id": "IMEI:123456789012345",
    "ip_address": "102.130.118.100",
    "user_agent": "PayApp/2.1.0",
    "session_id": "sess_abc123"
  },
  "context": {
    "merchant_risk_level": "medium",
    "time_since_last_transaction": 7200,
    "payment_method": "mobile_wallet"
  }
}
```

#### 4.1.2 Agentic Decision Making
**AI Agent Capabilities:**
- **Real-time Learning:** Continuous model updates based on transaction outcomes
- **Pattern Recognition:** Identify emerging fraud techniques automatically
- **Risk Calibration:** Dynamic threshold adjustment based on attack trends
- **Contextual Reasoning:** Consider transaction context, user history, merchant risk
- **Explainable Decisions:** Provide clear reasoning for risk assessments

### 4.2 Authentication Step-up Engine

#### 4.2.1 Risk-Based Authentication
**Low Risk (Score: 0-30):**
- Standard OTP via SMS
- Processing time: <100ms

**Medium Risk (Score: 31-70):**
- Enhanced OTP + device verification
- Biometric confirmation if available
- Processing time: <200ms

**High Risk (Score: 71-100):**
- WebAuthn cryptographic challenge
- Multi-factor authentication required
- Transaction holds until verification
- Processing time: <500ms

#### 4.2.2 Fallback Mechanisms
**Telco Signal Unavailable:**
- Route to delayed escrow (24-hour hold)
- Trigger out-of-band verification
- Manual review for high-value transactions

**System Degraded Mode:**
- Fail-safe to conservative risk assessment
- Graceful degradation with increased step-up rates
- Maintain core fraud prevention capabilities

### 4.3 Streaming Decision Architecture

#### 4.3.1 Real-time Processing Pipeline
**Components:**
- **Pub/Sub Ingestion:** Transaction event streaming
- **Dataflow Processing:** Real-time signal enrichment
- **AI Agent Service:** Risk assessment and decision making
- **Decision Router:** Authentication flow orchestration

**Processing Flow:**
```
Transaction Event → Pub/Sub → Dataflow → AI Agent → Decision Router → Response
                      ↓
                Feature Store (Firestore) ← Historical Context
                      ↓
                ML Pipeline (Vertex AI) ← Model Training
```

---

## 5. Technical Architecture

### 5.1 Google Cloud Platform Stack

#### 5.1.1 Core Services
**Compute & Orchestration:**
- **Cloud Run:** Serverless risk assessment API
- **Cloud Functions:** Event-triggered processing
- **GKE Autopilot:** AI agent container orchestration
- **Workflows:** Multi-step authentication flows

**AI/ML Platform:**
- **Vertex AI:** Model training and deployment
- **AutoML:** Automated model optimization
- **AI Platform Prediction:** Real-time inference
- **Document AI:** Fraud document analysis

**Data & Analytics:**
- **Pub/Sub:** Real-time event streaming
- **Dataflow:** Stream processing and ETL
- **BigQuery:** Data warehouse and analytics
- **Firestore:** Feature store and session data
- **Memorystore (Redis):** High-speed caching

**Security & Monitoring:**
- **Cloud IAM:** Access control and service accounts
- **Cloud KMS:** Encryption key management
- **Cloud Security Command Center:** Threat detection
- **Cloud Monitoring:** Performance and alerting
- **Cloud Logging:** Centralized log management

#### 5.1.2 AI Agent Architecture

**Agent Components:**
```python
# AI Agent Service Structure
class PaymentRiskAgent:
    def __init__(self):
        self.signal_processor = SignalProcessingEngine()
        self.risk_model = VertexAIModel("fraud-detection-v2")
        self.decision_engine = RiskDecisionEngine()
        self.learning_loop = ContinuousLearningPipeline()
    
    async def assess_risk(self, transaction_data):
        # Multi-signal analysis
        signals = await self.signal_processor.extract_signals(transaction_data)
        
        # AI-powered risk scoring
        risk_score = await self.risk_model.predict(signals)
        
        # Contextual decision making
        decision = self.decision_engine.make_decision(risk_score, signals)
        
        # Learn from decision outcome
        self.learning_loop.record_decision(signals, decision)
        
        return decision
```

**Model Training Pipeline:**
- **Data Sources:** Transaction logs, fraud reports, telco signals
- **Feature Engineering:** Automated feature selection and creation
- **Model Types:** Ensemble methods (Random Forest, XGBoost, Neural Networks)
- **Training Schedule:** Continuous retraining with new fraud patterns
- **Validation:** A/B testing and champion/challenger model comparison

### 5.2 Data Flow Architecture

#### 5.2.1 Real-time Processing
```
User Transaction
    ↓
Cloud Load Balancer
    ↓
Cloud Run (Risk Assessment API)
    ↓
┌─── Firestore (User/Device History)
│
├─── Telco API Gateway (SIM Status)
│
├─── Vertex AI (Risk Prediction)
│
└─── Pub/Sub (Decision Events)
    ↓
BigQuery (Analytics & ML Training)
```

#### 5.2.2 Feature Store Design
**Firestore Collections:**
```javascript
// User Device History
users/{user_id}/devices/{device_id} {
  last_seen: timestamp,
  imei: string,
  trust_score: number,
  sim_changes: array,
  location_history: array
}

// Risk Signals Cache
risk_signals/{signal_id} {
  signal_type: "sim_change" | "geo_velocity" | "device_drift",
  value: any,
  confidence: number,
  ttl: timestamp
}

// Decision History
decisions/{decision_id} {
  transaction_id: string,
  risk_score: number,
  action_taken: string,
  outcome: "approved" | "blocked" | "stepped_up",
  feedback: string
}
```

### 5.3 Security Architecture

#### 5.3.1 API Security
- **mTLS:** Mutual authentication for service-to-service communication
- **OAuth 2.0 + OIDC:** Client authentication and authorization
- **Rate Limiting:** Protection against abuse and DDoS
- **WAF:** Web Application Firewall with custom rules

#### 5.3.2 Data Protection
- **Encryption at Rest:** Cloud KMS managed keys
- **Encryption in Transit:** TLS 1.3 for all communications
- **PII Handling:** Tokenization of sensitive user data
- **Data Residency:** South African data sovereignty compliance

---

## 6. API Specifications

### 6.1 Risk Assessment API

#### 6.1.1 Endpoint: POST /v1/assess-payment-risk

**Request:**
```json
{
  "transaction": {
    "id": "txn_abc123",
    "amount": 25000.00,
    "currency": "ZAR",
    "recipient_type": "merchant",
    "recipient_id": "merch_xyz789"
  },
  "user": {
    "id": "user_123",
    "msisdn": "+27821234567",
    "device_fingerprint": {
      "imei": "123456789012345",
      "device_model": "Samsung Galaxy S23",
      "os_version": "Android 13",
      "app_version": "2.1.0"
    }
  },
  "session": {
    "ip_address": "102.130.118.100",
    "user_agent": "PayApp/2.1.0 Android",
    "location": {
      "lat": -33.9249,
      "lon": 18.4241,
      "accuracy": 10
    }
  }
}
```

**Response:**
```json
{
  "decision_id": "dec_abc123",
  "risk_assessment": {
    "overall_score": 85,
    "risk_level": "HIGH",
    "confidence": 0.92
  },
  "signals": {
    "sim_change_risk": {
      "score": 95,
      "reason": "SIM changed 2 hours ago",
      "last_change": "2025-08-15T12:30:00Z"
    },
    "device_risk": {
      "score": 40,
      "reason": "Known device, normal behavior"
    },
    "geo_risk": {
      "score": 75,
      "reason": "Location jump: 500km in 1 hour"
    }
  },
  "recommended_action": {
    "type": "STEP_UP_AUTH",
    "method": "webauthn",
    "priority": "immediate"
  },
  "agent_reasoning": "High confidence SIM swap attack detected. Device is known but impossible travel pattern combined with recent SIM change indicates account takeover attempt.",
  "processing_time_ms": 47
}
```

### 6.2 Authentication Step-up API

#### 6.2.1 Endpoint: POST /v1/initiate-stepup

**Request:**
```json
{
  "decision_id": "dec_abc123",
  "auth_method": "webauthn",
  "user_id": "user_123",
  "fallback_methods": ["biometric", "app_notification"]
}
```

**Response:**
```json
{
  "challenge_id": "chal_xyz789",
  "auth_method": "webauthn",
  "challenge_data": {
    "challenge": "base64_encoded_challenge",
    "timeout": 300,
    "user_verification": "required"
  },
  "fallback_available": true,
  "expires_at": "2025-08-15T14:40:00Z"
}
```

---

## 7. Implementation Plan

### 7.1 Development Phases

#### Phase 1: Core Infrastructure (Weeks 1-4)
**MVP Deliverables:**
- Basic risk assessment API on Cloud Run
- Firestore feature store setup
- Simulated telco signal generator
- Basic ML model for risk scoring
- Monitoring and logging infrastructure

**Success Criteria:**
- API responds within 100ms for basic risk assessment
- Successfully processes 1000 TPS in load testing
- Basic fraud patterns detected with 80% accuracy

#### Phase 2: AI Agent Development (Weeks 5-8)
**Deliverables:**
- Vertex AI model training pipeline
- Continuous learning implementation
- Advanced signal processing
- Decision explanation engine
- A/B testing framework

**Success Criteria:**
- AI agent achieves 90%+ accuracy on known fraud patterns
- Model retraining pipeline functional
- Explainable decisions generated for all assessments

#### Phase 3: Production Readiness (Weeks 9-12)
**Deliverables:**
- Security hardening and penetration testing
- Real telco API integrations
- Production monitoring and alerting
- Disaster recovery procedures
- Performance optimization

**Success Criteria:**
- Security audit passed
- 99.9% uptime achieved
- Production load testing successful
- DR procedures validated

#### Phase 4: Advanced Features (Weeks 13-16)
**Deliverables:**
- Advanced authentication methods (WebAuthn, biometrics)
- Behavioral analytics and anomaly detection
- Cross-merchant fraud pattern sharing
- Advanced agent reasoning capabilities
- Real-time model updates

### 7.2 Resource Requirements

#### 7.2.1 Team Structure
- **Tech Lead:** Senior Python/ML Engineer
- **Backend Engineers:** 2x Cloud/API specialists
- **ML Engineers:** 2x Vertex AI/ML specialists
- **Security Engineer:** 1x Cloud security expert
- **DevOps Engineer:** 1x GCP infrastructure specialist
- **Product Manager:** Risk domain expertise

#### 7.2.2 Infrastructure Costs (Monthly Estimates)
- **Compute (Cloud Run + GKE):** $2,000
- **AI/ML (Vertex AI):** $5,000
- **Data Storage (BigQuery + Firestore):** $1,500
- **Networking (Load Balancer + CDN):** $500
- **Monitoring & Security:** $800
- **Total Estimated:** $9,800/month

---

## 8. Risk Assessment & Mitigation

### 8.1 Technical Risks

| Risk                     | Probability | Impact | Mitigation Strategy                               |
| ------------------------ | ----------- | ------ | ------------------------------------------------- |
| Telco API Unavailability | Medium      | High   | Implement fallback mechanisms and cached data     |
| ML Model Drift           | Medium      | Medium | Continuous monitoring and automated retraining    |
| Latency SLA Breach       | Low         | High   | Performance optimization and caching strategies   |
| Data Privacy Compliance  | Low         | High   | Legal review and privacy-by-design implementation |

### 8.2 Business Risks

| Risk                 | Probability | Impact | Mitigation Strategy                            |
| -------------------- | ----------- | ------ | ---------------------------------------------- |
| High False Positives | Medium      | High   | Extensive testing and tuning before production |
| Regulatory Changes   | Low         | Medium | Continuous compliance monitoring               |
| Competitive Response | High        | Medium | Rapid feature development and differentiation  |

---

## 9. Success Metrics & Monitoring

### 9.1 Real-time Dashboards

**Operational Metrics:**
- Transaction volume and processing rates
- Risk score distribution and trends
- Authentication step-up rates
- System latency and availability
- AI agent model performance

**Security Metrics:**
- Fraud attempts blocked per hour
- Attack pattern evolution
- False positive/negative rates
- Security incident response times

### 9.2 Business Intelligence

**Monthly Reports:**
- Fraud prevention ROI analysis
- Customer experience impact assessment
- Model accuracy trends and improvements
- Competitive analysis and market positioning

---

## 10. Conclusion

Project Sentinel represents a paradigm shift from reactive fraud detection to proactive, AI-driven risk prevention. By leveraging Google Cloud's advanced AI/ML capabilities and combining multiple risk signals, we can create an intelligent system that learns and adapts to emerging threats while maintaining an excellent user experience for legitimate customers.

The agentic approach ensures continuous improvement and adaptation to new fraud patterns, making this solution future-proof against evolving threats in the South African payment ecosystem.

**Next Steps:**
1. Stakeholder approval and budget allocation
2. Team assembly and project kickoff
3. Technical architecture review and refinement
4. Phase 1 development sprint planning