# HotkeyMuzzle 🔇

A Chrome extension that temporarily disables keyboard shortcuts with customizable controls. Perfect for preventing accidental keyboard shortcuts while gaming, testing, or when you need to temporarily mute browser hotkeys.

## What It Does

HotkeyMuzzle allows you to:
- **Temporarily disable keyboard shortcuts** in your browser with a single click
- **Whitelist essential shortcuts** (like Cmd+C, Cmd+V) so they continue working
- **Get visual feedback** when shortcuts are blocked or when the extension state changes
- **Customize which shortcuts to allow** through an easy-to-use options page

The extension blocks common browser shortcuts that use modifier keys (Cmd, Ctrl, Alt) while preserving normal typing functionality and whitelisted shortcuts.

## Installation (Developer Mode)

Since this extension is not published on the Chrome Web Store, you'll need to install it in developer mode:

### Step 1: Download/Clone the Extension
Make sure you have all the extension files in a folder on your computer.
```
git clone https://github.com/bytehow/HotkeyMuzzle.git
```

### Step 2: Enable Developer Mode
1. Open Chrome and navigate to `chrome://extensions/`
2. Toggle on **Developer mode** (switch in the top-right corner)

### Step 3: Load Unpacked Extension
1. Click the **"Load unpacked"** button
2. Select the folder containing the HotkeyMuzzle extension files
3. The extension should now appear in your extensions list

## How to Use

### Basic Usage
1. **Click the HotkeyMuzzle icon** in your browser toolbar to open the popup
2. **Click "Start Blocking"** to activate shortcut blocking
3. **Click "Stop Blocking"** to deactivate and restore normal shortcuts
4. The icon will change color to indicate the current state:
   - 🟢 Green: Shortcuts are active (normal browsing)
   - 🔴 Red: Shortcuts are blocked

### Customizing Settings
1. Click the HotkeyMuzzle icon and select **"Options"**
2. Configure your preferences:
   - **Notification Settings**: Choose whether to show notifications when shortcuts are blocked
   - **Whitelist Management**: Add or remove shortcuts that should always work
   - **Notification Duration**: Adjust how long notifications are displayed

### Default Whitelisted Shortcuts
The following shortcuts work even when blocking is active:
- `Cmd+A` (Select All)
- `Cmd+C` (Copy)
- `Cmd+V` (Paste)
- `Cmd+T` (New Tab)
- `Cmd+W` (Close Tab)
- `Cmd+R` (Refresh)
- `Cmd+L` (Focus Address Bar)
- `Cmd+Shift+T` (Reopen Closed Tab)
- `Cmd+Shift+N` (New Incognito Window)
- `Cmd+Q` (Quit Browser)

*Note: On Windows/Linux, `Ctrl` is used instead of `Cmd`*

### Testing the Extension
A test script (`test-extension.sh`) is included for macOS users to quickly launch Chrome with the extension loaded:

```bash
./test-extension.sh
```

## Files Structure

- `manifest.json` - Extension configuration and permissions
- `background.js` - Service worker handling extension state and messaging
- `content.js` - Script injected into web pages to intercept keyboard events
- `popup.html/js` - Extension popup interface for quick toggle
- `options.html/js` - Settings page for customization
- `test-extension.sh` - Test script for macOS development

## Permissions Explained

The extension requires these permissions:
- **`storage`**: Save your settings and preferences
- **`activeTab`**: Communicate with the current tab
- **`scripting`**: Inject the content script into web pages
- **`tabs`**: Manage extension state across tabs
- **`commands`**: Future support for keyboard shortcuts to control the extension
- **`host_permissions`**: Access all websites to intercept keyboard events

## Development

To modify or contribute to this extension:
1. Make changes to the relevant files
2. Go to `chrome://extensions/`
3. Click the refresh icon on the HotkeyMuzzle extension
4. Test your changes
