#!/bin/bash

# HotkeyMuzzle Extension Test Script
# Starts Chrome in incognito mode with the extension loaded

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔇 HotkeyMuzzle Extension Test Script${NC}"
echo "============================================"

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
EXTENSION_DIR="$SCRIPT_DIR"

echo -e "${YELLOW}Extension directory:${NC} $EXTENSION_DIR"

# Check if manifest.json exists
if [ ! -f "$EXTENSION_DIR/manifest.json" ]; then
    echo -e "${RED}❌ Error: manifest.json not found in $EXTENSION_DIR${NC}"
    echo "Make sure you're running this script from the HotkeyMuzzle directory"
    exit 1
fi

echo -e "${GREEN}✅ Found manifest.json${NC}"

# Check if Chrome is installed (macOS paths)
CHROME_PATHS=(
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    "/Applications/Chrome.app/Contents/MacOS/Chrome"
    "$(which google-chrome)"
    "$(which chrome)"
)

CHROME_EXECUTABLE=""
for path in "${CHROME_PATHS[@]}"; do
    if [ -x "$path" ]; then
        CHROME_EXECUTABLE="$path"
        break
    fi
done

if [ -z "$CHROME_EXECUTABLE" ]; then
    echo -e "${RED}❌ Error: Chrome not found${NC}"
    echo "Please install Google Chrome or update the script with your Chrome path"
    exit 1
fi

echo -e "${GREEN}✅ Found Chrome:${NC} $CHROME_EXECUTABLE"

# Create a temporary user data directory for testing
TEMP_USER_DATA="/tmp/hotkeyMuzzle-test-$(date +%s)"
echo -e "${YELLOW}Creating temporary Chrome profile:${NC} $TEMP_USER_DATA"

# Chrome flags for development
CHROME_FLAGS=(
    "--user-data-dir=$TEMP_USER_DATA"
    "--load-extension=$EXTENSION_DIR"
    "--disable-extensions-except=$EXTENSION_DIR"
    "--disable-web-security"
    "--disable-features=VizDisplayCompositor"
    "--enable-features=ExtensionToolbarMenu"
    "--auto-pin-extension"
    "--no-first-run"
    "--no-default-browser-check"
    "--disable-default-apps"
    "--new-window"
    "https://youtube.com"
)

echo -e "${BLUE}Starting Chrome with HotkeyMuzzle extension...${NC}"
echo -e "${YELLOW}Chrome flags:${NC}"
printf '%s\n' "${CHROME_FLAGS[@]}"
echo ""

# Start Chrome
echo -e "${GREEN}🚀 Launching Chrome with extension loaded in isolated profile${NC}"
echo ""
echo -e "${YELLOW}Test Instructions:${NC}"
echo "1. The extension should appear in the extensions toolbar"
echo "2. YouTube should load automatically for testing"
echo "3. Click the extension icon to toggle shortcut blocking"
echo "4. Try shortcuts like Cmd+N (should be blocked when active)"
echo "5. Try whitelisted shortcuts like Cmd+T (should always work)"
echo "6. Use YouTube keyboard shortcuts to test (space, arrow keys, etc.)"
echo "7. Right-click the extension icon → Options to configure"
echo ""

# Launch Chrome and capture the process ID
"$CHROME_EXECUTABLE" "${CHROME_FLAGS[@]}" &
CHROME_PID=$!

echo -e "${GREEN}✅ Chrome started (PID: $CHROME_PID)${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop Chrome and clean up${NC}"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}🧹 Cleaning up...${NC}"
    
    # Kill Chrome process
    if kill -0 $CHROME_PID 2>/dev/null; then
        echo -e "${YELLOW}Stopping Chrome (PID: $CHROME_PID)${NC}"
        kill $CHROME_PID
        sleep 2
        
        # Force kill if still running
        if kill -0 $CHROME_PID 2>/dev/null; then
            echo -e "${YELLOW}Force stopping Chrome${NC}"
            kill -9 $CHROME_PID
        fi
    fi
    
    # Remove temporary user data directory
    if [ -d "$TEMP_USER_DATA" ]; then
        echo -e "${YELLOW}Removing temporary profile: $TEMP_USER_DATA${NC}"
        rm -rf "$TEMP_USER_DATA"
    fi
    
    echo -e "${GREEN}✅ Cleanup complete${NC}"
}

# Set trap to cleanup on script exit
trap cleanup EXIT INT TERM

# Wait for Chrome to exit
wait $CHROME_PID 2>/dev/null

echo -e "${BLUE}Chrome has exited${NC}"
