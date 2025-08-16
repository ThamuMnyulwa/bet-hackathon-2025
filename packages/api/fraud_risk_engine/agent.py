"""
Fraud Risk Engine - Main fraud detection agent with integrated tools.
"""

from google.adk.agents import Agent
from google.adk.tools import google_search
from typing import Dict, Any
import json
import asyncio
from datetime import datetime
from app.tools.transunion_connector import TransUnionConnector

# Initialize TransUnion connector
transunion = TransUnionConnector()

async def check_sim_intelligence(transaction: str) -> Dict[str, Any]:
    """
    Analyzes SIM swap patterns and carrier data for fraud indicators.
    
    Args:
        transaction: JSON string containing transaction data
        
    Returns:
        Dict with SIM intelligence analysis containing status, risk_score, indicators, and confidence
    """
    try:
        tx_data = json.loads(transaction)
        msisdn = tx_data.get("msisdn", "")
        
        # Get carrier data from TransUnion
        carrier_data = await transunion.check_msisdn(msisdn)
        
        # Analyze SIM swap indicators
        sim_change = carrier_data.get("sim_change", {})
        risk_score = 0
        indicators = []
        
        if sim_change.get("detected", False):
            risk_score += 40
            indicators.append("recent_sim_swap")
            
            # Check how recent the SIM swap was
            if sim_change.get("date"):
                swap_date = datetime.fromisoformat(sim_change["date"].replace("Z", "+00:00"))
                days_since_swap = (datetime.now() - swap_date).days
                if days_since_swap < 7:
                    risk_score += 30
                    indicators.append("very_recent_sim_swap")
        
        # Check fraud indicators from TransUnion
        if "sim_swap" in carrier_data.get("fraud_indicators", []):
            risk_score += 20
            indicators.append("carrier_fraud_flag")
        
        return {
            "status": "success",
            "agent": "sim_intelligence",
            "risk_score": min(risk_score, 100),
            "indicators": indicators,
            "carrier_data": carrier_data,
            "confidence": 0.85
        }
    except Exception as e:
        return {
            "status": "error",
            "agent": "sim_intelligence",
            "error": str(e),
            "risk_score": 50,
            "confidence": 0.1
        }

async def check_geographic_intelligence(transaction: str) -> Dict[str, Any]:
    """
    Evaluates location anomalies and travel velocity patterns.
    
    Args:
        transaction: JSON string containing transaction data
        
    Returns:
        Dict with geographic analysis containing status, risk_score, indicators, and confidence
    """
    try:
        tx_data = json.loads(transaction)
        location = tx_data.get("location", {})
        ip_address = tx_data.get("ip_address", "")
        
        risk_score = 0
        indicators = []
        
        # Check for location mismatches
        if location.get("country") != "ZA":
            risk_score += 30
            indicators.append("international_transaction")
        
        # Check IP geolocation (simplified)
        if ip_address.startswith("196."):  # South African IP range
            risk_score -= 10
        else:
            risk_score += 20
            indicators.append("foreign_ip_address")
        
        # Check for known high-risk locations
        city = location.get("city", "").lower()
        if city in ["unknown", "vpn", "proxy"]:
            risk_score += 40
            indicators.append("suspicious_location")
        
        return {
            "status": "success",
            "agent": "geographic_intelligence",
            "risk_score": max(0, min(risk_score, 100)),
            "indicators": indicators,
            "location_data": location,
            "confidence": 0.75
        }
    except Exception as e:
        return {
            "status": "error",
            "agent": "geographic_intelligence",
            "error": str(e),
            "risk_score": 50,
            "confidence": 0.1
        }

async def check_device_trust(transaction: str) -> Dict[str, Any]:
    """
    Assesses device fingerprints and behavioral patterns.
    
    Args:
        transaction: JSON string containing transaction data
        
    Returns:
        Dict with device trust analysis containing status, risk_score, indicators, and confidence
    """
    try:
        tx_data = json.loads(transaction)
        device_id = tx_data.get("device_id", "")
        msisdn = tx_data.get("msisdn", "")
        
        risk_score = 0
        indicators = []
        
        # Check device consistency
        if device_id == "000000000000000" or not device_id:
            risk_score += 50
            indicators.append("invalid_device_id")
        
        # Get device change data from TransUnion
        carrier_data = await transunion.check_msisdn(msisdn)
        device_change = carrier_data.get("device_change", {})
        
        if device_change.get("detected", False):
            risk_score += 30
            indicators.append("device_change_detected")
            
            # Check if device ID matches
            current_device = device_change.get("current_device_id", "")
            if current_device and current_device != device_id:
                risk_score += 20
                indicators.append("device_mismatch")
        
        return {
            "status": "success",
            "agent": "device_trust",
            "risk_score": min(risk_score, 100),
            "indicators": indicators,
            "device_data": {
                "device_id": device_id,
                "device_change": device_change
            },
            "confidence": 0.8
        }
    except Exception as e:
        return {
            "status": "error",
            "agent": "device_trust",
            "error": str(e),
            "risk_score": 50,
            "confidence": 0.1
        }

