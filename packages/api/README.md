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

### Installation

Install dependencies using uv:

```bash
uv pip install -e .
```

### Usage

1. Run the client app to see the demo in action:

```bash
python client_app.py
```

2. Or test just the TransUnion connector:

```bash
python transunion_connector.py
```

3. The system processes each transaction through the agent architecture and provides a fraud risk assessment with a decision (APPROVE, REVIEW, or BLOCK).

## Project Structure

- `fraud_detection_agents.py` - Core implementation of the multi-agent architecture
- `transunion_connector.py` - Integration with TransUnion for carrier data
- `client_app.py` - Sample application using the fraud detection system
- `data/raw/` - Sample TransUnion data for testing

## Example Transaction Flow

1. Client application submits a transaction
2. Risk Assessment Agent enriches the transaction with carrier data from TransUnion
3. Agent calls SIM Intelligence, Geographic Intelligence, and Device Trust tools in parallel
4. Final Risk Decision Tool synthesizes all tool outputs using weighted sum algorithm
5. System returns a decision with explanation and risk score
6. Client application takes action based on the decision

## Configuration

The Risk Assessment Agent and its tools can be configured by modifying their instructions and model parameters in `fraud_detection_agents.py`.

## Advanced Usage

For production deployments, consider:

1. Replacing the sample TransUnion data with real API integration
2. Implementing caching for API responses
3. Adding monitoring and observability
4. Fine-tuning agent instructions for your specific use case
5. Implementing fallback mechanisms for robustness



  - Backend (packages/api/): Python/FastAPI specific files, virtual environments, cache, test coverage
  - Frontend (apps/web/): Node modules, build outputs, package manager locks
  - Terraform: State files, variable files, plan outputs, terraform directories
  - Security: API keys, credentials, service accounts, private keys
  - General: OS files, IDE configs, temporary files, logs