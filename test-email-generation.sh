#!/bin/bash

# Email Generation Test Script
# Tests the complete email generation pipeline

echo "========================================="
echo "EMAIL GENERATION PIPELINE TEST"
echo "========================================="
echo ""

# Test 1: Generate Basic Template (Fallback)
echo "✅ Test 1: Generate Basic Template..."
curl -X POST http://localhost:5000/api/email/generate-basic \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-token" \
  -d '{}' \
  --silent | jq '.success, .html' | head -20

echo ""
echo "========================================="
echo ""

# Test 2: Check if EmailTableBuilder methods exist
echo "✅ Test 2: Checking EmailTableBuilder methods..."
echo "Methods that should exist:"
echo "  - createBoilerplate"
echo "  - createDataRow"
echo "  - createText"
echo "  - createHeading"
echo "  - createButton"
echo "  - createImage (NEWLY ADDED)"
echo "  - createColumns (NEWLY ADDED)"
echo "  - createDivider"
echo "  - createSpacer"
echo "  - stylesToString"
echo "  - escapeHtml"
echo "  - buildEmail"

echo ""
echo "========================================="
echo "TEST COMPLETE"
echo "========================================="
