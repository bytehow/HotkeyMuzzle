// Background service worker for HotkeyMuzzle
console.log('HotkeyMuzzle background script loaded');

// Extension state
let isBlocking = false;

// Default settings
const DEFAULT_SETTINGS = {
  showBlockedNotifications: true,
  showStateNotifications: true,
  notificationDuration: 1500, // Default 1.5 seconds
  whitelist: [
    'cmd+a',      // Select all
    'cmd+c',      // Copy
    'cmd+v',      // Paste
    'cmd+t',      // New tab
    'cmd+w',      // Close tab
    'cmd+r',      // Refresh
    'cmd+l',      // Address bar focus
    'cmd+shift+t', // Reopen closed tab
    'cmd+shift+n', // New incognito window
    'cmd+q',      // Quit browser
  ]
};

// Initialize extension
chrome.runtime.onInstalled.addListener(async () => {
  console.log('HotkeyMuzzle installed');
  
  // Set default settings if not already set
  const settings = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  await chrome.storage.sync.set(settings);
  
  // Set initial icon state
  updateIcon(false);
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message);
  
  switch (message.type) {
    case 'TOGGLE_BLOCKING':
      toggleBlocking(sender.tab?.id)
        .then(() => sendResponse({ success: true, isBlocking }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true; // Keep message channel open for async response
      
    case 'GET_BLOCKING_STATE':
      sendResponse({ isBlocking });
      break;
      
    case 'SHORTCUT_BLOCKED':
      showBlockedShortcutNotification(message.shortcut, sender.tab?.id);
      sendResponse({ success: true });
      break;
      
    case 'UPDATE_SETTINGS':
      updateSettings(message.settings)
        .then(() => sendResponse({ success: true }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true; // Keep message channel open for async response
      
    default:
      console.log('Unknown message type:', message.type);
      sendResponse({ success: false, error: 'Unknown message type' });
  }
  
  return false;
});

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  console.log('Extension icon clicked');
  toggleBlocking(tab.id);
});

// Toggle blocking state
async function toggleBlocking(tabId) {
  isBlocking = !isBlocking;
  console.log('Blocking toggled:', isBlocking);
  
  // Update icon
  updateIcon(isBlocking);
  
  // Send state to all tabs (global blocking)
  try {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      try {
        await chrome.tabs.sendMessage(tab.id, {
          type: 'BLOCKING_STATE_CHANGED',
          isBlocking
        });
      } catch (error) {
        // Ignore errors for tabs that can't receive messages (e.g., chrome:// pages)
      }
    }
  } catch (error) {
    console.log('Could not query tabs:', error);
  }
  
  // Send state change to popup if it's open
  try {
    await chrome.runtime.sendMessage({
      type: 'BLOCKING_STATE_CHANGED',
      isBlocking
    });
  } catch (error) {
    // Popup is not open, ignore error
    console.log('Popup not open or could not send message to popup:', error);
  }
  
  // Show notification
  const settings = await chrome.storage.sync.get(['showStateNotifications', 'notificationDuration']);
  if (settings.showStateNotifications !== false) { // Default to true
    showToastInAllTabs({
      type: 'state-change',
      title: isBlocking ? 'Shortcuts Blocked' : 'Shortcuts Enabled',
      message: isBlocking ? 'Click extension icon to disable' : 'Protection disabled',
      duration: settings.notificationDuration || DEFAULT_SETTINGS.notificationDuration,
      isBlocking
    });
  }
}

// Update extension icon to reflect blocking state
function updateIcon(blocking) {
  // For now, just update the title since we don't have icon files
  // TODO: Add proper icons later
  
  chrome.action.setTitle({
    title: blocking ? 'HotkeyMuzzle (ACTIVE - Click to disable)' : 'HotkeyMuzzle (Click to enable)'
  });
  
  // When we add icons later, uncomment this:
  /*
  const iconPath = blocking ? 'icons/icon-active' : 'icons/icon';
  chrome.action.setIcon({
    path: {
      16: `${iconPath}16.png`,
      32: `${iconPath}32.png`,
      48: `${iconPath}48.png`,
      128: `${iconPath}128.png`
    }
  });
  */
}

// Format keyboard shortcuts for display with prettier symbols
function formatShortcutForDisplay(shortcut) {
  return shortcut
    .toLowerCase()
    .split('+')
    .map(key => {
      switch (key.trim()) {
        case 'cmd':
        case 'command':
          return '⌘';
        case 'shift':
          return 'Shift';
        case 'alt':
        case 'option':
          return '⌥';
        case 'ctrl':
        case 'control':
          return '⌃';
        case 'meta':
          return '⌘';
        case 'space':
          return 'Space';
        case 'tab':
          return 'Tab';
        case 'enter':
        case 'return':
          return 'Enter';
        case 'escape':
        case 'esc':
          return 'Escape';
        case 'backspace':
          return 'Backspace';
        case 'delete':
          return 'Delete';
        case 'arrowup':
        case 'up':
          return '↑';
        case 'arrowdown':
        case 'down':
          return '↓';
        case 'arrowleft':
        case 'left':
          return '←';
        case 'arrowright':
        case 'right':
          return '→';
        default:
          // For function keys and regular letters/numbers
          if (key.match(/^f\d+$/)) {
            return key.toUpperCase(); // F1, F2, etc.
          }
          return key.toUpperCase(); // Regular keys
      }
    })
    .join(' + ');
}

// Handle blocked shortcut notification
async function showBlockedShortcutNotification(shortcut, tabId) {
  console.log('🚫 Shortcut blocked:', shortcut, 'in tab:', tabId);
  
  const settings = await chrome.storage.sync.get(['showBlockedNotifications', 'notificationDuration']);
  console.log('📋 Settings for blocked notifications:', settings);
  
  if (settings.showBlockedNotifications !== false) { // Default to true if not set
    const prettyShortcut = formatShortcutForDisplay(shortcut);
    
    // Show toast notification in the specific tab
    if (tabId) {
      try {
        await chrome.tabs.sendMessage(tabId, {
          type: 'SHOW_TOAST',
          toast: {
            type: 'blocked-shortcut',
            title: 'Shortcut Blocked',
            message: 'was blocked',
            shortcut: prettyShortcut,
            duration: settings.notificationDuration || DEFAULT_SETTINGS.notificationDuration
          }
        });
        console.log('✅ Toast notification sent successfully');
      } catch (error) {
        console.log('❌ Could not show toast in tab:', error);
      }
    } else {
      console.log('❌ No tab ID provided for notification');
    }
  } else {
    console.log('🔇 Blocked notifications are disabled');
  }
}

// Show toast notification in all tabs
async function showToastInAllTabs(toastData) {
  try {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      try {
        await chrome.tabs.sendMessage(tab.id, {
          type: 'SHOW_TOAST',
          toast: toastData
        });
      } catch (error) {
        // Ignore errors for tabs that can't receive messages (e.g., chrome:// pages)
      }
    }
  } catch (error) {
    console.log('Could not show toast in tabs:', error);
  }
}

// Update settings and notify content scripts
async function updateSettings(newSettings) {
  try {
    // Save settings to storage
    await chrome.storage.sync.set(newSettings);
    
    // Notify all content scripts about settings update
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      try {
        await chrome.tabs.sendMessage(tab.id, {
          type: 'SETTINGS_UPDATED',
          settings: newSettings
        });
      } catch (error) {
        // Ignore errors for tabs that can't receive messages (e.g., chrome:// pages)
      }
    }
    
    console.log('Settings updated:', newSettings);
  } catch (error) {
    console.error('Error updating settings:', error);
    throw error;
  }
}
