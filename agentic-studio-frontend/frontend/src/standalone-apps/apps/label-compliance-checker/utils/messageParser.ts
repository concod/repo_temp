import type { ParsedResponse } from '../types/chat.types';

/**
 * Parse markdown response content to extract content, sources, suggestions, and timing
 */
export function parseMarkdownResponse(markdownText: string): ParsedResponse {
  // Convert escaped Unicode sequences to actual emojis
  let processedText = markdownText.replace(/\\u([0-9a-fA-F]{4})/g, (_, code) => {
    return String.fromCharCode(parseInt(code, 16));
  });
  
  // Convert literal \n strings to actual newline characters
  processedText = processedText.replace(/\\n/g, '\n');
  
  let content = '';
  let sources: string[] = [];
  let references: string[] = [];
  let suggestions: string[] = [];
  let timing: string | null = null;
  
  // Split by lines and process
  const lines = processedText.split('\n');
  let inSources = false;
  let inReferences = false;
  let inSuggestions = false;
  let inExecutionTime = false;
  
  for (let line of lines) {
    line = line.trim();
    
    // Skip empty lines in parsing sections
    if (!line && (inSources || inReferences || inSuggestions || inExecutionTime)) {
      continue;
    }
    
    // Check for section headers
    if (line.startsWith('Sources:')) {
      inSources = true;
      inReferences = false;
      inSuggestions = false;
      inExecutionTime = false;
      continue;
    } else if (line.startsWith('References:')) {
      inReferences = true;
      inSources = false;
      inSuggestions = false;
      inExecutionTime = false;
      continue;
    } else if (line.startsWith('Suggestive Questions:')) {
      inSuggestions = true;
      inSources = false;
      inReferences = false;
      inExecutionTime = false;
      continue;
    } else if (line.startsWith('Execution Time:')) {
      inExecutionTime = true;
      inSources = false;
      inReferences = false;
      inSuggestions = false;
      // Skip parsing timing from content - will be measured at API level
      continue;
    }
    
    // Process content based on current section
    if (inSources && line) {
      const cleanSource = line.replace(/^\*\s*/, '').trim();
      if (cleanSource) {
        sources.push(cleanSource);
      }
    } else if (inReferences && line) {
      const cleanReference = line.replace(/^\*\s*/, '').trim();
      if (cleanReference) {
        references.push(cleanReference);
      }
    } else if (inSuggestions && line) {
      const cleanSuggestion = line.replace(/^\*\s*/, '').trim();
      if (cleanSuggestion) {
        suggestions.push(cleanSuggestion);
      }
    } else if (inExecutionTime && line) {
      // Skip parsing timing from content - will be measured at API level
      continue;
    } else if (!inSources && !inSuggestions && !inExecutionTime && line) {
      content += line + '\n';
    }
  }
  
  // If both sources and references exist, prefer sources
  if (sources.length > 0 && references.length > 0) {
    references = [];
  }
  
  return {
    content: content.trim(),
    sources: sources,
    references: references,
    suggestions: suggestions,
    timing: timing
  };
}

/**
 * Parse HTML response content (fallback)
 */
export function parseHTMLResponse(htmlContent: string): ParsedResponse {
  const unicodeProcessedHtml = htmlContent.replace(/\\u([0-9a-fA-F]{4})/g, (_, code) => {
    return String.fromCharCode(parseInt(code, 16));
  });
  
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = unicodeProcessedHtml;
  
  let content = '';
  let sources: string[] = [];
  let references: string[] = [];
  let suggestions: string[] = [];
  let timing: string | null = null;
  
  const htmlText = tempDiv.innerHTML;
  const parts = htmlText.split('<br>');
  
  let inSources = false;
  let inReferences = false;
  let inSuggestions = false;
  
  for (let part of parts) {
    const cleanText = part.replace(/<[^>]*>/g, '').trim();
    
    if (!cleanText) continue;
    
    if (cleanText.startsWith('Sources:')) {
      inSources = true;
      inReferences = false;
      inSuggestions = false;
      continue;
    } else if (cleanText.startsWith('References:')) {
      inReferences = true;
      inSources = false;
      inSuggestions = false;
      continue;
    } else if (cleanText.startsWith('Suggestive Questions:')) {
      inSuggestions = true;
      inSources = false;
      inReferences = false;
      continue;
    } else if (cleanText.toLowerCase().includes('seconds')) {
      const timingMatch = cleanText.match(/([\d\.]+)\s*seconds/i);
      if (timingMatch) {
        timing = `${timingMatch[1]} seconds`;
      }
      inSources = false;
      inReferences = false;
      inSuggestions = false;
      continue;
    }
    
    if (inSources && cleanText) {
      const cleanSource = cleanText.replace(/^\*\s*/, '').trim();
      if (cleanSource) {
        sources.push(cleanSource);
      }
    } else if (inReferences && cleanText) {
      const cleanReference = cleanText.replace(/^\*\s*/, '').trim();
      if (cleanReference) {
        references.push(cleanReference);
      }
    } else if (inSuggestions && cleanText.endsWith('?')) {
      const cleanSuggestion = cleanText.replace(/^\*\s*/, '').trim();
      if (cleanSuggestion) {
        suggestions.push(cleanSuggestion);
      }
    } else if (!inSources && !inSuggestions && cleanText) {
      content += cleanText + '\n';
    }
  }
  
  if (sources.length > 0 && references.length > 0) {
    references = [];
  }
  
  return {
    content: formatText(content.trim()),
    sources: sources,
    references: references,
    suggestions: suggestions,
    timing: timing
  };
}

/**
 * Format text with basic HTML (fallback)
 */
export function formatText(text: string): string {
  let processedText = text.replace(/\\n/g, '\n');
  processedText = processedText.replace(/\n/g, '<br>');
  processedText = processedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  return processedText;
}

/**
 * Extract source name from URL or filename
 */
export function extractSourceName(source: string): string {
  if (source.includes('.pdf') || source.includes('.doc') || source.includes('.txt')) {
    let name = source;
    if (name.includes('/')) {
      name = name.split('/').pop() || name;
    }
    name = name.replace(/\.[^/.]+$/, '');
    name = name.replace(/[-_]/g, ' ');
    name = name.replace(/\b\w/g, l => l.toUpperCase());
    return name;
  }
  
  return source;
}
