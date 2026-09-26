import React from "react";
import { motion } from "framer-motion";
import type {
  ChartBlock,
  HtmlBlock,
  Message,
  MessageBlock,
  ProductCarouselBlock,
} from "../../types/chat.types";
import avatarIcon from "../../assets/welcome-avatar.svg";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";

interface MessageBubbleProps {
  message: Message;
  isLastBotMessage?: boolean;
}

const MessageBlockRenderer = ({ block }: { block: MessageBlock }) => {
  switch (block.type) {
    case "html":
      return (
        <div className="message-text">
          <div
            dangerouslySetInnerHTML={{ __html: (block as HtmlBlock).html }}
          />
        </div>
      );
    case "product_carousel":
      return (
        <>
          {(block as ProductCarouselBlock).carousels.map((carousel) => (
            <div key={carousel.id} className="message-carousel">
              {carousel.products.map((product) => (
                <div className="product" key={product.id}>
                  <div className="image">
                    <img src={product.imageUrl} />
                  </div>
                  <div className="name">{product.name}</div>
                  <div className="price">
                    {product.currency} {product.price}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </>
      );
    case "chart":
      return (
        <div className="message-chart">
          <HighchartsReact
            highcharts={Highcharts}
            options={(block as ChartBlock).chart}
          />
        </div>
      );

    default:
      return null;
  }
};

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  // Sanitize HTML content for bot messages (similar to AgentChatInterface)
  // const sanitizedHtml = useMemo(() => {
  //   if (!message.htmlContent) return '';

  //   // Process any remaining markdown syntax in the HTML
  //   let processedHtml = message.htmlContent;

  //   // Convert markdown headers that weren't converted
  //   processedHtml = processedHtml.replace(/### \*\*(.*?)\*\*/g, '<h3><strong>$1</strong></h3>');
  //   processedHtml = processedHtml.replace(/### (.*?)(<br>|$)/g, '<h3>$1</h3>$2');
  //   processedHtml = processedHtml.replace(/## \*\*(.*?)\*\*/g, '<h2><strong>$1</strong></h2>');
  //   processedHtml = processedHtml.replace(/## (.*?)(<br>|$)/g, '<h2>$1</h2>$2');
  //   processedHtml = processedHtml.replace(/# \*\*(.*?)\*\*/g, '<h1><strong>$1</strong></h1>');
  //   processedHtml = processedHtml.replace(/# (.*?)(<br>|$)/g, '<h1>$1</h1>$2');

  //   // Convert remaining bold text
  //   processedHtml = processedHtml.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  //   // Convert remaining italic text
  //   processedHtml = processedHtml.replace(/\*(.*?)\*/g, '<em>$1</em>');

  //   // Convert bullet points that use • to proper list items
  //   processedHtml = processedHtml.replace(/((?:^|\n)• .*(?:\n• .*)*)/gm, (match) => {
  //     const items = match.split(/\n?• /).filter(item => item.trim());
  //     const listItems = items.map(item => `<li>${item.trim()}</li>`).join('');
  //     return `<ul>${listItems}</ul>`;
  //   });

  //   // Clean up any double line breaks
  //   processedHtml = processedHtml.replace(/<br>\s*<br>/g, '<br>');

  //   // Sanitize with DOMPurify (same config as AgentChatInterface)
  //   return DOMPurify.sanitize(processedHtml, {
  //     ALLOWED_TAGS: [
  //       'div', 'p', 'br', 'a', 'strong', 'em', 'b', 'i', 'u',
  //       'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  //       'pre', 'code', 'blockquote', 'span', 'table', 'thead',
  //       'tbody', 'tr', 'td', 'th', 'hr', 'img'
  //     ],
  //     ALLOWED_ATTR: [
  //       'href', 'target', 'rel', 'style', 'class', 'id', 'border',
  //       'cellpadding', 'cellspacing', 'width', 'height', 'align',
  //       'src', 'alt', 'onerror'
  //     ]
  //   });
  // }, [message.htmlContent]);

  return (
    <motion.div
      className={`psp-storehub-message ${
        message.isUser ? "user-message" : "bot-message"
      }`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {message.isUser ? (
        <></>
      ) : (
        <div className="message-avatar">
          <div className="avatar-icon">
            <img src={avatarIcon} alt="avatar" />
          </div>
        </div>
      )}

      <div className="message-content">
        {/* Response timing */}
        {!message.isUser && message.timing && (
          <motion.div
            className="response-timing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <i
              className="fas fa-clock"
              style={{ marginRight: "4px", fontSize: "10px" }}
            ></i>
            Response generated in {message.timing}
          </motion.div>
        )}

        {message.isUser ? (
          <div className="message-text">
            <span
              dangerouslySetInnerHTML={{
                __html: (message.text || "").replace(/\n/g, "<br>"),
              }}
            />
          </div>
        ) : (
          <>
            {message.blocks.map((block) => (
              <MessageBlockRenderer key={block.id} block={block} />
            ))}
          </>
        )}

        <div
          className="message-time"
          style={{ textAlign: message.isUser ? "right" : "left" }}
        >
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      </div>
    </motion.div>
  );
};

//  <div dangerouslySetInnerHTML={{ __html: message.htmlContent }} />
