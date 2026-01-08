"""
Centralized error handling and custom exceptions.
"""
from __future__ import annotations

from typing import Any, Dict, Optional

from fastapi import HTTPException, Request, status
from fastapi.responses import JSONResponse
from pydantic import ValidationError


class APIError(Exception):
    """Base exception for API errors."""
    
    def __init__(
        self,
        message: str,
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        details: Optional[Dict[str, Any]] = None
    ):
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)


class ValidationError(APIError):
    """Validation error exception."""
    
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            status_code=status.HTTP_400_BAD_REQUEST,
            details=details
        )


class NotFoundError(APIError):
    """Resource not found exception."""
    
    def __init__(self, message: str = "Resource not found"):
        super().__init__(
            message=message,
            status_code=status.HTTP_404_NOT_FOUND
        )


class OptimizationError(APIError):
    """Optimization solver error exception."""
    
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            details=details
        )


class DataLoadError(APIError):
    """Data loading error exception."""
    
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            details=details
        )


async def api_error_handler(request: Request, exc: APIError) -> JSONResponse:
    """Global handler for APIError exceptions."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": {
                "message": exc.message,
                "code": exc.status_code,
                "details": exc.details
            }
        }
    )


async def validation_error_handler(request: Request, exc: ValidationError) -> JSONResponse:
    """Global handler for Pydantic validation errors."""
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "error": {
                "message": "Validation failed",
                "code": status.HTTP_422_UNPROCESSABLE_ENTITY,
                "details": exc.errors()
            }
        }
    )


async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """Global handler for HTTPException."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": {
                "message": exc.detail,
                "code": exc.status_code
            }
        }
    )


async def general_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Global handler for unexpected exceptions."""
    # In production, don't expose internal error details
    from .config import get_settings
    settings = get_settings()
    
    if settings.is_production:
        message = "An internal server error occurred"
        details = {}
    else:
        message = str(exc)
        details = {"type": type(exc).__name__}
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "error": {
                "message": message,
                "code": status.HTTP_500_INTERNAL_SERVER_ERROR,
                "details": details
            }
        }
    )
