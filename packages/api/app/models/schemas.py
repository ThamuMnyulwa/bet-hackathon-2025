from pydantic import BaseModel, Field, validator
from typing import Optional, Dict, Any, List
from datetime import datetime
from enum import Enum

class FraudDecision(str, Enum):
    """Fraud decision types"""
    APPROVE = "APPROVE"
    REVIEW = "REVIEW" 
    BLOCK = "BLOCK"

class LocationData(BaseModel):
    """Location information for a transaction"""
    latitude: float = Field(..., description="Latitude coordinate")
    longitude: float = Field(..., description="Longitude coordinate")
    country: str = Field(..., description="Country code (e.g., ZAR)")
    city: str = Field(..., description="City name")

class TransactionRequest(BaseModel):
    """Request model for fraud assessment"""
    transaction_id: str = Field(..., description="Unique transaction identifier")
    msisdn: str = Field(..., description="Mobile number in international format")
    amount: float = Field(..., gt=0, description="Transaction amount")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Transaction timestamp")
    merchant: str = Field(..., description="Merchant name or identifier")
    device_id: Optional[str] = Field(None, description="Device identifier")
    ip_address: Optional[str] = Field(None, description="IP address of the transaction")
    location: Optional[LocationData] = Field(None, description="Transaction location")
    additional_data: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional transaction metadata")
    
    @validator('msisdn')
    def validate_msisdn(cls, v):
        """Validate MSISDN format"""
        if not v.startswith('27') or len(v) != 11:
            raise ValueError('MSISDN must be in format 27XXXXXXXXX')
        return v

class AgentResult(BaseModel):
    """Result from a single fraud detection agent"""
    agent: str = Field(..., description="Agent name")
    risk_score: float = Field(..., ge=0, le=100, description="Risk score from 0-100")
    reasoning: str = Field(..., description="Agent's reasoning for the score")
    confidence: Optional[float] = Field(None, ge=0, le=1, description="Confidence level 0-1")
    execution_time_ms: Optional[int] = Field(None, description="Agent execution time in milliseconds")

class CarrierData(BaseModel):
    """Carrier data from TransUnion"""
    msisdn: str
    sim_change: Dict[str, Any]
    device_change: Dict[str, Any]
    roaming_status: Dict[str, Any]
    network_info: Dict[str, Any]
    metrics: Dict[str, Any]
    fraud_indicators: List[str]

class FraudAssessmentResponse(BaseModel):
    """Response model for fraud assessment"""
    transaction_id: str = Field(..., description="Transaction identifier")
    decision: FraudDecision = Field(..., description="Final fraud decision")
    risk_score: float = Field(..., ge=0, le=100, description="Overall risk score")
    explanation: str = Field(..., description="Detailed explanation of the decision")
    agent_results: Optional[List[AgentResult]] = Field(None, description="Individual agent results")
    carrier_data: Optional[CarrierData] = Field(None, description="TransUnion carrier data")
    processing_time_ms: Optional[int] = Field(None, description="Total processing time")
    confidence: Optional[float] = Field(None, ge=0, le=1, description="Decision confidence")
    
    # Audit fields
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Assessment timestamp")
    system_version: str = Field(default="1.0.0", description="System version")

class FraudMetrics(BaseModel):
    """Fraud detection system metrics"""
    total_transactions_processed: int
    fraud_detected: int
    fraud_rate: float
    average_processing_time_ms: float
    agent_health: Dict[str, str]
    last_updated: datetime = Field(default_factory=datetime.utcnow)