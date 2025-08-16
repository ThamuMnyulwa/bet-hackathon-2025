"""
Fraud detection endpoints.
"""

from fastapi import APIRouter, HTTPException
from typing import Dict, Any
import structlog
import json
from datetime import datetime

from app.models.schemas import TransactionRequest, FraudAssessmentResponse
from fraud_risk_engine.agent import root_agent
from google.adk.sessions import InMemorySessionService
from google.adk.runners import Runner
from google.genai import types

router = APIRouter(prefix="/api/v1/fraud")
logger = structlog.get_logger()

# Global session service for API
session_service = InMemorySessionService()

@router.post("/assess", response_model=FraudAssessmentResponse)
async def assess_fraud_risk(transaction: TransactionRequest) -> FraudAssessmentResponse:
    """
    Assess fraud risk for a transaction using the fraud risk engine agent.
    """
    try:
        # Convert transaction to JSON string for the agent
        transaction_json = json.dumps(transaction.model_dump())
        
        # Create unique session for this request
        session_id = f"fraud_assessment_{transaction.transaction_id}"
        user_id = "api_user"
        app_name = "fraud_risk_engine"
        
        # Ensure session exists
        try:
            session = await session_service.get_session(app_name=app_name, user_id=user_id, session_id=session_id)
            if not session:
                session = await session_service.create_session(
                    app_name=app_name,
                    user_id=user_id,
                    session_id=session_id
                )
        except:
            session = await session_service.create_session(
                app_name=app_name,
                user_id=user_id,
                session_id=session_id
            )
        
        # Create runner
        runner = Runner(
            agent=root_agent,
            app_name=app_name,
            session_service=session_service
        )
        
        # Create proper ADK Content object
        content = types.Content(
            role='user',
            parts=[types.Part(text=transaction_json)]
        )
        
        # Run agent and collect final response
        events = runner.run_async(
            user_id=user_id,
            session_id=session_id,
            new_message=content
        )
        
        final_response_text = None
        async for event in events:
            if event.is_final_response():
                final_response_text = event.content.parts[0].text if event.content and event.content.parts else None
                break
        
        if not final_response_text:
            raise Exception("No final response received from agent")
        
        # Parse the agent's JSON response
        try:
            parsed_result = json.loads(final_response_text)
        except json.JSONDecodeError:
            # If response is not JSON, create a fallback response
            parsed_result = {
                "transaction_id": transaction.transaction_id,
                "decision": "REVIEW",
                "risk_score": 50.0,
                "explanation": f"Agent response: {final_response_text}",
                "confidence": 0.5,
                "timestamp": datetime.now().isoformat()
            }
        
        return FraudAssessmentResponse(**parsed_result)
        
    except Exception as e:
        logger.error("Error in fraud assessment", error=str(e))
        raise HTTPException(
            status_code=500,
            detail=f"Error assessing fraud risk: {str(e)}"
        )

@router.get("/health")
async def fraud_service_health() -> Dict[str, Any]:
    """Health check for fraud detection service."""
    return {
        "status": "healthy",
        "service": "fraud-detection",
        "agents": {
            "sim_intelligence": "ready",
            "geographic_intelligence": "ready",
            "device_trust": "ready",
            "real_time_context": "ready"
        }
    }