#!/bin/bash
# Verification script to check if git hooks are properly configured

echo "🔍 Verifying git hooks configuration..."
echo ""

# Check if core.hooksPath is set
HOOKS_PATH=$(git config --get core.hooksPath)
if [ "$HOOKS_PATH" = ".githooks" ]; then
    echo "✅ Git hooks path configured: $HOOKS_PATH"
else
    echo "❌ Git hooks path not configured!"
    echo "   Run: git config core.hooksPath .githooks"
    exit 1
fi

# Check if .githooks directory exists
if [ -d ".githooks" ]; then
    echo "✅ .githooks directory exists"
else
    echo "❌ .githooks directory missing!"
    exit 1
fi

# Check if pre-commit hook exists and is executable
if [ -x ".githooks/pre-commit" ]; then
    echo "✅ pre-commit hook exists and is executable"
else
    echo "❌ pre-commit hook missing or not executable!"
    echo "   Run: chmod +x .githooks/pre-commit"
    exit 1
fi

# Check if npm scripts are available
if command -v npm &> /dev/null; then
    # Check package.json directly instead of npm run to avoid error logs
    if grep -q '"docs:update"' package.json; then
        echo "✅ docs:update script available"
    else
        echo "❌ docs:update script missing from package.json!"
        exit 1
    fi
else
    echo "⚠️  npm not available, skipping script check"
fi

# Test documentation generation
echo ""
echo "🧪 Testing documentation generation..."
if npm run docs:update &> /dev/null; then
    echo "✅ Documentation generation works"
else
    echo "❌ Documentation generation failed!"
    exit 1
fi

echo ""
echo "🎉 All checks passed! Git hooks are properly configured."
echo ""
echo "📋 Summary:"
echo "   • Pre-commit hook will automatically update README.md"
echo "   • Documentation stays in sync with config changes"
echo "   • Run 'npm run setup' to reconfigure if needed"
echo ""
