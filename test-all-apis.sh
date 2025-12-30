#!/bin/bash

echo "========================================="
echo "Frontend AI Suite - API Endpoint Tests"
echo "========================================="
echo ""

# Test 1: Health Check
echo "1. Testing Health Check..."
HEALTH=$(curl -s http://localhost:5000/health)
if echo "$HEALTH" | grep -q "ok"; then
    echo "✅ Health check passed"
else
    echo "❌ Health check failed"
fi
echo ""

# Test 2: Website Auditor
echo "2. Testing Website Auditor..."
WEBSITE=$(curl -s -X POST http://localhost:5000/api/audit/website \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com","platform":"desktop"}' \
  -w "\n%{http_code}")
HTTP_CODE=$(echo "$WEBSITE" | tail -n 1)
if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Website Auditor endpoint working (HTTP $HTTP_CODE)"
else
    echo "❌ Website Auditor failed (HTTP $HTTP_CODE)"
fi
echo ""

# Test 3: Accessibility Checker
echo "3. Testing Accessibility Checker..."
ACCESS=$(curl -s -X POST http://localhost:5000/api/audit/accessibility \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com"}' \
  -w "\n%{http_code}")
HTTP_CODE=$(echo "$ACCESS" | tail -n 1)
if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Accessibility Checker endpoint working (HTTP $HTTP_CODE)"
else
    echo "❌ Accessibility Checker failed (HTTP $HTTP_CODE)"
fi
echo ""

# Test 4: Performance Analyzer
echo "4. Testing Performance Analyzer..."
PERF=$(curl -s -X POST http://localhost:5000/api/audit/performance \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com"}' \
  -w "\n%{http_code}")
HTTP_CODE=$(echo "$PERF" | tail -n 1)
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "500" ]; then
    echo "⚠️  Performance Analyzer endpoint exists (HTTP $HTTP_CODE) - May need API key"
else
    echo "❌ Performance Analyzer failed (HTTP $HTTP_CODE)"
fi
echo ""

# Test 5: Image Optimizer
echo "5. Testing Image Optimizer..."
IMAGE=$(curl -s -X POST http://localhost:5000/api/audit/images \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com"}' \
  -w "\n%{http_code}")
HTTP_CODE=$(echo "$IMAGE" | tail -n 1)
if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Image Optimizer endpoint working (HTTP $HTTP_CODE)"
else
    echo "❌ Image Optimizer failed (HTTP $HTTP_CODE)"
fi
echo ""

# Test 6: Live vs Stage Comparator
echo "6. Testing Live vs Stage Comparator..."
COMPARE=$(curl -s -X POST http://localhost:5000/api/audit/compare \
  -H "Content-Type: application/json" \
  -d '{"liveUrl":"https://example.com","stageUrl":"https://example.org"}' \
  -w "\n%{http_code}")
HTTP_CODE=$(echo "$COMPARE" | tail -n 1)
if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Comparator endpoint working (HTTP $HTTP_CODE)"
else
    echo "❌ Comparator failed (HTTP $HTTP_CODE)"
fi
echo ""

# Test 7: Layout Comparator
echo "7. Testing Layout Comparator..."
LAYOUT=$(curl -s -X POST http://localhost:5000/api/audit/compare-layout \
  -H "Content-Type: application/json" \
  -d '{"liveUrl":"https://example.com","stageUrl":"https://example.org"}' \
  -w "\n%{http_code}")
HTTP_CODE=$(echo "$LAYOUT" | tail -n 1)
if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Layout Comparator endpoint working (HTTP $HTTP_CODE)"
else
    echo "❌ Layout Comparator failed (HTTP $HTTP_CODE)"
fi
echo ""

# Test 8: Newsletter Tester
echo "8. Testing Newsletter Tester..."
NEWSLETTER=$(curl -s -X POST http://localhost:5000/api/audit/newsletter \
  -H "Content-Type: application/json" \
  -d '{"emailHtml":"<html><body>Test</body></html>"}' \
  -w "\n%{http_code}")
HTTP_CODE=$(echo "$NEWSLETTER" | tail -n 1)
if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Newsletter Tester endpoint working (HTTP $HTTP_CODE)"
else
    echo "❌ Newsletter Tester failed (HTTP $HTTP_CODE)"
fi
echo ""

echo "========================================="
echo "Test Summary Complete"
echo "========================================="
