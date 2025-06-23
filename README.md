# LinkedIn Note Generator Chrome Extension

A powerful Chrome extension that automatically scrapes webpage content and generates 3 different LinkedIn note formats using AI (Groq API).
![image](https://github.com/user-attachments/assets/debf5153-9752-4a92-b3cc-2bdfa7338c35)
![image](https://github.com/user-attachments/assets/def9640d-b7dd-4485-a3c3-1855a3011eae)

## Features

- 🔍 **Smart Content Extraction**: Automatically extracts clean, relevant content from any webpage
- 🤖 **AI-Powered Generation**: Uses Groq's Llama 3.3 70B model to create professional LinkedIn notes
- 📝 **Three Note Formats**: 
  - Informative/Educational
  - Inspirational/Motivational  
  - Conversational/Question-based
- ⚡ **Quick Access**: Click extension icon or use keyboard shortcut (Ctrl+Shift+L)
- 📋 **One-Click Copy**: Click any generated note to copy it to clipboard
- 🎨 **Beautiful UI**: Modern, LinkedIn-themed interface

## Installation

### Method 1: Load as Unpacked Extension (Development)

1. **Get a Groq API Key**:
   - Visit [Groq Console](https://console.groq.com/)
   - Sign up/login and create an API key
   - Keep this key handy for setup

2. **Load the Extension**:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the folder containing these extension files
   - The extension icon should appear in your toolbar

3. **Add Extension Icon to Toolbar** (if needed):
   - Click the puzzle piece icon in Chrome toolbar
   - Find "LinkedIn Note Generator" and click the pin icon

### Method 2: Pack and Install (Recommended for distribution)

1. In Chrome extensions page, click "Pack extension"
2. Select the extension folder
3. This creates a `.crx` file that can be distributed

## Usage

### First Time Setup

1. **Enter API Key**:
   - Click the extension icon
   - Enter your Groq API key in the password field
   - The key is securely stored locally

### Generating LinkedIn Notes

1. **Navigate to any webpage** with content you want to share on LinkedIn

2. **Generate Notes** using either method:
   - Click the extension icon in toolbar
   - OR press `Ctrl+Shift+L` (keyboard shortcut)

3. **Review Generated Notes**:
   - The extension will display 3 different note formats
   - Each has a different tone and approach
   - Preview shows the note type and content

4. **Copy and Use**:
   - Click any note to copy it to clipboard
   - Paste directly into LinkedIn
   - Customize as needed

## Note Formats Explained

- **🎓 Informative**: Educational tone, focuses on key insights and learnings
- **💡 Inspirational**: Motivational tone, emphasizes impact and possibilities  
- **💬 Conversational**: Question-based, encourages engagement and discussion

## Technical Details

### Files Structure
```
├── manifest.json      # Extension configuration
├── background.js      # Service worker for API calls
├── content.js         # Content script for page scraping
├── popup.html         # Extension popup interface
├── popup.js          # Popup functionality
└── README.md         # This file
```

### Permissions Required
- `activeTab`: Access current webpage content
- `storage`: Store API key securely
- `https://api.groq.com/*`: Make API calls to Groq

### Content Extraction
The extension intelligently extracts content by:
- Targeting main content areas (`main`, `article`, etc.)
- Removing navigation, ads, and irrelevant elements
- Cleaning and formatting text for optimal AI processing
- Limiting content length for API efficiency

## Troubleshooting

### "API key not found" Error
- Ensure you've entered your Groq API key in the extension popup
- The key should be visible (masked) in the password field

### "Could not extract content" Error
- Try refreshing the page and generating again
- Some pages with heavy JavaScript may need a moment to load
- Ensure the page has readable text content

### Extension Not Working
- Check that the extension is enabled in `chrome://extensions/`
- Try reloading the extension
- Check browser console for any errors

### API Errors
- Verify your Groq API key is valid and has credits
- Check your internet connection
- Try again in a few moments (rate limiting)

## Privacy & Security

- ✅ API key stored locally in Chrome storage
- ✅ No data sent to external servers except Groq API
- ✅ Page content processing happens locally
- ✅ No tracking or analytics

## Development

### Testing Locally
1. Make code changes
2. Go to `chrome://extensions/`
3. Click refresh icon on the extension
4. Test functionality

### Adding Features
- Modify `background.js` for API logic
- Update `content.js` for content extraction
- Edit `popup.html`/`popup.js` for UI changes

## API Credits

This extension uses the [Groq API](https://groq.com/) with the Llama 3.3 70B model for generating LinkedIn notes. You'll need your own API key and credits.

## Support

For issues or feature requests, please check:
1. This README for common solutions
2. Browser console for error messages
3. Extension permissions and settings

---

**Happy LinkedIn sharing! 🚀** 
