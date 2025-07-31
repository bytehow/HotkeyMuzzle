// Content script for HotkeyMuzzle
console.log('HotkeyMuzzle content script loaded');

// State management
let isBlocking = false;

// Settings (will be loaded from storage)
let settings = {
  whitelist: [
    'cmd+a', 'cmd+c', 'cmd+v', 'cmd+t', 'cmd+w', 'cmd+r', 'cmd+l', 
    'cmd+shift+t', 'cmd+shift+n', 'cmd+q'
  ]
};

// Wait for DOM to be ready before initializing
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Also try to initialize immediately and on various other events
init();
window.addEventListener('load', init);
document.addEventListener('readystatechange', init);

async function init() {
  try {
    // Load settings from storage
    const storedSettings = await chrome.storage.sync.get(settings);
    settings = { ...settings, ...storedSettings };
    
    console.log('🔧 Settings loaded:', settings);
    
    // Get initial blocking state
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_BLOCKING_STATE' });
      if (response) {
        isBlocking = response.isBlocking;
      }
    } catch (error) {
      console.log('Could not get initial blocking state:', error);
    }
    
    // Set up keyboard event listeners
    setupKeyboardListeners();
    
    console.log('✅ HotkeyMuzzle content script initialized', { isBlocking });
  } catch (error) {
    console.error('HotkeyMuzzle initialization error:', error);
  }
}

// Set up keyboard event listeners
function setupKeyboardListeners() {
  // Use capture phase to intercept events before they reach the page
  // Add listeners to both document and window for maximum coverage
  document.addEventListener('keydown', handleKeyDown, true);
  document.addEventListener('keyup', handleKeyUp, true);
  window.addEventListener('keydown', handleKeyDown, true);
  window.addEventListener('keyup', handleKeyUp, true);
  
  // Also add listeners for when the page is focused
  document.addEventListener('keydown', handleKeyDown, false);
  document.addEventListener('keyup', handleKeyUp, false);
  
  console.log('Keyboard event listeners set up');
}

// Handle keydown events
function handleKeyDown(event) {
  try {
    const keyCombo = getKeyCombo(event);
    console.log('🎹 Key pressed:', keyCombo, { 
      isBlocking, 
      key: event.key,
      code: event.code,
      metaKey: event.metaKey,
      ctrlKey: event.ctrlKey,
      altKey: event.altKey,
      shiftKey: event.shiftKey
    });
    
    // If blocking is active, check if this shortcut should be blocked
    if (isBlocking && shouldBlockShortcut(keyCombo)) {
      console.log('🚫 Blocking shortcut:', keyCombo);
      
      // Prevent the event from propagating further
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      
      // Also prevent default browser behavior
      if (event.metaKey || event.ctrlKey) {
        event.returnValue = false;
      }
      
      // Notify background script about blocked shortcut
      try {
        chrome.runtime.sendMessage({
          type: 'SHORTCUT_BLOCKED',
          shortcut: keyCombo
        });
      } catch (error) {
        console.log('Could not send blocked shortcut message:', error);
      }
      
      return false;
    }
  } catch (error) {
    console.error('Error in handleKeyDown:', error);
  }
}

// Handle keyup events
function handleKeyUp(event) {
  // Don't interfere with chord detection - let the timeout handle chord reset
  // The original logic was incorrect and was prematurely clearing chord state
}

// Convert keyboard event to string representation
function getKeyCombo(event) {
  const parts = [];
  
  // Add modifiers (macOS style)
  if (event.metaKey) parts.push('cmd');
  if (event.ctrlKey) parts.push('ctrl');
  if (event.altKey) parts.push('alt');
  if (event.shiftKey) parts.push('shift');
  
  // Add the main key
  let key = event.key.toLowerCase();
  
  // Handle special keys
  if (key === ' ') key = 'space';
  else if (key === 'arrowup') key = 'up';
  else if (key === 'arrowdown') key = 'down';
  else if (key === 'arrowleft') key = 'left';
  else if (key === 'arrowright') key = 'right';
  
  // Don't add modifier keys as the main key
  if (!['meta', 'control', 'alt', 'shift'].includes(key)) {
    parts.push(key);
  }
  
  return parts.join('+');
}

// Check if a shortcut should be blocked
function shouldBlockShortcut(keyCombo) {
  // Don't block empty combinations
  if (!keyCombo) {
    return false;
  }
  
  // Don't block if the shortcut is in the whitelist
  if (settings.whitelist && settings.whitelist.includes(keyCombo)) {
    console.log('Shortcut is whitelisted:', keyCombo);
    return false;
  }
  
  // Don't block single keys without modifiers (for typing)
  if (!keyCombo.includes('+')) {
    // Exception: function keys and escape should be blocked even without modifiers
    if (keyCombo.match(/^f\d+$/) || keyCombo === 'escape') {
      return true;
    }
    return false;
  }
  
  // Block shortcuts that use Cmd key (common browser shortcuts on macOS)
  if (keyCombo.includes('cmd+')) {
    return true;
  }
  
  // Block shortcuts that use Ctrl key (common browser shortcuts)
  if (keyCombo.includes('ctrl+')) {
    return true;
  }
  
  // Block Alt+key combinations (often used for browser shortcuts)
  if (keyCombo.includes('alt+')) {
    return true;
  }
  
  // Block Shift+function key combinations
  if (keyCombo.includes('shift+') && keyCombo.match(/f\d+$/)) {
    return true;
  }
  
  return false;
}

