import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import DOMPurify from 'dompurify';
import './TextRenderer.scss';

/**
 * Checks whether the input string contains meaningful HTML markup
 * (beyond simple inline tags like <b>, <i>, <em>, <strong>, <br>, <a>, <u>
 * which are already handled by preprocessMarkdown).
 * Returns true for rich/structural HTML like <div>, <span>, <table>, <style>, etc.
 */
const containsRichHtml = (text) => {
  if (!text) return false;
  // Tags that are already converted to markdown by preprocessMarkdown
  const inlineTags = 'b|strong|i|em|u|br|a';
  // Match any HTML tag that is NOT one of the simple inline tags
  const richHtmlRegex = new RegExp(`<(?!\/?(${inlineTags})\\b)[a-zA-Z][a-zA-Z0-9]*[\\s>]`, 'i');
  return richHtmlRegex.test(text);
};

/**
 * Preprocesses markdown content to improve list formatting
 */
const preprocessMarkdown = (content) => {
  if (!content) return '';
  
  return content
    // First, convert escaped newlines to actual newlines
    .replace(/\\n/g, '\n')
    // Convert anchor tags to Markdown links (handle both single and double quotes)
    .replace(/<a\s+href=['"]([^'"]+)['"][^>]*>(.*?)<\/a>/gi, '[$2]($1)')
    // Convert HTML tags to Markdown syntax (trim spaces inside tags)
    .replace(/<b>\s*(.*?)\s*<\/b>/g, '**$1**')  // <b> to **bold**
    .replace(/<strong>\s*(.*?)\s*<\/strong>/g, '**$1**')  // <strong> to **bold**
    .replace(/<i>\s*(.*?)\s*<\/i>/g, '*$1*')  // <i> to *italic*
    .replace(/<em>\s*(.*?)\s*<\/em>/g, '*$1*')  // <em> to *italic*
    .replace(/<u>\s*(.*?)\s*<\/u>/g, '__$1__')  // <u> to __underline__
    .replace(/<br\s*\/?>/g, '\n')  // <br> to newline
    // Ensure proper line breaks before numbered lists (at line start)
    .replace(/(^|\n)(\d+\.\s+)/g, '$1\n$2')
    // Ensure proper line breaks before the first bullet point in a list (-, •) but NOT * (to preserve **bold**)
    // Only add a blank line before a bullet that follows a non-list line (paragraph → list transition)
    .replace(/(^|\n)([^\n-•]*[a-zA-Z0-9][^\n]*)\n([-•]\s+)/g, '$1$2\n\n$3')
    // Handle list items with - or • appearing directly after text without newline
    // Only treat as a new bullet when preceded by sentence-ending punctuation (to avoid splitting inline hyphens like "KSO- ORLANDO")
    .replace(/([.!?:)\"])\s*([-•])\s+/g, '$1\n\n$2 ')
    // Handle nested list items with proper indentation
    .replace(/(\n\s{2,})([-•]|\d+\.)\s+/g, '\n    $2 ')
    // Ensure double line breaks after list sections
    .replace(/(\n\d+\.\s+.*?)(\n\n###)/g, '$1\n$2')
    .replace(/(\n[-•]\s+.*?)(\n\n###)/g, '$1\n$2')
    // Clean up extra whitespace (but preserve markdown formatting)
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

/**
 * Custom components for markdown rendering
 */
const markdownComponents = {
  // Custom link component with target="_blank"
  a: ({ href, children, ...props }) => (
    <a 
      href={href} 
      target="_blank" 
      rel="noopener noreferrer" 
      {...props}
    >
      {children}
    </a>
  ),
  
  // Custom code component
  code: ({ children, className, ...props }) => (
    <code 
      className={`markdown-code ${className || ''}`} 
      {...props}
    >
      {children}
    </code>
  ),
  
  // Custom pre component for code blocks
  pre: ({ children, ...props }) => (
    <pre className="markdown-pre" {...props}>
      {children}
    </pre>
  ),
  
  // Custom paragraph component
  p: ({ children, ...props }) => (
    <p className="markdown-paragraph" {...props}>
      {children}
    </p>
  ),
  
  // Custom heading components
  h1: ({ children, ...props }) => (
    <h1 className="markdown-heading markdown-h1" {...props}>
      {children}
    </h1>
  ),
  h2: ({ children, ...props }) => (
    <h2 className="markdown-heading markdown-h2" {...props}>
      {children}
    </h2>
  ),
  h3: ({ children, ...props }) => (
    <h3 className="markdown-heading markdown-h3" {...props}>
      {children}
    </h3>
  ),
  
  // Custom list components
  ul: ({ children, ...props }) => (
    <ul className="markdown-list markdown-unordered-list" {...props}>
      {children}
    </ul>
  ),
  ol: ({ children, ...props }) => (
    <ol className="markdown-list markdown-ordered-list" {...props}>
      {children}
    </ol>
  ),
  li: ({ children, ...props }) => (
    <li className="markdown-list-item" {...props}>
      {children}
    </li>
  ),
};

/**
 * Markdown renderer component with sanitization
 */
export const TextRenderer = ({ text: originalText, thinking }) => {
  // ===== TEST OVERRIDE — REMOVE AFTER TESTING =====
  const TEST_HTML = `
    <div style="font-family:sans-serif;max-width:500px;">
      <style>
        .test-card { background:#fff; border:1px solid #e0e0e0; border-radius:12px; padding:16px; margin-bottom:12px; }
        .test-card h3 { margin:0 0 8px; font-size:15px; color:#1a1a1a; }
        .test-card p { margin:0; font-size:13px; color:#666; line-height:1.5; }
        .test-badge { display:inline-block; font-size:11px; font-weight:500; padding:2px 10px; border-radius:99px; }
        .test-green { background:#eaf3de; color:#27500a; }
        .test-amber { background:#faeeda; color:#633806; }
        .test-meta { display:flex; justify-content:space-between; font-size:12px; padding:4px 0; border-bottom:1px solid #f0f0f0; }
        .test-meta:last-child { border-bottom:none; }
        .test-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
        .test-metric { background:#f5f5f0; border-radius:8px; padding:12px; }
        .test-metric-label { font-size:11px; color:#888; margin-bottom:4px; }
        .test-metric-value { font-size:20px; font-weight:600; }
      </style>
      <div class="test-card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
          <h3>Luminary Pro</h3>
          <span class="test-badge test-green">In stock</span>
        </div>
        <p>Real-time dashboards, custom reports, and AI-powered forecasting for mid-market teams.</p>
        <div style="margin-top:12px;">
          <div class="test-meta"><span style="color:#888;">SKU</span><span>LMP-00291</span></div>
          <div class="test-meta"><span style="color:#888;">Unit price</span><span style="font-weight:600;">$249 / mo</span></div>
          <div class="test-meta"><span style="color:#888;">Margin</span><span style="color:#27500a;">68%</span></div>
        </div>
      </div>
      <div class="test-grid">
        <div class="test-metric">
          <div class="test-metric-label">Revenue</div>
          <div class="test-metric-value">$128K</div>
        </div>
        <div class="test-metric">
          <div class="test-metric-label">Users</div>
          <div class="test-metric-value">9,821</div>
        </div>
      </div>
    </div>
  `;
  const text = originalText; // Override input with test HTML — REMOVE AFTER TESTING
  // ===== END TEST OVERRIDE =====

  // Debug logging
  
  // If the input contains rich HTML, render it directly with DOMPurify sanitization
  if (containsRichHtml(text)) {
    const sanitizedHtml = DOMPurify.sanitize(text, {
      ADD_TAGS: ['style'],
      ADD_ATTR: ['style', 'class', 'target', 'rel'],
    });
    return (
      <div
        className={`markdown-content md-content ${thinking ? "thinking" : ""}`}
        dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
      />
    );
  }

  // Otherwise, use the existing markdown pipeline
  const processedContent = preprocessMarkdown(text);
  
  return (
    <>
      {processedContent && (
        <div className={`markdown-content md-content ${thinking ? "thinking" : ""}`}>
          <ReactMarkdown
            components={markdownComponents}
            remarkPlugins={[remarkGfm, remarkBreaks]}
            rehypePlugins={[rehypeSanitize]}
          >
            {processedContent}
          </ReactMarkdown>
        </div>
      )}
    </>
  );
};


/**
 * the response text
 * 
 * Here are the top 100 Coach locations in **Retail-Store** for the **last completed week**, ranked by **Revenue**.\n\n- The top 3 locations were **E-Commerce-JAX-Dummy** (**$13,231,764**), **E-Commerce-VEGAS-Dummy** (**$4,442,124**), and **E-Commerce CAN** (**$2,152,645**).\n- Rounding out the top 5 were **Factory Dot Com-VEGAS-Dummy** (**$1,297,590**) and **Factory Dot Com-JAX-Dummy** (**$1,064,977**).\n- Among named outlet/retail locations in the results, **Citadel Outlets** ranked highest at **#6** with **$865,405** in revenue.\n\nThe full ranked list of 100 stores is shown in the table.\n\n"
 */