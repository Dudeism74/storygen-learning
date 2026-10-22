#!/bin/bash
# Shared Virtual Environment Setup Script for StoryGen Project
# This creates a single .venv that can be used by all backend folders

echo "🚀 Setting up shared virtual environment for StoryGen project..."

# Check if Python is installed
if ! command -v python3 &> /dev/null || ! python3 -c 'import sys; raise SystemExit(sys.version_info < (3, 12))'; then
    echo "❌ Python 3 is required but not installed. Please install Python 3.12+ first."
    exit 1
fi

# Get the script directory (00_Starting_Here)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "📁 Project root: $PROJECT_ROOT"
echo "📁 Setup directory: $SCRIPT_DIR"

# Create shared virtual environment in project root
VENV_PATH="$PROJECT_ROOT/.venv"
if [ ! -d "$VENV_PATH" ]; then
    echo "📦 Creating shared Python virtual environment at: $VENV_PATH"
    python3 -m venv "$VENV_PATH"
else
    echo "✅ Shared virtual environment already exists at: $VENV_PATH"
fi

# Activate virtual environment
echo "🔧 Activating shared virtual environment..."
source "$VENV_PATH/bin/activate"

# Upgrade pip
echo "⬆️ Upgrading pip..."
pip install --upgrade pip

# Install dependencies from requirements.txt in this folder
echo "📥 Installing dependencies from $SCRIPT_DIR/requirements.txt..."
pip install -r "$SCRIPT_DIR/requirements.txt"

echo ""
echo "🎉 Shared virtual environment setup complete!"
echo ""
echo "📍 Virtual environment location: $VENV_PATH"
echo "📋 Dependencies file: $SCRIPT_DIR/requirements.txt"
echo ""
echo "💡 How to use this shared environment:"
echo ""
echo "   From project root:"
echo "   source .venv/bin/activate"
echo ""
echo "   From any backend folder (e.g., 01a_First_Agent_Ready/backend/):"
echo "   source ../../.venv/bin/activate"
echo ""
echo "   From any subfolder (e.g., 03b_Agent_Evaluation_Done/backend/):"
echo "   source ../../.venv/bin/activate"
echo ""
echo "   To run ADK web interface from any backend folder:"
echo "   source ../../.venv/bin/activate && adk web ."
echo ""
echo "🎯 All backend folders can now use this single virtual environment!"
