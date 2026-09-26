import type { ParsedResponse } from '../types/chat.types';

export function parseHTMLResponse(htmlContent: string): ParsedResponse {
  // Process unicode escapes
  const unicodeProcessedHtml = htmlContent.replace(/\\u([0-9a-fA-F]{4})/g, (_, code) => {
    return String.fromCharCode(parseInt(code, 16));
  });
  
  // Lightweight sanitizer/fixer for common LLM HTML quirks
  // 1) Close headings like <h3>Title<h3> -> <h3>Title</h3>
  let sanitizedHtml = unicodeProcessedHtml
    .replace(/<h1>([\s\S]*?)<h1>/gi, '<h1>$1</h1>')
    .replace(/<h2>([\s\S]*?)<h2>/gi, '<h2>$1</h2>')
    .replace(/<h3>([\s\S]*?)<h3>/gi, '<h3>$1</h3>')
    .replace(/<h4>([\s\S]*?)<h4>/gi, '<h4>$1</h4>')
    .replace(/<h5>([\s\S]*?)<h5>/gi, '<h5>$1</h5>')
    .replace(/<h6>([\s\S]*?)<h6>/gi, '<h6>$1</h6>');
  
  // 2) Normalize header cells if a header row accidentally uses a TD for "URL"
  sanitizedHtml = sanitizedHtml.replace(/<td>\s*URL\s*<\/td>/gi, '<th>URL</th>');

  // 3) First, protect table content and make URLs in tables clickable
  const tablePlaceholders: string[] = [];
  sanitizedHtml = sanitizedHtml.replace(/<table[^>]*>[\s\S]*?<\/table>/gi, (match) => {
    // Make URLs in tables clickable if they're not already in anchor tags
    let tableContent = match;
    
    // Convert plain URLs anywhere in table cells to clickable links
    // This handles URLs that might be in td, th, or other table elements
    tableContent = tableContent.replace(/(<t[dh][^>]*>)([^<]*?)(https?:\/\/[^\s<>"']+)([^<]*?)(<\/t[dh]>)/gi, (fullMatch, openTag, beforeUrl, url, afterUrl, closeTag) => {
      // Check if URL is already inside an anchor tag
      if (fullMatch.includes('<a')) {
        return fullMatch; // Already a link, leave as-is
      }
      // Make the URL clickable
      return `${openTag}${beforeUrl}<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>${afterUrl}${closeTag}`;
    });
    
    // Also handle URLs that might be standalone in table cells (no other text)
    tableContent = tableContent.replace(/(<t[dh][^>]*>)\s*(https?:\/\/[^\s<>"']+)\s*(<\/t[dh]>)/gi, (fullMatch, openTag, url, closeTag) => {
      // Check if already a link
      if (fullMatch.includes('<a')) {
        return fullMatch;
      }
      return `${openTag}<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>${closeTag}`;
    });
    
    const placeholder = `__TABLE_${tablePlaceholders.length}__`;
    tablePlaceholders.push(tableContent);
    return placeholder;
  });

  // 4) Now process anchor tags outside of tables - abbreviate long URLs
  const anchorPlaceholders: string[] = [];
  sanitizedHtml = sanitizedHtml.replace(/<a\s+([^>]*?)href=["']([^"']+)["']([^>]*?)>([^<]*?)<\/a>/gi, (match, beforeHref, url, afterAttrs, linkText) => {
    void match;
    // Extract filename from URL for display
    let displayText = linkText.trim();
    
    // If link text is the same as URL or very long, abbreviate it
    if (linkText.trim() === url || linkText.length > 60) {
      try {
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/');
        const filename = pathParts[pathParts.length - 1];
        
        if (filename && filename.length > 0 && filename !== '/') {
          // Use filename if available (e.g., "lululemon_summary_3665689_ECOMM.xlsx")
          displayText = filename;
        } else {
          // Otherwise use a simple abbreviation
          displayText = 'Download File';
        }
      } catch {
        // If URL parsing fails, use generic text
        displayText = 'Download File';
      }
    }
    
    // Ensure target and rel attributes are present
    const hasTarget = /target=["'][^"']*["']/i.test(beforeHref + afterAttrs);
    const hasRel = /rel=["'][^"']*["']/i.test(beforeHref + afterAttrs);
    
    let finalAttrs = beforeHref.trim();
    if (!hasTarget) {
      finalAttrs += ' target="_blank"';
    }
    if (!hasRel) {
      finalAttrs += ' rel="noopener noreferrer"';
    }
    finalAttrs += afterAttrs.trim();
    
    const placeholder = `__ANCHOR_${anchorPlaceholders.length}__`;
    anchorPlaceholders.push(`<a ${finalAttrs}href="${url}">${displayText}</a>`);
    return placeholder;
  });

  // 5) Remove plain text URLs that appear outside anchor tags (unwanted duplicate links)
  // Since we've replaced anchor tags with placeholders, we can safely remove all remaining URLs
  sanitizedHtml = sanitizedHtml.replace(/(https?:\/\/[^\s<>"']+)/gi, '');

  // 6) Restore anchor tags (with abbreviated text)
  anchorPlaceholders.forEach((anchor, index) => {
    sanitizedHtml = sanitizedHtml.replace(`__ANCHOR_${index}__`, anchor);
  });

  // 7) Restore tables (with their original URLs intact)
  tablePlaceholders.forEach((table, index) => {
    sanitizedHtml = sanitizedHtml.replace(`__TABLE_${index}__`, table);
  });

  // 8) Remove duplicate URLs that appear right before or after anchor tags with the same URL
  sanitizedHtml = sanitizedHtml.replace(/(https?:\/\/[^\s<>"']+)\s*<a[^>]+href=["']\1["'][^>]*>/gi, '<a href="$1" target="_blank" rel="noopener noreferrer">');
  sanitizedHtml = sanitizedHtml.replace(/<\/a>\s*(https?:\/\/[^\s<>"']+)/gi, '</a>');
  
  // 9) Clean up any remaining unwanted visible HTML attributes in text
  sanitizedHtml = sanitizedHtml.replace(/\s+style=["'][^"']*["']/gi, '');
  
  // Return the HTML directly as content (don't strip tags)
  // This allows tables, headings, and formatting to be preserved
  return {
    content: sanitizedHtml,
    sources: [],
    references: [],
    suggestions: [],
    timing: null
  };
}

export function formatText(text: string): string {
  let processedText = text.replace(/\\n/g, '\n');
  processedText = processedText.replace(/\n/g, '<br>');
  processedText = processedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  return processedText;
}

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