// Handle messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Content script received message:', message);
  
  switch (message.type) {
    case 'BLOCKING_STATE_CHANGED':
      isBlocking = message.isBlocking;
      console.log('Blocking state changed:', { isBlocking });
      sendResponse({ success: true });
      break;
      
    case 'SETTINGS_UPDATED':
      settings = { ...settings, ...message.settings };
      console.log('Settings updated:', settings);
      sendResponse({ success: true });
      break;
      
    case 'SHOW_TOAST':
      showToastNotification(message.toast);
      sendResponse({ success: true });
      break;
      
    default:
      console.log('Unknown message type:', message.type);
      sendResponse({ success: false, error: 'Unknown message type' });
  }
  
  return true; // Keep message channel open for async response
});

// Toast notification system
let toastContainer = null;
let activeToasts = new Set();

// Initialize toast container
function initToastContainer() {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'hotkey-muzzle-toast-container';
    toastContainer.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 2147483647;
      pointer-events: none;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    document.documentElement.appendChild(toastContainer);
  }
  return toastContainer;
}

// Show toast notification
function showToastNotification(toastData) {
  const container = initToastContainer();
  
  // Create toast element
  const toast = document.createElement('div');
  const toastId = 'toast-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  toast.id = toastId;
  
  // Set base styles
  toast.style.cssText = `
    background: #1f2937;
    color: white;
    padding: 12px 16px;
    border-radius: 8px;
    margin-bottom: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    font-size: 14px;
    line-height: 1.4;
    min-width: 280px;
    max-width: 400px;
    pointer-events: auto;
    transform: translateX(100%);
    transition: transform 0.3s ease-in-out, opacity 0.3s ease-in-out;
    opacity: 0;
    position: relative;
    border-left: 4px solid;
  `;
  
  // Style based on toast type
  switch (toastData.type) {
    case 'state-change':
      toast.style.borderLeftColor = toastData.isBlocking ? '#ef4444' : '#10b981';
      break;
    case 'blocked-shortcut':
      toast.style.borderLeftColor = '#f59e0b';
      break;
    default:
      toast.style.borderLeftColor = '#3b82f6';
  }
  
  // Create toast content
  const title = document.createElement('div');
  title.style.cssText = `
    font-weight: 600;
    margin-bottom: 4px;
    display: flex;
    align-items: center;
    gap: 8px;
  `;
  
  // Add icon based on type
  const icon = getToastIcon(toastData.type, toastData.isBlocking);
  title.innerHTML = `${icon} ${toastData.title}`;
  
  const message = document.createElement('div');
  message.style.cssText = `
    font-size: 13px;
    opacity: 0.9;
  `;
  
  // For blocked shortcuts, show shortcut first, then message
  if (toastData.type === 'blocked-shortcut' && toastData.shortcut) {
    const shortcutElement = document.createElement('span');
    shortcutElement.style.cssText = `
      font-family: monospace;
      background: rgba(255, 255, 255, 0.1);
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      margin-right: 8px;
    `;
    shortcutElement.textContent = toastData.shortcut;
    
    const textSpan = document.createElement('span');
    textSpan.textContent = toastData.message;
    
    message.appendChild(shortcutElement);
    message.appendChild(textSpan);
  } else {
    message.textContent = toastData.message;
  }
  
  // Add close button
  const closeButton = document.createElement('button');
  closeButton.style.cssText = `
    position: absolute;
    top: 8px;
    right: 8px;
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.7);
    cursor: pointer;
    font-size: 16px;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: background-color 0.2s;
  `;
  closeButton.innerHTML = '×';
  closeButton.title = 'Close notification';
  
  closeButton.addEventListener('mouseenter', () => {
    closeButton.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
  });
  
  closeButton.addEventListener('mouseleave', () => {
    closeButton.style.backgroundColor = 'transparent';
  });
  
  closeButton.addEventListener('click', () => {
    hideToast(toastId);
  });
  
  // Assemble toast
  toast.appendChild(title);
  toast.appendChild(message);
  toast.appendChild(closeButton);
  
  // Add to container and track
  container.appendChild(toast);
  activeToasts.add(toastId);
  
  // Animate in
  requestAnimationFrame(() => {
    toast.style.transform = 'translateX(0)';
    toast.style.opacity = '1';
  });
  
  // Auto-hide after duration
  const duration = toastData.duration || 4000;
  setTimeout(() => {
    hideToast(toastId);
  }, duration);
  
  console.log('🍞 Toast notification shown:', toastData);
}

// Hide toast notification
function hideToast(toastId) {
  const toast = document.getElementById(toastId);
  if (toast && activeToasts.has(toastId)) {
    toast.style.transform = 'translateX(100%)';
    toast.style.opacity = '0';
    
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
      activeToasts.delete(toastId);
    }, 300);
  }
}

// Get appropriate icon for toast type
function getToastIcon(type, isBlocking) {
  switch (type) {
    case 'state-change':
      return isBlocking ? '🚫' : '✅';
    case 'blocked-shortcut':
      return '⚠️';
    default:
      return '⚡';
  }
}
