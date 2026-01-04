# Installation Guide

## Quick Start

### 1. Build the Extension

```bash
npm install
npm run build:extension
```

### 2. Load in Chrome

1. Open Google Chrome
2. Go to `chrome://extensions/`
3. Enable **Developer mode** (toggle switch in top-right corner)
4. Click **Load unpacked**
5. Navigate to and select the `dist` folder in this project

### 3. Pin the Extension (Optional but Recommended)

1. Click the puzzle piece icon in Chrome toolbar
2. Find "Bing Search Automator"
3. Click the pin icon to keep it visible

## Configuration

### Initial Setup

1. Click the extension icon in your Chrome toolbar
2. Click the **Settings** gear icon
3. Configure your preferences:
   - **Number of Searches**: Set between 1-200 (default: 30)
   - **Wait Time**: Set between 1-60 seconds (default: 5)
4. Click **Save Settings**
5. Click **Back** to return to main screen

### Enable Auto-Start

To make the extension run automatically when you open Chrome:

1. Toggle **Auto-Start on Browser Open** to ON (green)
2. Extension will now automatically run searches when browser opens
3. Searches continue until daily quota is reached

## Usage

### Starting Searches Manually

1. Open the extension popup
2. Click the green **Start** button
3. Searches will begin in background tabs
4. Progress shown in real-time

### Stopping Searches

1. Open the extension popup
2. Click the red **Stop** button
3. Current search completes, then stops

### Resetting Daily Count

1. Open the extension popup
2. Click **Reset Count**
3. Counter resets to 0

## How It Works

1. **Background Operation**: Opens Bing.com in background tabs (not active)
2. **Random Queries**: Generates random search terms automatically
3. **Timed Execution**: Waits your configured time between searches
4. **Auto-Close**: Closes each search tab after 3 seconds
5. **Daily Tracking**: Resets count automatically each day

## Troubleshooting

### Extension doesn't appear in Chrome

- Make sure you selected the `dist` folder (not the project root)
- Check that Developer mode is enabled
- Try reloading the extension

### Searches not starting

- Check that the toggle is set to ON
- Verify you haven't reached daily quota
- Check Chrome console for errors (F12)

### Auto-start not working

- Verify "Auto-Start on Browser Open" is enabled (green)
- Make sure you haven't completed all searches for the day
- Chrome must be fully restarted (not just new window)

## Privacy

- All data stored locally in Chrome
- No external servers contacted
- No data collection or tracking
- Search queries generated randomly on-device

## Uninstalling

1. Go to `chrome://extensions/`
2. Find "Bing Search Automator"
3. Click **Remove**
4. Confirm deletion
