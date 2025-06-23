// Content script for scraping page content

// Function to extract clean text content from the page
function extractPageContent() {
  // Remove script and style elements
  const scripts = document.querySelectorAll('script, style, nav, footer, header');
  scripts.forEach(el => el.remove());
  
  // Get main content areas
  const contentSelectors = [
    'main',
    'article', 
    '[role="main"]',
    '.content',
    '.main-content',
    '.post-content',
    '.entry-content',
    'body'
  ];
  
  let content = '';
  
  for (const selector of contentSelectors) {
    const element = document.querySelector(selector);
    if (element) {
      content = element.innerText || element.textContent || '';
      break;
    }
  }
  
  // Fallback to body if no specific content area found
  if (!content) {
    content = document.body.innerText || document.body.textContent || '';
  }
  
  // Clean up the content
  content = content
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/\n+/g, ' ') // Replace newlines with spaces
    .trim();
    
  // Get page title and URL for context
  const title = document.title || '';
  const url = window.location.href;
  
  return {
    title,
    url,
    content: content.substring(0, 3000), // Limit content length
    timestamp: new Date().toISOString()
  };
}

// Function to paste text into LinkedIn's connection message textarea
function pasteToLinkedInTextarea(text) {
  // LinkedIn connection message textarea selectors
  const selectors = [
    '#custom-message',
    'textarea[name="message"]',
    'textarea[placeholder*="We know each other"]',
    '.connect-button-send-invite__custom-message',
    'textarea.ember-text-area',
    'textarea[id*="message"]',
    'textarea[class*="custom-message"]'
  ];
  
  let textarea = null;
  
  // Try to find the textarea using multiple selectors
  for (const selector of selectors) {
    textarea = document.querySelector(selector);
    if (textarea) {
      console.log('Found LinkedIn textarea with selector:', selector);
      break;
    }
  }
  
  if (!textarea) {
    // Try to find any visible textarea on the page as fallback
    const allTextareas = document.querySelectorAll('textarea');
    for (const ta of allTextareas) {
      const rect = ta.getBoundingClientRect();
      const isVisible = rect.width > 0 && rect.height > 0 && 
                       window.getComputedStyle(ta).display !== 'none' &&
                       window.getComputedStyle(ta).visibility !== 'hidden';
      if (isVisible) {
        textarea = ta;
        console.log('Found visible textarea as fallback');
        break;
      }
    }
  }
  
  if (textarea) {
    try {
      // Clear any existing content
      textarea.value = '';
      
      // Set the new text
      textarea.value = text;
      
      // Trigger multiple events to ensure LinkedIn detects the change
      const events = [
        new Event('input', { bubbles: true }),
        new Event('change', { bubbles: true }),
        new Event('keyup', { bubbles: true }),
        new Event('paste', { bubbles: true }),
        new Event('textInput', { bubbles: true })
      ];
      
      events.forEach(event => textarea.dispatchEvent(event));
      
      // For Ember.js applications, trigger a more specific event
      if (textarea.classList.contains('ember-text-area')) {
        textarea.dispatchEvent(new CustomEvent('ember-action', { 
          bubbles: true, 
          detail: { value: text } 
        }));
      }
      
      // Focus the textarea to show the user where the text was pasted
      textarea.focus();
      
      // Set cursor to end of text
      textarea.setSelectionRange(text.length, text.length);
      
      // Trigger blur and focus again to ensure all change detection works
      setTimeout(() => {
        textarea.blur();
        setTimeout(() => textarea.focus(), 50);
      }, 100);
      
      console.log('Successfully pasted text to LinkedIn textarea');
      return true;
    } catch (error) {
      console.error('Error pasting to textarea:', error);
      return false;
    }
  } else {
    console.warn('LinkedIn connection message textarea not found');
    return false;
  }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getPageContent") {
    const pageData = extractPageContent();
    sendResponse(pageData);
  } else if (request.action === "pasteToLinkedIn") {
    const success = pasteToLinkedInTextarea(request.text);
    sendResponse({ success });
  }
});

// Store page content when page loads
document.addEventListener('DOMContentLoaded', () => {
  const pageData = extractPageContent();
  chrome.storage.local.set({ currentPageData: pageData });
});

// Update content when page changes (for SPAs)
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    setTimeout(() => {
      const pageData = extractPageContent();
      chrome.storage.local.set({ currentPageData: pageData });
    }, 1000);
  }
}).observe(document, { subtree: true, childList: true }); 