#!/bin/bash

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║     TinyPNG-Level Image Optimizer - API Test Suite           ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

API_URL="http://localhost:5000/api/audit/image-optimizer"

# Check if server is running
echo "🔍 Checking if server is running..."
if ! curl -s http://localhost:5000/health > /dev/null; then
    echo "❌ Server is not running on port 5000"
    echo "   Please start the backend with: cd backend && npm run dev"
    exit 1
fi
echo "✅ Server is running"
echo ""

# Create test images directory
mkdir -p test-images
echo "📁 Test images directory ready"
echo ""

# Test 1: Error - No files
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 1: Error Handling - No Files Uploaded"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s -X POST $API_URL | jq '.'
echo ""

# Test 2: Check if user has test images
if [ ! -f "test-images/test-image-1.jpg" ]; then
    echo "⚠️  No test images found in test-images/ directory"
    echo ""
    echo "📝 To run full tests, add test images:"
    echo "   1. Create test-images/ directory"
    echo "   2. Add some JPG/PNG files named:"
    echo "      - test-image-1.jpg"
    echo "      - test-image-2.png"
    echo "      - test-image-3.jpg"
    echo ""
    echo "Or use your own images and modify this script."
    echo ""
    exit 0
fi

# Test 2: Single image
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 2: Single Image Upload"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
RESPONSE=$(curl -s -X POST $API_URL \
  -F "images=@test-images/test-image-1.jpg")

echo "$RESPONSE" | jq '.'

# Extract ZIP URL if successful
ZIP_URL=$(echo "$RESPONSE" | jq -r '.zipDownloadUrl // empty')
if [ ! -z "$ZIP_URL" ]; then
    echo ""
    echo "📦 ZIP Download URL: http://localhost:5000$ZIP_URL"
    echo ""
    
    # Show savings
    ORIGINAL=$(echo "$RESPONSE" | jq -r '.totalOriginalSizeKB')
    OPTIMIZED=$(echo "$RESPONSE" | jq -r '.totalOptimizedSizeKB')
    SAVED=$(echo "$RESPONSE" | jq -r '.totalSavedKB')
    PERCENT=$(echo "$RESPONSE" | jq -r '.averageReductionPercent')
    
    echo "💰 Optimization Results:"
    echo "   Original:  $ORIGINAL KB"
    echo "   Optimized: $OPTIMIZED KB"
    echo "   Saved:     $SAVED KB ($PERCENT% reduction)"
fi
echo ""

# Test 3: Multiple images
if [ -f "test-images/test-image-2.png" ] && [ -f "test-images/test-image-3.jpg" ]; then
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Test 3: Multiple Images Upload (Batch)"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    RESPONSE=$(curl -s -X POST $API_URL \
      -F "images=@test-images/test-image-1.jpg" \
      -F "images=@test-images/test-image-2.png" \
      -F "images=@test-images/test-image-3.jpg")
    
    echo "$RESPONSE" | jq '.'
    
    # Extract stats
    ZIP_URL=$(echo "$RESPONSE" | jq -r '.zipDownloadUrl // empty')
    if [ ! -z "$ZIP_URL" ]; then
        echo ""
        echo "📦 Batch ZIP Download: http://localhost:5000$ZIP_URL"
        
        TOTAL_IMAGES=$(echo "$RESPONSE" | jq -r '.totalImages')
        SUCCESSFUL=$(echo "$RESPONSE" | jq -r '.successfulImages')
        SAVED=$(echo "$RESPONSE" | jq -r '.totalSavedKB')
        PERCENT=$(echo "$RESPONSE" | jq -r '.averageReductionPercent')
        
        echo ""
        echo "📊 Batch Statistics:"
        echo "   Total Images: $TOTAL_IMAGES"
        echo "   Successful:   $SUCCESSFUL"
        echo "   Total Saved:  $SAVED KB"
        echo "   Avg. Reduction: $PERCENT%"
    fi
    echo ""
fi

# Test 4: Show individual file paths
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 4: Individual Format Downloads"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ ! -z "$RESPONSE" ]; then
    echo "$RESPONSE" | jq -r '.images[0] | "
File: \(.fileName)
JPG:  http://localhost:5000\(.optimized.jpg.path) (\(.optimized.jpg.sizeKB) KB, \(.optimized.jpg.reductionPercent)% reduction)
PNG:  http://localhost:5000\(.optimized.png.path) (\(.optimized.png.sizeKB) KB, \(.optimized.png.reductionPercent)% reduction)
WebP: http://localhost:5000\(.optimized.webp.path) (\(.optimized.webp.sizeKB) KB, \(.optimized.webp.reductionPercent)% reduction)
AVIF: http://localhost:5000\(.optimized.avif.path) (\(.optimized.avif.sizeKB) KB, \(.optimized.avif.reductionPercent)% reduction)
Best: \(.bestFormat | ascii_upcase) (\(.totalReductionPercent)% total reduction)
"'
fi

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                    ✅ Testing Complete!                       ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""
echo "💡 Next Steps:"
echo "   1. Visit http://localhost:3000/image-optimizer"
echo "   2. Upload images through the UI"
echo "   3. Download optimized files"
echo ""
