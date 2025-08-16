# Use the official Python 3.13 slim image with uv pre-installed
FROM ghcr.io/astral-sh/uv:python3.13-bookworm-slim

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8080

# Set the working directory
WORKDIR /app

# Copy pyproject.toml and uv.lock for dependency installation
COPY pyproject.toml uv.lock ./

# Install dependencies directly using pip
RUN pip install fastapi uvicorn[standard] google-adk google-generativeai structlog pandas httpx

# Copy the rest of the application
COPY . .

# Copy data files
COPY data/raw/*.csv data/raw/

# Set up environment for running the application
ENV PYTHONPATH=/app

# Expose the port the app runs on
EXPOSE 8080

# Command to run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]