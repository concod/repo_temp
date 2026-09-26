import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import remarkBreaks from 'remark-breaks';
import type { Components } from 'react-markdown';

/**
 * Custom components for markdown rendering
 */
const markdownComponents: Components = {
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

interface MarkdownRendererProps {
  content: string | null | undefined;
  className?: string;
}

/**
 * Preprocesses markdown content to improve list formatting
 */
const preprocessMarkdown = (content: string | null | undefined): string => {
  // Handle null, undefined, or non-string content
  if (!content || typeof content !== 'string') {
    return '';
  }

  return content
    // Ensure proper line breaks before numbered lists
    .replace(/(\n?)(\d+\.\s+)/g, '\n\n$2')
    // Ensure proper line breaks before bullet points
    .replace(/(\n?)(•\s+)/g, '\n\n$2')
    // Handle nested list items with proper indentation
    .replace(/(\n\s{2,})(•|\d+\.)/g, '\n    $2')
    // Ensure double line breaks after list sections
    .replace(/(\n\d+\.\s+.*?)(\n\n###)/g, '$1\n$2')
    .replace(/(\n•\s+.*?)(\n\n###)/g, '$1\n$2')
    // Clean up extra whitespace
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

/**
 * Markdown renderer component with sanitization
 */
export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ 
  content, 
  className = '' 
}) => {
  const processedContent = preprocessMarkdown(content);
  
  // If no content after processing, return empty div
  if (!processedContent) {
    return <div className={`markdown-content ${className}`} />;
  }
  
  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown
        components={markdownComponents}
        remarkPlugins={[remarkBreaks]}
        rehypePlugins={[rehypeSanitize]}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
};
