#!/bin/bash
set -e

echo "=== Claude Log Converter Setup ==="
echo ""

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "Error: Python 3 is required but not installed."
    exit 1
fi

PYTHON_VERSION=$(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
echo "Found Python $PYTHON_VERSION"

# Check Node
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is required but not installed."
    exit 1
fi

NODE_VERSION=$(node --version)
echo "Found Node.js $NODE_VERSION"

# Create virtual environment
echo ""
echo "Creating Python virtual environment..."
python3 -m venv .venv
source .venv/bin/activate

# Install Python dependencies
echo "Installing Python dependencies..."
pip install -q -r requirements.txt

# Install and build frontend
echo "Installing frontend dependencies..."
cd frontend
npm install --silent
echo "Building frontend..."
npm run build
cd ..

echo ""
echo "============================================"
echo "Setup complete!"
echo ""
echo "To start the application:"
echo "  source .venv/bin/activate"
echo "  python run.py"
echo ""
echo "Then open http://localhost:8000"
echo "============================================"
