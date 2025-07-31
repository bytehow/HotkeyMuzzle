// Popup script for HotkeyMuzzle
console.log('HotkeyMuzzle popup loaded');

// DOM elements
const statusDiv = document.getElementById('status');
const statusText = document.getElementById('status-text');
const toggleBtn = document.getElementById('toggle-btn');
const optionsLink = document.getElementById('options-link');

// State
let isBlocking = false;

// Initialize popup
init();

async function init() {
    // Get current blocking state
    try {
        const response = await chrome.runtime.sendMessage({ type: 'GET_BLOCKING_STATE' });
        if (response) {
            isBlocking = response.isBlocking;
            updateUI();
        }
    } catch (error) {
        console.error('Failed to get blocking state:', error);
        statusText.textContent = 'Error loading state';
    }
    
    // Set up event listeners
    toggleBtn.addEventListener('click', toggleBlocking);
    optionsLink.addEventListener('click', openOptions);
    
    // Listen for state changes from background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        console.log('Popup received message:', message);
        
        if (message.type === 'BLOCKING_STATE_CHANGED') {
            isBlocking = message.isBlocking;
            updateUI();
            sendResponse({ success: true });
        }
        
        return true; // Keep message channel open
    });
}

// Update UI based on blocking state
function updateUI() {
    if (isBlocking) {
        statusDiv.className = 'status active';
        statusText.textContent = '🔴 Shortcuts Blocked';
        toggleBtn.textContent = 'Disable Blocking';
        toggleBtn.className = 'toggle-btn disable';
    } else {
        statusDiv.className = 'status inactive';
        statusText.textContent = '🟢 Shortcuts Enabled';
        toggleBtn.textContent = 'Enable Blocking';
        toggleBtn.className = 'toggle-btn enable';
    }
}

// Toggle blocking state
async function toggleBlocking() {
    try {
        toggleBtn.disabled = true;
        toggleBtn.textContent = 'Toggling...';
        
        const response = await chrome.runtime.sendMessage({ type: 'TOGGLE_BLOCKING' });
        if (response && response.success) {
            isBlocking = response.isBlocking;
            updateUI();
        } else {
            console.error('Failed to toggle blocking:', response);
            statusText.textContent = 'Error toggling';
        }
    } catch (error) {
        console.error('Failed to send toggle message:', error);
        statusText.textContent = 'Error toggling';
    } finally {
        toggleBtn.disabled = false;
    }
}

// Open options page
function openOptions(event) {
    event.preventDefault();
    chrome.runtime.openOptionsPage();
    window.close();
}
