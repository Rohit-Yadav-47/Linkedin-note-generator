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
            content: `You are an expert LinkedIn outreach specialist focused on creating authentic, feedback-seeking connection requests. Your goal is to help users build genuine professional relationships by asking for insights and expertise rather than pitching or selling.

            CONTEXT: The user is building an AI tool that helps teams create internal tools and applications through simple prompts. They want to connect with experienced professionals to gather insights, validate their approach, and improve their product.

            INSTRUCTIONS:
            1. Generate 3 distinct LinkedIn connection note formats (max 250 characters each)
            2. Each note should be personalized based on the profile content provided
            3. Focus on SEEKING HELP and INSIGHTS, never on selling or pitching
            4. Make the user appear humble and genuinely interested in learning
            5. Reference specific aspects of the person's experience when possible
            6. Always suggest a brief discovery call (15-20 minutes)

            FORMAT REQUIREMENTS:
            - Collaborative Feedback: Focus on asking for help to improve the tool
            - Research & Insights: Emphasize learning from their industry experience  
            - Expertise Validation: Seek validation of the approach from their expertise

            TONE GUIDELINES:
            - Humble and respectful
            - Genuinely curious about their expertise
            - Collaborative, not transactional
            - Professional but approachable
            - Specific to their background when possible

            STRICT CHARACTER LIMIT: Each note must be under 250 characters including spaces.

            Return ONLY a valid JSON object with this exact format:
            {
              "format1": "Collaborative feedback-seeking message",
              "format2": "Research and insights gathering message", 
              "format3": "Expertise validation message"
            }

            Do not include any other text, explanations, or formatting outside the JSON.`
          },
          {
            role: "user",
            content: `Generate 3 personalized LinkedIn connection notes based on this profile/page content:

${pageContent.substring(0, 2000)}

Focus on their specific role, industry, and experience. Make each note feel personalized and authentic while staying under 250 characters each.`
          }
        ],
        model: "llama-3.3-70b-versatile",
        temperature: 0.7,
        max_tokens: 1000,
        top_p: 0.9,
        frequency_penalty: 0.1,
        presence_penalty: 0.1
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content received from API');
    }

    // Enhanced JSON parsing with better error handling
    let cleanContent = content.trim();
    
    // Remove any markdown code block formatting
    cleanContent = cleanContent.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    
    // Find the JSON object boundaries
    const jsonStart = cleanContent.indexOf('{');
    const jsonEnd = cleanContent.lastIndexOf('}') + 1;
    
    if (jsonStart !== -1 && jsonEnd !== -1) {
      cleanContent = cleanContent.substring(jsonStart, jsonEnd);
    }

    try {
      const notes = JSON.parse(cleanContent);
      
      // Validate that we have the expected format and content
      if (notes.format1 && notes.format2 && notes.format3) {
        return [
          { 
            type: "🎯 Collaborative Feedback", 
            content: validateAndCleanNote(notes.format1)
          },
          { 
            type: "💬 Research & Insights", 
            content: validateAndCleanNote(notes.format2)
          },
          { 
            type: "⚡ Expertise Validation", 
            content: validateAndCleanNote(notes.format3)
          }
        ];
      } else {
        throw new Error('Invalid response format from AI - missing required formats');
      }
    } catch (parseError) {
      console.error('JSON parsing failed:', parseError);
      console.log('Raw AI response:', content);
      
      // Enhanced fallback with better extraction
      return generateFallbackNotes(pageContent, content);
    }
  } catch (error) {
    console.error('Error generating notes:', error);
    
    // If it's an API error, provide more specific error message
    if (error.message.includes('401')) {
      throw new Error('Invalid API key. Please check your Groq API key and try again.');
    } else if (error.message.includes('429')) {
      throw new Error('API rate limit exceeded. Please wait a moment and try again.');
    } else if (error.message.includes('500')) {
      throw new Error('Groq API server error. Please try again in a few moments.');
    }
    
    throw error;
  }
}

function validateAndCleanNote(note) {
  if (!note || typeof note !== 'string') {
    return "Hi! We're building an AI tool for workflow automation. Your expertise would be valuable for our research. Open to a quick 15-min call?";
  }
  
  // Clean the note and ensure it's under 250 characters
  let cleanNote = note.replace(/["""]/g, '"').trim();
  
  if (cleanNote.length > 250) {
    cleanNote = cleanNote.substring(0, 247) + "...";
  }
  
  return cleanNote;
}

function generateFallbackNotes(pageContent, aiResponse) {
  // Try to extract any usable content from the AI response
  const lines = aiResponse.split('\n').filter(line => 
    line.trim() && 
    !line.includes('{') && 
    !line.includes('}') && 
    !line.includes('"format') &&
    line.length > 30 &&
    line.length < 300
  );
  
  // If we have enough extracted lines, use them
  if (lines.length >= 3) {
    return [
      { type: "🎯 Collaborative Feedback", content: validateAndCleanNote(lines[0]) },
      { type: "💬 Research & Insights", content: validateAndCleanNote(lines[1]) },
      { type: "⚡ Expertise Validation", content: validateAndCleanNote(lines[2]) }
    ];
  }

  // Last resort: High-quality fallback templates with personalization attempt
  const hasTitle = pageContent.toLowerCase().includes('engineer') || 
                  pageContent.toLowerCase().includes('manager') || 
                  pageContent.toLowerCase().includes('director') ||
                  pageContent.toLowerCase().includes('analyst') ||
                  pageContent.toLowerCase().includes('developer');
  
  const industry = extractIndustry(pageContent);
  const experienceLevel = extractExperienceLevel(pageContent);
  
  return [
    { 
      type: "🎯 Collaborative Feedback", 
      content: `Hi! We're building an AI tool for internal apps from prompts. Your ${industry} expertise would be invaluable for our research. Would you be open to a 15-min discovery call?` 
    },
    { 
      type: "💬 Research & Insights", 
      content: `Hi! Building AI that turns workflow needs into tools. Your ${experienceLevel} experience would help us understand real user challenges. Quick 15-min chat to gather insights?` 
    },
    { 
      type: "⚡ Expertise Validation", 
      content: `Hi! Working on AI for internal tools from prompts. Given your background in ${industry}, your feedback would be extremely helpful. Quick discovery call?` 
    }
  ];
}

function extractIndustry(content) {
  const industries = ['operations', 'engineering', 'marketing', 'sales', 'finance', 'product', 'design', 'data', 'consulting', 'healthcare', 'education', 'technology'];
  const lowerContent = content.toLowerCase();
  
  for (const industry of industries) {
    if (lowerContent.includes(industry)) {
      return industry;
    }
  }
  return 'professional';
}

function extractExperienceLevel(content) {
  const lowerContent = content.toLowerCase();
  
  if (lowerContent.includes('senior') || lowerContent.includes('lead') || lowerContent.includes('principal')) {
    return 'senior-level';
  } else if (lowerContent.includes('director') || lowerContent.includes('vp') || lowerContent.includes('head of')) {
    return 'leadership';
  } else if (lowerContent.includes('manager') || lowerContent.includes('supervisor')) {
    return 'management';
  }
  return 'extensive';
} 