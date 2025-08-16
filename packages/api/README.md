# Google Multi-Agent Architecture Implementation for Financial Fraud Detection

This project implements a fraud detection system using Google's Agent Development Kit (ADK) with a multi-agent architecture. The system follows the architecture described in the diagram:

```
flowchart TD
    A["1- Risk Assessment Agent"] --> B["2- Tool call"] & J["3- Response to Application"]
    B --> C["SIM Intelligence Tool"] & D["Geographic Intelligence Tool"] & E["Device Trust Tool"]
    C --> H["Final Risk Decision Tool(Weighted sum)"]
    D --> H
    E --> H
    H --> A

     A:::Sky
     B:::Peach
     J:::Aqua
     C:::Peach
     C:::Ash
     D:::Peach
     D:::Ash
     E:::Peach
     E:::Ash
     H:::Peach
     H:::Ash
    classDef Sky stroke-width:1px, stroke-dasharray:none, stroke:#374D7C, fill:#E2EBFF, color:#374D7C
    classDef Peach stroke-width:1px, stroke-dasharray:none, stroke:#FBB35A, fill:#FFEFDB, color:#8F632D
    classDef Aqua stroke-width:1px, stroke-dasharray:none, stroke:#46EDC8, fill:#DEFFF8, color:#378E7A
    classDef Ash stroke-width:1px, stroke-dasharray:none, stroke:#999999, fill:#EEEEEE, color:#000000
```

## Architecture Overview

The system uses a single Risk Assessment Agent that orchestrates multiple specialized tools to analyze different aspects of a financial transaction:

1. **Risk Assessment Agent** - Main orchestrator that coordinates the fraud detection process
2. **SIM Intelligence Tool** - Analyzes SIM swap patterns and carrier data for fraud indicators
3. **Geographic Intelligence Tool** - Evaluates location anomalies and travel velocity patterns
4. **Device Trust Tool** - Assesses device fingerprints and behavioral patterns
5. **Final Risk Decision Tool** - Uses weighted sum algorithm to synthesize all tool outputs

The agent makes tool calls in parallel and the Final Risk Decision Tool combines the results using a weighted sum approach to determine the final fraud decision (approve, review, or block).

## How It Works

### Data Flow & Processing

The fraud detection system operates through the following detailed process:

1. **Transaction Input**: A financial transaction is submitted with user data including:
   - Phone number
   - Device information
   - Location data
   - Transaction details (amount, merchant, etc.)

2. **TransUnion Data Enrichment**: 
   - The Risk Assessment Agent calls TransUnion APIs to gather carrier intelligence
   - Retrieves SIM swap history, device trust scores, and carrier switching patterns
   - **Note**: In this implementation, we use mock data (`data/raw/transunion_*.csv`) that simulates the expected TransUnion response format

3. **Parallel Tool Execution**: The agent simultaneously invokes three specialized tools:
   - **SIM Intelligence Tool**: Analyzes recent SIM swaps, carrier changes, and suspicious patterns
   - **Geographic Intelligence Tool**: Evaluates location anomalies, velocity checks, and geographic risk factors
   - **Device Trust Tool**: Assesses device fingerprints, behavioral patterns, and device reputation

4. **Risk Aggregation**: The Final Risk Decision Tool processes all tool outputs using a weighted algorithm:
   - Each tool provides a risk score (0-100) and confidence level
   - Weights are applied based on tool confidence and historical accuracy
   - Final risk score determines the decision threshold

5. **Decision Output**: Returns structured response with:
   - Decision: APPROVE, REVIEW, or BLOCK
   - Risk score and confidence level
   - Detailed explanation with contributing factors
   - Recommended actions for each decision type

### TransUnion Integration

The system integrates with TransUnion's fraud prevention services to access:

- **SIM Swap Detection**: Real-time and historical SIM swap events
- **Device Intelligence**: Device reputation and behavioral analytics
- **Carrier Data**: Mobile network operator switching patterns
- **Risk Indicators**: Aggregated fraud signals and scores

**Mock Data Structure**: The simulated TransUnion responses include:
```json
{
  "phone_number": "+1234567890",
  "sim_swap_date": "2024-01-15",
  "carrier": "Verizon",
  "device_trust_score": 85,
  "risk_indicators": ["recent_sim_swap", "device_change"],
  "confidence": 0.92
}
```

## Implementation Details

This implementation uses:

- **Google's ADK** - An open-source framework for building agent-tool systems
- **Gemini Models** - Powers the Risk Assessment Agent with specialized instructions
- **TransUnion Integration** - Provides SIM swap detection and device intelligence
- **Parallel Tool Execution** - Coordinates multiple specialized tools through the main agent

## Getting Started

### Prerequisites

- Python 3.13+
- uv package manager
- Google Cloud account (for Gemini API access)
- Docker (for containerized deployment)

### Local Development Setup

1. **Clone and Navigate to Project**:
```bash
git clone <repository-url>
cd packages/api
```

2. **Environment Setup**:
```bash
# Copy environment template
cp .env-example .env

# Edit .env file and add your Google API key
# GOOGLE_API_KEY=your_actual_api_key_here
```

3. **Install Dependencies**:
```bash
# Install using uv (recommended)
uv sync

# This will install all dependencies from pyproject.toml and create uv.lock
```

4. **Run the API Server**:
```bash
# Use the development script (recommended)
./scripts/dev.sh

# Or run directly with uv
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# The API will be available at http://localhost:8000
# API documentation at http://localhost:8000/docs
```

