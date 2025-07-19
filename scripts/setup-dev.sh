#!/bin/bash
# Development environment setup script

echo "🔧 Setting up NeoKPI development environment..."

# Configure git hooks (always safe to run)
echo "📋 Configuring git hooks..."
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

# Test that everything works
echo "📝 Testing documentation generation..."
if npm run docs:update > /dev/null 2>&1; then
    echo "✅ Documentation generation works"
else
    echo "❌ Documentation generation failed - check your setup"
    exit 1
fi

echo ""
echo "🎉 Setup complete! Try making a commit to test the pre-commit hook."
