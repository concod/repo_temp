import { lululemonTrendConfig } from '../config/lululemonTrendConfig';
import { parseHTMLResponse, formatText } from '../utils/messageParser';

export class LululemonTrendService {
  private config = lululemonTrendConfig;
  private API_URL = this.config.baseUrl;
  

  async sendMessage(userMessage: string): Promise<{
    text: string;
    sources: string[];
    suggestions: string[];
    timing: string | null;
  }> {
    const payload = {
      agentId: this.config.agentId,
      userInput: userMessage,
    };

    const startTime = performance.now();

    try {
      const response = await fetch(`${this.API_URL}${this.config.apiEndpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'AGENT-API-KEY': this.config.apiKey,
        },
        body: JSON.stringify(payload),
      });

      const endTime = performance.now();
      const actualResponseTime = ((endTime - startTime) / 1000).toFixed(2);
      const actualTiming = `${actualResponseTime} seconds`;

      if (!response.ok) {
        let errorMessage = 'An error occurred while processing your request.';
        try {
          const errorData = await response.json();
          if (errorData.message) errorMessage = errorData.message;
          else if (errorData.error) errorMessage = errorData.error;
          else if (errorData.detail) errorMessage = errorData.detail;
        } catch {
          if (response.status === 401) errorMessage = 'Invalid API key or agent ID';
          else if (response.status === 403) errorMessage = 'Access denied to this agent';
          else if (response.status === 404) errorMessage = 'Agent not found';
          else if (response.status >= 500) errorMessage = 'Server error. Please try again later.';
          else errorMessage = `Request failed with status ${response.status}`;
        }
        throw new Error(errorMessage);
      }

      const responseData = await response.json();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result: any = responseData.result || responseData;

      if (result && result.type === 'error') {
        let errorMessage = 'An error occurred while processing your request.';
        if (result.content && result.content.message) {
          errorMessage = result.content.message;
          if (result.content.details) {
            errorMessage += `\n\nDetails: ${result.content.details}`;
          }
        }
        throw new Error(errorMessage);
      }

      let parsed;
      
      // Priority 1: Check html_content field (preferred HTML content)
      if (result && result.html_content && typeof result.html_content === 'string' && result.html_content.trim()) {
        parsed = parseHTMLResponse(result.html_content);
      } 
      // Priority 2: Check content.text (HTML content from agent)
      else if (result && result.content && typeof result.content.text === 'string' && result.content.text.trim()) {
        const htmlContent = result.content.text;
        parsed = parseHTMLResponse(htmlContent);
      } 
      // Priority 3: Fallback to plain text parsing
      else {
        let responseText = '';
        if (result && typeof result.answer === 'string' && result.answer.trim()) responseText = result.answer;
        else if (result && typeof result.response === 'string' && result.response.trim()) responseText = result.response;
        else if (result && typeof result.result === 'string' && result.result.trim()) responseText = result.result;
        else if (result && typeof result.text === 'string' && result.text.trim()) responseText = result.text;
        else if (result && typeof result === 'string' && result.trim()) responseText = result;
        else {
          console.warn("Couldn't find a valid response field in:", result);
          responseText = "Response received but couldn't extract text. Please try again.";
        }

        const lines = responseText.split('\n');
        let content = '';
        const sources: string[] = [];
        const suggestions: string[] = [];
        let inSources = false;
        let inSuggestions = false;
        
        for (let line of lines) {
          line = line.trim();
          if (!line) { if (inSources) inSources = false; continue; }
          if (line.startsWith('Sources:')) { inSources = true; inSuggestions = false; continue; }
          else if (line.startsWith('Suggestive Questions:')) { inSuggestions = true; inSources = false; continue; }
          else if (line.toLowerCase().includes('seconds')) { inSources = false; inSuggestions = false; continue; }
          if (inSources && line) { const cleanSource = line.replace(/^\*\s*/, '').trim(); if (cleanSource) sources.push(cleanSource); }
          else if (inSuggestions && line.endsWith('?')) { const cleanSuggestion = line.replace(/^\*\s*/, '').trim(); if (cleanSuggestion) suggestions.push(cleanSuggestion); }
          else if (!inSources && !inSuggestions && line) { content += line + '\n'; }
        }

        parsed = {
          content: formatText(content.trim()),
          sources: sources,
          references: [],
          suggestions: suggestions,
          timing: null
        };
      }

      return {
        text: parsed.content,
        sources: parsed.sources.length > 0 ? parsed.sources : parsed.references,
        suggestions: parsed.suggestions,
        timing: actualTiming,
      };
    } catch (error) {
      console.error('Lululemon Trend API Error:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : "I'm having trouble connecting right now. Please try again in a moment.";
      throw new Error(errorMessage);
    }
  }
}


