"""
Health check endpoints.
"""

from fastapi import APIRouter
from typing import Dict, Any

router = APIRouter()

@router.get("/health")
async def health_check() -> Dict[str, Any]:
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "sim-swap-risk-engine",
        "version": "1.0.0"
    }