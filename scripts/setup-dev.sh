#!/bin/bash
# Development environment setup script

echo "🔧 Setting up NeoKPI development environment..."

# Check if Node.js and npm are installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed"
    echo ""
    echo "Please install Node.js from https://nodejs.org/ or use:"
    echo "  macOS: brew install node"
    echo "  Ubuntu/Debian: sudo apt install nodejs npm"
    echo "  Windows: Download from https://nodejs.org/"
    echo ""
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed"
    echo "Please install npm (usually comes with Node.js)"
    echo "Visit https://nodejs.org/ for installation instructions"
    exit 1
fi

echo "✅ Node.js $(node --version) and npm $(npm --version) found"

# Configure git hooks; for code formatting on commit
git config core.hooksPath .githooks
chmod +x .githooks/* 2>/dev/null || true
echo "✅ Git hooks configured"

# Install dependencies if not already installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing npm dependencies..."
    npm install
else
    echo "✅ Dependencies already installed"
fi

# # Removed the jsdoc generation.

# echo "📝 Testing documentation generation..."
# if npm run docs:update > /dev/null 2>&1; then
#     echo "✅ Documentation generation works"
# else
#     echo "❌ Documentation generation failed - check your setup"
#     exit 1
# fi

# echo ""
echo "🎉 Setup complete! Try making a commit to test the pre-commit hook."
