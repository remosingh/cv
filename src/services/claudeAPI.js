import axios from 'axios';

const CLAUDE_API_URL = process.env.REACT_APP_CLAUDE_API_URL || 'https://api.anthropic.com/v1/messages';
const CLAUDE_API_KEY = process.env.REACT_APP_CLAUDE_API_KEY;

/**
 * Send a message to Claude and get a response
 * @param {string} message - The message to send
 * @param {string} systemPrompt - System prompt for the agent
 * @param {Array} conversationHistory - Previous messages in the conversation
 * @returns {Promise<string>} - Claude's response
 */
export async function sendMessageToClaude(message, systemPrompt = '', conversationHistory = []) {
  if (!CLAUDE_API_KEY) {
    throw new Error('Claude API key not configured. Please add REACT_APP_CLAUDE_API_KEY to your .env file');
  }

  try {
    const messages = [
      ...conversationHistory,
      {
        role: 'user',
        content: message
      }
    ];

    const response = await axios.post(
      CLAUDE_API_URL,
      {
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        system: systemPrompt,
        messages: messages
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': CLAUDE_API_KEY,
          'anthropic-version': '2023-06-01'
        }
      }
    );

    return response.data.content[0].text;
  } catch (error) {
    console.error('Error calling Claude API:', error);
    throw new Error(`Claude API Error: ${error.response?.data?.error?.message || error.message}`);
  }
}

/**
 * Send a streaming message to Claude (for future implementation)
 * @param {string} message - The message to send
 * @param {string} systemPrompt - System prompt for the agent
 * @param {Function} onChunk - Callback for each chunk of the response
 * @returns {Promise<void>}
 */
export async function streamMessageToClaude(message, systemPrompt, onChunk) {
  // TODO: Implement streaming for better UX
  const response = await sendMessageToClaude(message, systemPrompt);
  onChunk(response);
}
