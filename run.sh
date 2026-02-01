#!/bin/bash

# Kingdom Ruins - Clean Run Script
# This script installs dependencies and starts the development server

set -e  # Exit on error

echo "🎮 Kingdom Ruins - Starting Clean Game..."
echo ""

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Check if node_modules exists, if so remove it for a clean install
if [ -d "node_modules" ]; then
    echo "🧹 Cleaning existing node_modules..."
    rm -rf node_modules
fi

# Check if package-lock.json exists, remove it for a clean install
if [ -f "package-lock.json" ]; then
    echo "🧹 Cleaning package-lock.json..."
    rm -f package-lock.json
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

echo ""
echo "✅ Dependencies installed successfully!"
echo ""
echo "🚀 Starting development server..."
echo "   Open your browser to the URL shown below"
echo ""

# Start the development server
npm run dev
