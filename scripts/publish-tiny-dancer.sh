#!/bin/bash
set -e

# Tiny Dancer Crates Publishing Script
# =====================================
# This script publishes the ruvector-tiny-dancer crates to crates.io
# in the correct dependency order.

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Check if API key is set
if [ -z "$CRATES_API_KEY" ] || [ "$CRATES_API_KEY" = "your-crates-io-api-token-here" ]; then
    echo -e "${RED}ERROR: CRATES_API_KEY not set in .env file${NC}"
    echo -e "${YELLOW}Please:"
    echo "  1. Visit https://crates.io/me"
    echo "  2. Generate a new API token"
    echo "  3. Update CRATES_API_KEY in .env file${NC}"
    exit 1
fi

# Function to print section headers
print_header() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

# Function to publish a crate
publish_crate() {
    local crate_path=$1
    local crate_name=$(basename $crate_path)

    print_header "Publishing $crate_name"

    cd "$crate_path"

    # Check if crate is already published at this version
    local current_version=$(cargo metadata --no-deps --format-version 1 | jq -r '.packages[0].version')
    echo -e "${YELLOW}Current version: $current_version${NC}"

    # Dry run first
    echo -e "${YELLOW}Running dry-run...${NC}"
    if cargo publish --dry-run --token "$CRATES_API_KEY"; then
        echo -e "${GREEN}✓ Dry-run successful${NC}"
    else
        echo -e "${RED}✗ Dry-run failed${NC}"
        exit 1
    fi

    # Ask for confirmation
    read -p "Publish $crate_name v$current_version to crates.io? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Publishing...${NC}"
        if cargo publish --token "$CRATES_API_KEY"; then
            echo -e "${GREEN}✓ Published $crate_name v$current_version${NC}"
            # Wait a bit for crates.io to process
            echo -e "${YELLOW}Waiting 30 seconds for crates.io to process...${NC}"
            sleep 30
        else
            echo -e "${RED}✗ Failed to publish $crate_name${NC}"
            exit 1
        fi
    else
        echo -e "${YELLOW}Skipped $crate_name${NC}"
    fi

    cd - > /dev/null
}

# Main script
print_header "Ruvector Tiny Dancer Publishing"

echo -e "${YELLOW}This script will publish the following crates:${NC}"
echo "  1. ruvector-tiny-dancer-core (base library)"
echo "  2. ruvector-tiny-dancer-wasm (WASM bindings)"
echo "  3. ruvector-tiny-dancer-node (Node.js bindings)"
echo ""
echo -e "${YELLOW}Important:${NC}"
echo "  - Crates will be published in dependency order"
echo "  - Each crate will do a dry-run first"
echo "  - You'll be asked to confirm each publication"
echo "  - Press Ctrl+C at any time to abort"
echo ""

read -p "Continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Aborted${NC}"
    exit 0
fi

# Navigate to project root
cd "$(dirname "$0")/.."

# Publish in dependency order
print_header "Step 1/3: Core Library"
publish_crate "crates/ruvector-tiny-dancer-core"

print_header "Step 2/3: WASM Bindings"
publish_crate "crates/ruvector-tiny-dancer-wasm"

print_header "Step 3/3: Node.js Bindings"
publish_crate "crates/ruvector-tiny-dancer-node"

print_header "Publishing Complete! 🎉"
echo -e "${GREEN}All crates have been published successfully!${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Verify at https://crates.io/crates/ruvector-tiny-dancer-core"
echo "  2. Check documentation at https://docs.rs/ruvector-tiny-dancer-core"
echo "  3. Update GitHub release notes"
echo ""
