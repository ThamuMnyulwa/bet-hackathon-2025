#!/bin/bash
# Development script to run the FastAPI application

echo "Starting FastAPI development server..."
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000