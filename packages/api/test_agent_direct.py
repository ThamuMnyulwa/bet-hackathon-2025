import asyncio
import json
from fraud_risk_engine.agent import root_agent
from google.adk.sessions import InMemorySessionService
from google.adk.runners import Runner
from google.genai import types

async def test_agent():
    transaction = {
        "transaction_id": "tx_12345",
        "msisdn": "27731234567",
        "device_id": "DEV123456789",
        "amount": 1500.00,
        "merchant": "Electronics Store",
        "timestamp": "2025-08-16T12:00:00Z",
        "location": {
            "country": "ZA",
            "city": "Cape Town",
            "latitude": -33.9249,
            "longitude": 18.4241
        },
        "ip_address": "196.25.1.100"
    }
    
    transaction_json = json.dumps(transaction)
    print("Testing fraud risk engine with transaction:")
    print(transaction_json)
    print("\n" + "="*50 + "\n")
    
    try:
        # Setup session and runner (proper ADK way)
        session_service = InMemorySessionService()
        session = await session_service.create_session(
            app_name="fraud_risk_engine",
            user_id="test_user",
            session_id="test_session_001"
        )
        
        runner = Runner(
            agent=root_agent,
            app_name="fraud_risk_engine",
            session_service=session_service
        )
        
        # Create proper ADK Content object
        content = types.Content(
            role='user',
            parts=[types.Part(text=transaction_json)]
        )
        
        # Run agent with proper format
        events = runner.run_async(
            user_id="test_user",
            session_id="test_session_001",
            new_message=content
        )
        
        # Collect responses
        responses = []
        async for event in events:
            responses.append(event)
            print(f"Event: {event}")
            if event.is_final_response():
                final_response = event.content.parts[0].text if event.content and event.content.parts else "No content"
                print(f"\nFinal Agent Response: {final_response}")
                return final_response
                
        return "No final response received"
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        return None

if __name__ == "__main__":
    asyncio.run(test_agent())
