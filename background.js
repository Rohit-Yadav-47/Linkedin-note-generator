// Background service worker for LinkedIn Note Generator

// Handle keyboard shortcut
chrome.commands.onCommand.addListener((command) => {
  if (command === "generate_notes") {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      chrome.action.openPopup();
    });
  }
});

// Handle messages from content script and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "generateNotes") {
    generateLinkedInNotes(request.content)
      .then(notes => sendResponse({success: true, notes}))
      .catch(error => sendResponse({success: false, error: error.message}));
    return true; // Will respond asynchronously
  }
});

async function generateLinkedInNotes(pageContent) {
  try {
    // Get API key from storage
    const result = await chrome.storage.local.get(['groqApiKey']);
    const apiKey = result.groqApiKey;
    
    if (!apiKey) {
      throw new Error('Groq API key not found. Please set it in the extension popup.');
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            role: "system",
            content: `You are a LinkedIn outreach expert focused on seeking feedback and insights, NOT selling. Generate 3 different LinkedIn connection note formats based on the provided profile content.

            Context: We're building an AI tool that helps teams create internal tools and apps through simple prompts. We want to learn from experienced professionals to improve our tool.

            Follow this structure for each note (max 250 characters):
            1. Hi [Name], (personalize with their actual role/company if mentioned)
            2. Brief mention of what we're building (AI tool for internal tools/apps from prompts)
            3. Connect it to their specific expertise/industry/role
            4. Ask for their insights/feedback/help to improve our tool
            5. Request a short discovery call (15-20 min)
            format example Hi [Name],
We’re building an AI tool that helps teams create internal tools and apps through simple prompts — especially useful for streamlining ops workflows.
Given your experience in operations, your insights would be very helpful for us. Would you be open to a quick 15-min discovery call?
            CRITICAL: 
            - NEVER sell or pitch the tool
            - Always ask for THEIR help, insights, or feedback
            - Make it collaborative, not sales-focused
            - Reference something specific from their profile/experience
            - Keep it humble and learning-focused
            strictly never exceed 250 characters for each note.
            Return ONLY a valid JSON object with this exact format:
            {
              "format1": "Collaborative feedback-seeking approach",
              "format2": "Research/insights gathering approach", 
              "format3": "Expertise validation approach"
            }
            
            Do not include any other text, explanations, or formatting outside the JSON.`
          },
          {
            role: "user",
            content: `Generate 3 LinkedIn connection notes from this profile/page: ${pageContent.substring(0, 2000)}`
          }
        ],
        model: "llama-3.3-70b-versatile",
        temperature: 0.7,
        max_tokens: 800
      }),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content received from API');
    }

    // Clean and parse JSON response
    let cleanContent = content.trim();
    
    // Remove any markdown code block formatting
    cleanContent = cleanContent.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    
    // Remove any leading/trailing text that might not be JSON
    const jsonStart = cleanContent.indexOf('{');
    const jsonEnd = cleanContent.lastIndexOf('}') + 1;
    
    if (jsonStart !== -1 && jsonEnd !== -1) {
      cleanContent = cleanContent.substring(jsonStart, jsonEnd);
    }

    try {
      const notes = JSON.parse(cleanContent);
      
      // Validate that we have the expected format
      if (notes.format1 && notes.format2 && notes.format3) {
        return [
          { type: "Collaborative Feedback", content: notes.format1 },
          { type: "Research & Insights", content: notes.format2 },
          { type: "Expertise Validation", content: notes.format3 }
        ];
      } else {
        throw new Error('Invalid response format from AI');
      }
    } catch (parseError) {
      console.error('JSON parsing failed:', parseError);
      console.log('Raw content:', content);
      
      // Enhanced fallback: try to extract meaningful content
      const lines = content.split('\n').filter(line => 
        line.trim() && 
        !line.includes('{') && 
        !line.includes('}') && 
        !line.includes('"format') &&
        line.length > 20
      );
      
      if (lines.length >= 3) {
        return [
          { type: "Collaborative Feedback", content: lines[0].replace(/["""]/g, '').trim() },
          { type: "Research & Insights", content: lines[1].replace(/["""]/g, '').trim() },
          { type: "Expertise Validation", content: lines[2].replace(/["""]/g, '').trim() }
        ];
      } else {
        // Last resort fallback with feedback-focused approach
        return [
          { 
            type: "Collaborative Feedback", 
            content: "Hi! We're building an AI tool that creates internal apps from prompts. Your operational expertise would be invaluable for our research. Would you be open to sharing insights in a quick 15-min call to help us improve?" 
          },
          { 
            type: "Research & Insights", 
            content: "Hi! Building an AI that turns workflow needs into instant tools. Your experience in ops efficiency would help us understand real user challenges. Could we chat for 15 minutes to gather your insights?" 
          },
          { 
            type: "Expertise Validation", 
            content: "Hi! Working on AI that builds internal tools from simple prompts. Given your expertise in operations, your feedback would be extremely helpful for our development. Quick 15-min discovery call?" 
          }
        ];
      }
    }
  } catch (error) {
    console.error('Error generating notes:', error);
    throw error;
  }
} 