import { httpClient } from './httpClient';

/**
 * Chatbot Service
 * Handles all chatbot-related API calls
 */
export class ChatbotService {
  /**
   * Send message to agent and get streaming response
   * POST /api/agent/infer/stream
   */
  static async sendMessage(agentId: string, userInput: string): Promise<Response> {
    try {
      console.log('[ChatbotService] Sending message to agent:', { agentId, userInput });
      
      const formData = new FormData();
      formData.append('agentId', agentId);
      formData.append('userInput', userInput);

      const response = await httpClient.fetchStream('/api/agent/infer/stream', {
        method: 'POST',
        headers: {
          'Accept': '*/*',
        },
        body: formData
      });

      console.log('[ChatbotService] Stream response received:', response.status);
      return response;
      
    } catch (error) {
      console.error('[ChatbotService] Failed to send message:', error);
      throw error;
    }
  }

  /**
   * Parse streaming response from agent
   */
  static async parseStreamResponse(response: Response): Promise<string> {
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body available');

    const decoder = new TextDecoder();
    let botResponse = '';
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine) continue;

          try {
            const data = JSON.parse(trimmedLine);
            if (data.status === 'complete' && data.result?.content?.text) {
              botResponse = data.result.content.text;
            } else if (data.content) {
              // Direct content (fallback)
              botResponse += data.content;
            }
          } catch (e) {
            console.debug('[ChatbotService] JSON parse error (expected for partial chunks):', e);
          }
        }
      }

      // Process any remaining data in buffer
      if (buffer.trim()) {
        try {
          const data = JSON.parse(buffer.trim());
          if (data.status === 'complete' && data.result?.content?.text) {
            botResponse = data.result.content.text;
          }
        } catch (e) {
          console.debug('[ChatbotService] Final buffer parse error:', e);
        }
      }

      return botResponse.trim() || 'Sorry, I didn\'t receive a response. Please try again.';
      
    } catch (error) {
      console.error('[ChatbotService] Error parsing stream response:', error);
      throw error;
    }
  }
}

export default ChatbotService;
