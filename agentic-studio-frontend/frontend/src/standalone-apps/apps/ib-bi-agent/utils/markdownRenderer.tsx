import React from "react";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkBreaks from "remark-breaks";
import type { Components } from "react-markdown";

const getTextFromChildren = (children: React.ReactNode): string => {
  return React.Children.toArray(children)
    .map((child) => (typeof child === "string" ? child : ""))
    .join("")
    .trim();
};

const markdownComponents: Components = {
  a: ({ href, children, ...props }) => {
    const text = getTextFromChildren(children);
    const citationMatch = text.match(/^\[\[(\d+)\]\]$/);

    if (citationMatch) {
      return (
        <sup className="ib-agent-citation-sup">
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="ib-agent-citation-link"
            aria-label={`Open citation ${citationMatch[1]}`}
            {...props}
          >
            {citationMatch[1]}
          </a>
        </sup>
      );
    }

    return (
      <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
        {children}
      </a>
    );
  },
  code: ({ children, className, ...props }) => (
    <code className={`ib-markdown-code ${className ?? ""}`} {...props}>
      {children}
    </code>
  ),
  pre: ({ children, ...props }) => (
    <pre className="ib-markdown-pre" {...props}>
      {children}
    </pre>
  ),
  p: ({ children, ...props }) => (
    <p className="ib-markdown-p" {...props}>
      {children}
    </p>
  ),
  h1: ({ children, ...props }) => (
    <h1 className="ib-markdown-h1" {...props}>
      {children}
    </h1>
  ),
  h2: ({ children, ...props }) => (
    <h2 className="ib-markdown-h2" {...props}>
      {children}
    </h2>
  ),
  h3: ({ children, ...props }) => (
    <h3 className="ib-markdown-h3" {...props}>
      {children}
    </h3>
  ),
  ul: ({ children, ...props }) => (
    <ul className="ib-markdown-ul" {...props}>
      {children}
    </ul>
  ),
  ol: ({ children, ...props }) => (
    <ol className="ib-markdown-ol" {...props}>
      {children}
    </ol>
  ),
  li: ({ children, ...props }) => (
    <li className="ib-markdown-li" {...props}>
      {children}
    </li>
  ),
};

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

const preprocessMarkdown = (content: string): string => {
  return content
    .replace(/(\d{4})\.\s/g, "$1\\. ")
    .replace(/(\n?)(\d+\.\s+)/g, "\n\n$2")
    .replace(/(\n?)(•\s+)/g, "\n\n$2")
    .replace(/(\n\s{2,})(•|\d+\.)/g, "\n    $2")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};


export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  className = "",
}) => {
  const processedContent = preprocessMarkdown(content);

  return (
    <div className={`ib-markdown-content ${className}`}>
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
