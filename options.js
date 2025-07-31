// Options page script for HotkeyMuzzle
console.log('HotkeyMuzzle options page loaded');

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

// Current settings
let currentSettings = { ...DEFAULT_SETTINGS };

// DOM elements
let showNotificationsCheckbox, showStateNotificationsCheckbox, notificationDurationInput, whitelistContainer, newShortcutInput, saveStatus;

// Initialize the options page
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Get DOM elements
    showNotificationsCheckbox = document.getElementById('show-notifications');
    showStateNotificationsCheckbox = document.getElementById('show-state-notifications');
    notificationDurationInput = document.getElementById('notification-duration');
    whitelistContainer = document.getElementById('whitelist');
    newShortcutInput = document.getElementById('new-shortcut-input');
    saveStatus = document.getElementById('save-status');
    
    // Load current settings
    await loadSettings();
    
    // Set up event listeners
    setupEventListeners();
    
    // Render whitelist
    renderWhitelist();
    
    console.log('✅ Options page initialized');
  } catch (error) {
    console.error('❌ Error initializing options page:', error);
    showSaveStatus('Error loading settings', 'error');
  }
});

// Load settings from storage
async function loadSettings() {
  try {
    const stored = await chrome.storage.sync.get(DEFAULT_SETTINGS);
    currentSettings = { ...DEFAULT_SETTINGS, ...stored };
    
    console.log('📁 Loaded settings:', currentSettings);
    
    // Update UI with loaded settings
    showNotificationsCheckbox.checked = currentSettings.showBlockedNotifications;
    showStateNotificationsCheckbox.checked = currentSettings.showStateNotifications;
    notificationDurationInput.value = currentSettings.notificationDuration;
    
  } catch (error) {
    console.error('Error loading settings:', error);
    throw error;
  }
}

// Set up event listeners
function setupEventListeners() {
  // Save button
  document.getElementById('save-btn').addEventListener('click', saveSettings);
  
  // Reset button
  document.getElementById('reset-btn').addEventListener('click', resetSettings);
  
  // Add shortcut button
  document.getElementById('add-whitelist-btn').addEventListener('click', addShortcutToWhitelist);
  
  // Enter key in shortcut input
  newShortcutInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      addShortcutToWhitelist();
    }
  });
  
  // Auto-save when settings change
  showNotificationsCheckbox.addEventListener('change', autoSave);
  showStateNotificationsCheckbox.addEventListener('change', autoSave);
  notificationDurationInput.addEventListener('input', autoSave);
}

// Auto-save settings when they change
async function autoSave() {
  try {
    currentSettings.showBlockedNotifications = showNotificationsCheckbox.checked;
    currentSettings.showStateNotifications = showStateNotificationsCheckbox.checked;
    
    // Validate and set notification duration
    const duration = parseInt(notificationDurationInput.value);
    if (!isNaN(duration) && duration > 0) {
      currentSettings.notificationDuration = duration;
    } else {
      // Reset to default if invalid
      notificationDurationInput.value = DEFAULT_SETTINGS.notificationDuration;
      currentSettings.notificationDuration = DEFAULT_SETTINGS.notificationDuration;
    }
    
    await chrome.storage.sync.set(currentSettings);
    console.log('🔄 Auto-saved settings');
  } catch (error) {
    console.error('Error auto-saving settings:', error);
  }
}

// Render the whitelist UI
function renderWhitelist() {
  whitelistContainer.innerHTML = '';
  
  if (currentSettings.whitelist.length === 0) {
    whitelistContainer.innerHTML = '<div style="text-align: center; color: #6b7280; padding: 20px;">No whitelisted shortcuts</div>';
    return;
  }
  
  currentSettings.whitelist.forEach((shortcut, index) => {
    const item = document.createElement('div');
    item.className = 'whitelist-item';
    item.innerHTML = `
      <span class="shortcut-combo">${formatShortcut(shortcut)}</span>
      <button class="remove-btn" data-index="${index}">Remove</button>
    `;
    
    // Add remove button event listener
    const removeBtn = item.querySelector('.remove-btn');
    removeBtn.addEventListener('click', () => removeShortcutFromWhitelist(index));
    
    whitelistContainer.appendChild(item);
  });
}

// Format shortcut for display
function formatShortcut(shortcut) {
  return shortcut
    .split('+')
    .map(part => {
      // Capitalize first letter and handle special cases
      switch (part.toLowerCase()) {
        case 'cmd': return '⌘';
        case 'ctrl': return 'Ctrl';
        case 'alt': return 'Alt';
        case 'shift': return 'Shift';
        case 'escape': return 'Esc';
        default: return part.toUpperCase();
      }
    })
    .join(' + ');
}

