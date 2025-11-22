#!/bin/bash
set -e

# GitHub Workflows Validation Script
# Validates all workflow files for syntax and best practices

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  GitHub Workflows Validation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

WORKFLOWS_DIR=".github/workflows"
VALIDATION_PASSED=true

# Check if workflows directory exists
if [ ! -d "$WORKFLOWS_DIR" ]; then
    echo "❌ Error: $WORKFLOWS_DIR directory not found"
    exit 1
fi

# Count workflows
WORKFLOW_COUNT=$(find "$WORKFLOWS_DIR" -name "*.yml" -o -name "*.yaml" | wc -l)
echo "📋 Found $WORKFLOW_COUNT workflow files"
echo ""

# Validate each workflow
for workflow in "$WORKFLOWS_DIR"/*.yml "$WORKFLOWS_DIR"/*.yaml; do
    if [ ! -f "$workflow" ]; then
        continue
    fi

    WORKFLOW_NAME=$(basename "$workflow")
    echo "🔍 Validating: $WORKFLOW_NAME"

    # Check YAML syntax with Python
    if command -v python3 &> /dev/null; then
        if python3 -c "import yaml; yaml.safe_load(open('$workflow'))" 2>/dev/null; then
            echo "  ✅ YAML syntax valid"
        else
            echo "  ❌ YAML syntax error"
            VALIDATION_PASSED=false
            continue
        fi
    else
        echo "  ⚠️  Python3 not found, skipping YAML validation"
    fi

    # Check required fields
    if grep -q "^name:" "$workflow"; then
        echo "  ✅ Has 'name' field"
    else
        echo "  ❌ Missing 'name' field"
        VALIDATION_PASSED=false
    fi

    if grep -q "^on:" "$workflow"; then
        echo "  ✅ Has 'on' trigger"
    else
        echo "  ❌ Missing 'on' trigger"
        VALIDATION_PASSED=false
    fi

    if grep -q "^jobs:" "$workflow"; then
        echo "  ✅ Has 'jobs' section"
    else
        echo "  ❌ Missing 'jobs' section"
        VALIDATION_PASSED=false
    fi

    # Check for best practices
    if grep -q "uses: actions/checkout@v4" "$workflow"; then
        echo "  ✅ Using latest checkout action"
    else
        echo "  ⚠️  Not using checkout@v4 (may be intentional)"
    fi

    # Check for Tiny Dancer specific patterns
    if [[ "$WORKFLOW_NAME" == *"tiny-dancer"* ]] || [[ "$WORKFLOW_NAME" == *"intelligent"* ]]; then
        if grep -q "confidence" "$workflow"; then
            echo "  ✅ Implements confidence scoring"
        else
            echo "  ⚠️  No confidence scoring found"
        fi

        if grep -q "route\|routing" "$workflow"; then
            echo "  ✅ Implements neural routing"
        else
            echo "  ⚠️  No routing logic found"
        fi
    fi

    echo ""
done

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ "$VALIDATION_PASSED" = true ]; then
    echo "✅ All workflows passed validation!"
    echo ""
    echo "Next steps:"
    echo "  1. Test locally with 'act' (https://github.com/nektos/act)"
    echo "  2. Commit workflows to repository"
    echo "  3. Monitor first runs in GitHub Actions"
    exit 0
else
    echo "❌ Some workflows failed validation"
    echo ""
    echo "Please fix the issues above before deploying"
    exit 1
fi
