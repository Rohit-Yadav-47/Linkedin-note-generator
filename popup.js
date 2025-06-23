// Popup script for LinkedIn Note Generator

document.addEventListener('DOMContentLoaded', async () => {
  const apiKeyInput = document.getElementById('apiKey');
  const generateBtn = document.getElementById('generateBtn');
  const loading = document.getElementById('loading');
  const notesContainer = document.getElementById('notesContainer');
  const errorDiv = document.getElementById('error');
  const pageInfo = document.getElementById('pageInfo');
  const copyNotification = document.getElementById('copyNotification');

  // Load saved API key
  const result = await chrome.storage.local.get(['groqApiKey']);
  if (result.groqApiKey) {
    apiKeyInput.value = result.groqApiKey;
  }

  // Save API key when it changes
  apiKeyInput.addEventListener('input', () => {
    chrome.storage.local.set({ groqApiKey: apiKeyInput.value });
  });

  // Load page info with retry logic
  await loadPageInfo();

  async function loadPageInfo() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // First try to get content from content script
      let response = await getPageContentWithRetry(tab.id);
      
      if (response) {
        const truncatedUrl = response.url.length > 60 ? 
          response.url.substring(0, 60) + '...' : response.url;
        
        pageInfo.innerHTML = `
          <div class="page-title">📄 ${response.title || 'Untitled Page'}</div>
          <div class="page-url">🔗 ${truncatedUrl}</div>
          <div class="content-length">📝 ${response.content ? response.content.length : 0} characters extracted</div>
        `;
      } else {
        // Fallback to basic tab info
        pageInfo.innerHTML = `
          <div class="page-title">📄 ${tab.title || 'Current Page'}</div>
          <div class="page-url">🔗 ${tab.url.substring(0, 60)}...</div>
          <div class="content-status">⚠️ Content will be extracted when generating notes</div>
        `;
      }
    } catch (error) {
      console.error('Error loading page info:', error);
      pageInfo.innerHTML = `
        <div class="page-status">📄 Ready to generate notes from current page</div>
      `;
    }
  }

  async function getPageContentWithRetry(tabId, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        // First ensure content script is injected
        if (i === 0) {
          try {
            await chrome.scripting.executeScript({
              target: { tabId: tabId },
              files: ['content.js']
            });
          } catch (injectionError) {
            // Content script might already be injected, continue
          }
        }

        // Wait a bit for content script to initialize
        await new Promise(resolve => setTimeout(resolve, 100 * (i + 1)));

        const response = await chrome.tabs.sendMessage(tabId, { action: "getPageContent" });
        return response;
      } catch (error) {
        if (i === maxRetries - 1) {
          throw error;
        }
      }
    }
    return null;
  }

  // Generate notes
  generateBtn.addEventListener('click', async () => {
    const apiKey = apiKeyInput.value.trim();
    
    if (!apiKey) {
      showError('Please enter your Groq API key');
      return;
    }

    try {
      hideError();
      showLoading();
      
      // Get current tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Get page content with retry
      let pageData = await getPageContentWithRetry(tab.id);
      
      // If content script fails, extract basic info
      if (!pageData || !pageData.content) {
        pageData = {
          title: tab.title,
          url: tab.url,
          content: `Title: ${tab.title}\nURL: ${tab.url}\nNote: Content extraction from content script failed. Using basic page information.`
        };
      }

      if (!pageData.content || pageData.content.length < 50) {
        throw new Error('Not enough content found on this page. Try refreshing or navigating to a content-rich page.');
      }

      // Generate notes
      const response = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
          action: 'generateNotes',
          content: `Title: ${pageData.title}\nURL: ${pageData.url}\nContent: ${pageData.content}`
        }, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (response && response.success) {
            resolve(response);
          } else {
            reject(new Error(response ? response.error : 'Unknown error occurred'));
          }
        });
      });

      hideLoading();
      displayNotes(response.notes);
      
    } catch (error) {
      hideLoading();
      showError(error.message);
    }
  });

  function showLoading() {
    generateBtn.style.display = 'none';
    loading.style.display = 'block';
    notesContainer.style.display = 'none';
  }

  function hideLoading() {
    generateBtn.style.display = 'block';
    loading.style.display = 'none';
  }

  function showError(message) {
    errorDiv.innerHTML = `<strong>Error:</strong> ${message}`;
    errorDiv.style.display = 'block';
    setTimeout(() => {
      errorDiv.style.display = 'none';
    }, 10000);
  }

  function hideError() {
    errorDiv.style.display = 'none';
  }

  function displayNotes(notes) {
    notesContainer.style.display = 'block';
    
    notes.forEach((note, index) => {
      const noteElement = document.getElementById(`note${index + 1}`);
      const typeElement = noteElement.querySelector('.note-type');
      const contentElement = noteElement.querySelector('.note-content');
      
      // Add icons for different note types
      const icons = ['🎯', '💬', '⚡'];
      typeElement.innerHTML = `${icons[index]} ${note.type}`;
      contentElement.textContent = note.content;
      
      // Add click handler to copy note and paste to LinkedIn
      noteElement.onclick = async () => {
        await copyToClipboardAndPaste(note.content);
        
        // Visual feedback for the clicked note
        noteElement.style.background = 'rgba(40, 167, 69, 0.2)';
        noteElement.style.borderColor = 'rgba(40, 167, 69, 0.5)';
        
        setTimeout(() => {
          noteElement.style.background = 'rgba(255, 255, 255, 0.08)';
          noteElement.style.borderColor = 'rgba(255, 255, 255, 0.1)';
        }, 1000);
      };
    });
  }

  async function copyToClipboardAndPaste(text) {
    try {
      // Copy to clipboard
      await navigator.clipboard.writeText(text);
      
      // Try to paste into LinkedIn textarea
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      try {
        await chrome.tabs.sendMessage(tab.id, { 
          action: "pasteToLinkedIn", 
          text: text 
        });
        showCopyNotification('Copied and pasted to LinkedIn! 🎉');
      } catch (pasteError) {
        console.error('Could not paste to LinkedIn:', pasteError);
        showCopyNotification('Copied to clipboard! 📋');
      }
      
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      showCopyNotification('Copied to clipboard! 📋');
    }
  }

  function showCopyNotification(message = 'Copied to clipboard!') {
    copyNotification.innerHTML = `<span class="success-checkmark">✅</span>${message}`;
    copyNotification.style.display = 'block';
    setTimeout(() => {
      copyNotification.style.display = 'none';
    }, 3000);
  }
}); 