// Add shortcut to whitelist
function addShortcutToWhitelist() {
  const shortcut = newShortcutInput.value.trim().toLowerCase();
  
  if (!shortcut) {
    showSaveStatus('Please enter a shortcut', 'error');
    return;
  }
  
  // Validate shortcut format
  if (!isValidShortcut(shortcut)) {
    showSaveStatus('Invalid shortcut format. Use format like: cmd+key, ctrl+key, etc.', 'error');
    return;
  }
  
  // Check if shortcut already exists
  if (currentSettings.whitelist.includes(shortcut)) {
    showSaveStatus('Shortcut is already in the whitelist', 'error');
    return;
  }
  
  // Add to whitelist
  currentSettings.whitelist.push(shortcut);
  currentSettings.whitelist.sort(); // Keep alphabetically sorted
  
  // Clear input
  newShortcutInput.value = '';
  
  // Re-render whitelist
  renderWhitelist();
  
  showSaveStatus('Shortcut added to whitelist', 'success');
  
  console.log('➕ Added shortcut to whitelist:', shortcut);
}

// Remove shortcut from whitelist
function removeShortcutFromWhitelist(index) {
  const shortcut = currentSettings.whitelist[index];
  currentSettings.whitelist.splice(index, 1);
  
  // Re-render whitelist
  renderWhitelist();
  
  showSaveStatus(`Removed "${formatShortcut(shortcut)}" from whitelist`, 'success');
  
  console.log('➖ Removed shortcut from whitelist:', shortcut);
}

// Validate shortcut format
function isValidShortcut(shortcut) {
  // Basic validation for shortcut format
  const parts = shortcut.split('+');
  
  if (parts.length === 0) return false;
  
  // Check for valid modifiers
  const validModifiers = ['cmd', 'ctrl', 'alt', 'shift'];
  const modifiers = parts.slice(0, -1);
  const key = parts[parts.length - 1];
  
  // Must have at least one part
  if (!key && modifiers.length === 0) return false;
  
  // If there are modifiers, they must be valid
  for (const modifier of modifiers) {
    if (!validModifiers.includes(modifier)) {
      return false;
    }
  }
  
  // Key should be reasonable length
  if (key && key.length > 20) return false;
  
  return true;
}

// Save settings
async function saveSettings() {
  try {
    // Update current settings from UI
    currentSettings.showBlockedNotifications = showNotificationsCheckbox.checked;
    currentSettings.showStateNotifications = showStateNotificationsCheckbox.checked;
    
    // Validate and set notification duration
    const duration = parseInt(notificationDurationInput.value);
    if (!isNaN(duration) && duration > 0) {
      currentSettings.notificationDuration = duration;
    } else {
      // Reset to default if invalid
      notificationDurationInput.value = DEFAULT_SETTINGS.notificationDuration;
      currentSettings.notificationDuration = DEFAULT_SETTINGS.notificationDuration;
      showSaveStatus('Invalid duration, must be a positive number. Reset to default (1500ms)', 'error');
      return;
    }
    
    // Save to storage
    await chrome.storage.sync.set(currentSettings);
    
    // Notify background script about settings update
    try {
      await chrome.runtime.sendMessage({
        type: 'UPDATE_SETTINGS',
        settings: currentSettings
      });
    } catch (error) {
      console.log('Could not notify background script:', error);
    }
    
    showSaveStatus('Settings saved successfully', 'success');
    console.log('💾 Settings saved:', currentSettings);
    
  } catch (error) {
    console.error('Error saving settings:', error);
    showSaveStatus('Error saving settings', 'error');
  }
}

// Reset settings to defaults
async function resetSettings() {
  if (!confirm('Are you sure you want to reset all settings to defaults? This will clear your custom whitelist.')) {
    return;
  }
  
  try {
    // Reset to defaults
    currentSettings = { ...DEFAULT_SETTINGS };
    
    // Update UI
    showNotificationsCheckbox.checked = currentSettings.showBlockedNotifications;
    showStateNotificationsCheckbox.checked = currentSettings.showStateNotifications;
    notificationDurationInput.value = currentSettings.notificationDuration;
    
    // Re-render whitelist
    renderWhitelist();
    
    // Save to storage
    await chrome.storage.sync.set(currentSettings);
    
    // Notify background script
    try {
      await chrome.runtime.sendMessage({
        type: 'UPDATE_SETTINGS',
        settings: currentSettings
      });
    } catch (error) {
      console.log('Could not notify background script:', error);
    }
    
    showSaveStatus('Settings reset to defaults', 'success');
    console.log('🔄 Settings reset to defaults');
    
  } catch (error) {
    console.error('Error resetting settings:', error);
    showSaveStatus('Error resetting settings', 'error');
  }
}

// Show save status message
function showSaveStatus(message, type) {
  saveStatus.textContent = message;
  saveStatus.className = `save-status ${type}`;
  saveStatus.style.display = 'block';
  
  // Hide after 3 seconds
  setTimeout(() => {
    saveStatus.style.display = 'none';
  }, 3000);
}