5. **Test the System**:
```bash
# Test the fraud risk engine agent directly
uv run python test_agent_direct.py

# Test TransUnion connector
uv run python app/tools/transunion_connector.py

# Test with sample transaction data
uv run python -c "
import json
with open('test_transaction.json', 'r') as f:
    print(json.load(f))
"
```

### API Endpoints

Once running locally, the following endpoints are available:

- `GET /health` - Health check endpoint
- `POST /fraud/analyze` - Main fraud detection endpoint
- `GET /docs` - Interactive API documentation
- `GET /redoc` - Alternative API documentation

### Testing Fraud Detection

Example API call to test fraud detection:

```bash
curl -X POST "http://localhost:8000/fraud/analyze" \
     -H "Content-Type: application/json" \
     -d '{
       "phone_number": "+1234567890",
       "transaction_amount": 1500.00,
       "merchant": "Online Store",
       "location": {
         "latitude": 40.7128,
         "longitude": -74.0060
       },
       "device_id": "device123",
       "user_id": "user456"
     }'
```

## Project Structure

```
packages/api/
├── app/                          # FastAPI application
│   ├── main.py                  # FastAPI app entry point
│   ├── core/                    # Core configuration
│   │   └── config.py           # Application settings
│   ├── models/                  # Pydantic models
│   │   └── schemas.py          # Request/response schemas
│   ├── routes/                  # API route handlers
│   │   ├── fraud.py            # Fraud detection endpoints
│   │   └── health.py           # Health check endpoints
│   ├── services/                # Business logic services
│   └── tools/                   # Agent tools
│       └── transunion_connector.py  # TransUnion API integration
├── fraud_risk_engine/           # Main fraud detection agent
│   └── agent.py                # ADK agent with integrated tools
├── data/                        # Sample data for testing
│   └── raw/                    # TransUnion mock data (CSV files)
├── scripts/                     # Development scripts
│   └── dev.sh                  # Development server startup
├── pyproject.toml              # uv project configuration
├── uv.lock                     # uv dependency lock file
└── test_*.py                   # Test files
```

## Example Transaction Flow

1. Client application submits a transaction
2. Risk Assessment Agent enriches the transaction with carrier data from TransUnion
3. Agent calls SIM Intelligence, Geographic Intelligence, and Device Trust tools in parallel
4. Final Risk Decision Tool synthesizes all tool outputs using weighted sum algorithm
5. System returns a decision with explanation and risk score
6. Client application takes action based on the decision

## Configuration

The Risk Assessment Agent and its tools can be configured by modifying:

- **Agent Configuration**: `fraud_risk_engine/agent.py` - Main agent implementation with tool definitions
- **API Configuration**: `app/core/config.py` - FastAPI and environment settings
- **ADK Configuration**: `adk.yaml` - Google ADK agent configuration
- **Dependencies**: `pyproject.toml` - Project dependencies managed by uv

## Cloud Deployment (Google Cloud Run)

The fraud detection system is designed to run as a containerized service on Google Cloud Run, providing auto-scaling and serverless deployment.

### Deployment Architecture

```
Client Application → Cloud Run Service → Gemini API
                                    ↓
                              TransUnion APIs
```

### Cloud Run Configuration

1. **Dockerfile Setup**:
```dockerfile
FROM python:3.13-slim

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /usr/local/bin/

WORKDIR /app

# Copy uv configuration files
COPY pyproject.toml uv.lock ./

# Install dependencies
RUN uv sync --frozen

# Copy application code
COPY . .

# Expose port
EXPOSE 8080

# Run the application
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
```

2. **Environment Variables for Cloud Run**:
```bash
GOOGLE_API_KEY=your_production_api_key
GOOGLE_GENAI_USE_VERTEXAI=TRUE  # Use Vertex AI in production
PORT=8080
ENVIRONMENT=production
```

3. **Deploy to Cloud Run**:
```bash
# Build and deploy
gcloud run deploy fraud-detection-api \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars GOOGLE_API_KEY=$GOOGLE_API_KEY \
  --memory 2Gi \
  --cpu 2 \
  --max-instances 10 \
  --min-instances 1
```

### Auto-scaling Configuration

The Cloud Run service automatically scales based on:
- **Request concurrency**: Up to 1000 concurrent requests per instance
- **CPU utilization**: Scales up when CPU > 60%
- **Memory usage**: Scales up when memory > 70%
- **Cold start optimization**: Minimum 1 instance to reduce latency

### Production Considerations

- **Authentication**: Implement API key authentication for production access
- **Rate Limiting**: Configure rate limits to prevent abuse
- **Monitoring**: Set up Cloud Monitoring for performance tracking
- **Logging**: Structured logging with Cloud Logging integration
- **Health Checks**: Configured health check endpoint for service monitoring

## Advanced Usage

For production deployments, consider:

1. **Real TransUnion Integration**: Replace mock data with actual TransUnion API calls
2. **Caching Layer**: Implement Redis caching for API responses and repeated queries
3. **Monitoring & Observability**: 
   - Cloud Monitoring for performance metrics
   - Error tracking with Cloud Error Reporting
   - Distributed tracing for request flow analysis
4. **Agent Fine-tuning**: Customize agent instructions based on your specific fraud patterns
5. **Fallback Mechanisms**: Implement circuit breakers and retry logic for external API calls
6. **Data Pipeline**: Set up batch processing for model training and validation
7. **A/B Testing**: Deploy multiple agent configurations for performance comparison



  - Backend (packages/api/): Python/FastAPI specific files, virtual environments, cache, test coverage
  - Frontend (apps/web/): Node modules, build outputs, package manager locks
  - Terraform: State files, variable files, plan outputs, terraform directories
  - Security: API keys, credentials, service accounts, private keys
  - General: OS files, IDE configs, temporary files, logs