async def check_transaction_context(transaction: str) -> Dict[str, Any]:
    """
    Analyzes transaction amount and merchant patterns.
    
    Args:
        transaction: JSON string containing transaction data
        
    Returns:
        Dict with transaction context analysis containing status, risk_score, indicators, and confidence
    """
    try:
        tx_data = json.loads(transaction)
        amount = tx_data.get("amount", 0)
        merchant = tx_data.get("merchant", "")
        
        risk_score = 0
        indicators = []
        
        # Check transaction amount
        if amount > 10000:
            risk_score += 30
            indicators.append("high_value_transaction")
        elif amount > 5000:
            risk_score += 15
            indicators.append("medium_value_transaction")
        
        # Check merchant risk
        high_risk_merchants = ["electronics", "gift card", "crypto", "forex"]
        if any(term in merchant.lower() for term in high_risk_merchants):
            risk_score += 25
            indicators.append("high_risk_merchant")
        
        # Check timing (late night transactions)
        timestamp = tx_data.get("timestamp", "")
        if timestamp:
            tx_time = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
            hour = tx_time.hour
            if 0 <= hour < 6:  # Midnight to 6 AM
                risk_score += 15
                indicators.append("unusual_time")
        
        return {
            "status": "success",
            "agent": "transaction_context",
            "risk_score": min(risk_score, 100),
            "indicators": indicators,
            "transaction_data": {
                "amount": amount,
                "merchant": merchant
            },
            "confidence": 0.9
        }
    except Exception as e:
        return {
            "status": "error",
            "agent": "transaction_context",
            "error": str(e),
            "risk_score": 50,
            "confidence": 0.1
        }

# Functions are now tools via @function_tool decorator

# Create the main fraud risk engine agent
root_agent = Agent(
    name="FraudRiskEngine",
    model="gemini-2.0-flash-exp",
    description="Comprehensive fraud risk assessment engine with multiple analysis tools",
    instruction="""You are a sophisticated fraud risk assessment engine for financial transactions.

When you receive a transaction for analysis, you MUST:

1. Use ALL four analysis tools to evaluate the transaction:
   - sim_intelligence: Check for SIM swap and carrier fraud indicators
   - geographic_intelligence: Analyze location and IP anomalies
   - device_trust: Assess device consistency and changes
   - transaction_context: Evaluate amount and merchant risk

2. Wait for all tool responses before making a decision.

3. Calculate the final risk score as a weighted average:
   - SIM Intelligence: 35% weight
   - Geographic Intelligence: 25% weight
   - Device Trust: 25% weight
   - Transaction Context: 15% weight

4. Make a decision based on the final score:
   - Score ≥ 75: BLOCK (high risk)
   - Score 50-74: REVIEW (manual review needed)
   - Score < 50: APPROVE (low risk)

5. ALWAYS respond with this EXACT JSON format:
{
  "transaction_id": "<from input>",
  "decision": "APPROVE/REVIEW/BLOCK",
  "risk_score": <weighted average 0-100>,
  "explanation": "Clear explanation of the decision",
  "confidence": <average confidence from all tools>,
  "risk_factors": {
    "sim_intelligence": <score>,
    "geographic_intelligence": <score>,
    "device_trust": <score>,
    "transaction_context": <score>
  },
  "key_indicators": [<list of all indicators found>],
  "timestamp": "<current timestamp in ISO format string>"
}

IMPORTANT: You must call all tools with the full transaction JSON string as input.""",
    tools=[
        check_sim_intelligence,
        check_geographic_intelligence,
        check_device_trust,
        check_transaction_context,
        google_search  # Can also search for additional context if needed
    ]
)