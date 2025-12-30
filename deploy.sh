#!/bin/bash
# =============================================================================
# Fayetteville Central Calendar - Deployment Script
# =============================================================================
# This script deploys the API Worker and/or Web Frontend to Cloudflare.
#
# Usage:
#   ./deploy.sh          # Deploy both API and Web (default)
#   ./deploy.sh --all    # Deploy both API and Web
#   ./deploy.sh --api    # Deploy only the API Worker
#   ./deploy.sh --web    # Deploy only the Web Frontend
#
# Components:
#   API Worker:   src/index.ts → downtown-guide.wemea-5ahhf.workers.dev
#   Web Frontend: web/         → fayetteville-events.pages.dev
#
# =============================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# =============================================================================
# Parse Arguments
# =============================================================================
DEPLOY_API=false
DEPLOY_WEB=false

# Default: deploy both if no args provided
if [ $# -eq 0 ]; then
    DEPLOY_API=true
    DEPLOY_WEB=true
fi

for arg in "$@"; do
    case $arg in
        --api)
            DEPLOY_API=true
            ;;
        --web)
            DEPLOY_WEB=true
            ;;
        --all)
            DEPLOY_API=true
            DEPLOY_WEB=true
            ;;
        --help|-h)
            echo "Fayetteville Central Calendar - Deployment Script"
            echo ""
            echo "Usage:"
            echo "  ./deploy.sh          Deploy both API and Web (default)"
            echo "  ./deploy.sh --all    Deploy both API and Web"
            echo "  ./deploy.sh --api    Deploy only the API Worker"
            echo "  ./deploy.sh --web    Deploy only the Web Frontend"
            echo "  ./deploy.sh --help   Show this help message"
            echo ""
            exit 0
            ;;
        *)
            echo "${RED}Unknown option: $arg${NC}"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

echo ""
echo "${BLUE}🌸 Fayetteville Central Calendar - Deployment${NC}"
echo "=============================================="
echo ""

# =============================================================================
# Verify Directory
# =============================================================================
EXPECTED_DIR="Downtown-Guide"
CURRENT_DIR=$(basename $(pwd))

if [ "$CURRENT_DIR" != "$EXPECTED_DIR" ]; then
    echo "${RED}❌ ERROR: Wrong directory!${NC}"
    echo ""
    echo "   You are in:  ${YELLOW}$CURRENT_DIR${NC}"
    echo "   Expected:    ${GREEN}$EXPECTED_DIR${NC}"
    echo ""
    echo "   Run: ${GREEN}cd /Users/sac/Git/Downtown-Guide${NC}"
    echo ""
    exit 1
fi

echo "${GREEN}✅ Directory verified: $CURRENT_DIR${NC}"

# Show what will be deployed
echo ""
echo "Deployment targets:"
if [ "$DEPLOY_API" = true ]; then
    echo "  ${BLUE}→${NC} API Worker (downtown-guide.wemea-5ahhf.workers.dev)"
fi
if [ "$DEPLOY_WEB" = true ]; then
    echo "  ${BLUE}→${NC} Web Frontend (fayetteville-events.pages.dev)"
fi
echo ""

# =============================================================================
# Deploy API Worker
# =============================================================================
if [ "$DEPLOY_API" = true ]; then
    echo "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo "${YELLOW}Deploying API Worker...${NC}"
    echo "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    # Verify wrangler.toml exists
    if [ ! -f "wrangler.toml" ]; then
        echo "${RED}❌ ERROR: wrangler.toml not found!${NC}"
        exit 1
    fi

    # Verify src/index.ts exists
    if [ ! -f "src/index.ts" ]; then
        echo "${RED}❌ ERROR: src/index.ts not found!${NC}"
        exit 1
    fi

    echo "Deploying Worker..."
    npx wrangler deploy

    if [ $? -ne 0 ]; then
        echo "${RED}❌ API deployment failed!${NC}"
        exit 1
    fi

    echo ""
    echo "${GREEN}✅ API Worker deployed!${NC}"
    echo "   URL: https://downtown-guide.wemea-5ahhf.workers.dev"
    echo ""
fi

# =============================================================================
# Deploy Web Frontend
# =============================================================================
if [ "$DEPLOY_WEB" = true ]; then
    echo "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo "${YELLOW}Deploying Web Frontend...${NC}"
    echo "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    # Verify web directory exists
    if [ ! -d "web" ]; then
        echo "${RED}❌ ERROR: web/ directory not found!${NC}"
        exit 1
    fi

    cd web

    # Step 1: Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        echo "Installing dependencies..."
        npm install
    fi

    # Step 2: Build frontend
    echo "Building frontend..."
    npm run build

    if [ $? -ne 0 ]; then
        echo "${RED}❌ Build failed!${NC}"
        cd ..
        exit 1
    fi
    echo "${GREEN}✅ Build complete${NC}"

    # Step 3: Verify dist/index.html has bundled assets
    echo "Verifying build..."
    if grep -q 'src="/src/main.tsx"' dist/index.html 2>/dev/null; then
        echo "${RED}❌ ERROR: dist/index.html has development script!${NC}"
        cd ..
        exit 1
    fi

    if grep -q 'src="/assets/index-' dist/index.html 2>/dev/null; then
        echo "${GREEN}✅ Build verified - has bundled assets${NC}"
    else
        echo "${YELLOW}⚠️  Warning: Could not verify bundled assets${NC}"
    fi

    # Step 4: Verify _redirects exists for SPA routing
    if [ ! -f "dist/_redirects" ]; then
        echo "Adding _redirects for SPA routing..."
        echo "/* /index.html 200" > dist/_redirects
    fi

    # Step 5: Deploy to Cloudflare Pages
    echo "Deploying to Cloudflare Pages..."
    npx wrangler pages deploy dist --project-name=fayetteville-events --commit-dirty=true

    if [ $? -ne 0 ]; then
        echo "${RED}❌ Web deployment failed!${NC}"
        cd ..
        exit 1
    fi

    cd ..

    echo ""
    echo "${GREEN}✅ Web Frontend deployed!${NC}"
    echo "   URL: https://fayetteville-events.pages.dev"
    echo ""
fi

# =============================================================================
# Summary
# =============================================================================
echo "${GREEN}=============================================="
echo "🌸 Deployment Complete!"
echo "==============================================${NC}"
echo ""
if [ "$DEPLOY_API" = true ]; then
    echo "API:  https://downtown-guide.wemea-5ahhf.workers.dev"
fi
if [ "$DEPLOY_WEB" = true ]; then
    echo "Web:  https://fayetteville-events.pages.dev"
fi
echo ""
echo "iCal: https://downtown-guide.wemea-5ahhf.workers.dev/cal/events.ics"
echo ""
