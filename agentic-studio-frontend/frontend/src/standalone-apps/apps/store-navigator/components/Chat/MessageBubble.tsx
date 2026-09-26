import type {
  AgentResponse,
  AIMessageBlock,
  ChatMessage,
  UserMessageBlock,
} from "../../types/chat.types";
import "./MessageBubble.scss";
import chatBot from "../../assets/chatbot.png";
import { MarkdownRenderer } from "../../utils/markdownRenderer";
import type { ProductRecommendation } from "../../hooks/useFetchSearchResults";
import { useProductStore } from "../../store/productStore";
import ProductCard from "../ProductCard/ProductCard";

const MessageBubble = ({ message }: { message: ChatMessage }) => {
  const { isUser, messageBlock } = message;
  const { products } = useProductStore();

  return (
    <div className={`message-bubble-wrapper ${isUser ? "user" : "ai"}`}>
      {!isUser && (
        <div className="ai-avatar">
          <img src={chatBot} alt="AI" />
        </div>
      )}

      <div className="message-content">
        {isUser ? (
          // Render User Message
          <div className="bubble user-bubble">
            {(messageBlock as UserMessageBlock).text}
          </div>
        ) : (
          // Render AI Message Block
          <>
            <div className="ai-response-container">
              {(messageBlock as AIMessageBlock).messages.map((item) => {
                if (item.type === "agent") {
                  return (
                    <div className="bubble ai-bubble">
                      {item.status === "error" ? (
                        <div className="error">Something went wrong</div>
                      ) : (
                        <>
                          {(item.data as AgentResponse).text ? (
                            <MarkdownRenderer
                              content={(item.data as AgentResponse).text}
                            />
                          ) : (
                            <div
                              dangerouslySetInnerHTML={{
                                __html: (
                                  item.data as AgentResponse
                                ).html.replace(/\n/g, "<br>"),
                              }}
                            />
                          )}
                        </>
                      )}
                    </div>
                  );
                } else {
                  return (
                    <div className="bubble ai-bubble recommendation-bubble">
                      {(item.data as ProductRecommendation).productIds.length >
                        0 && (
                        <>
                          <p className="rec-header">
                            Here are the products you are looking for
                          </p>
                          <div className="rec-container">
                            {products
                              .filter((p) =>
                                (
                                  item.data as ProductRecommendation
                                ).productIds.includes(p.id)
                              )
                              .map((p) => (
                                <div key={p.id} className="rec-container__item">
                                  <ProductCard product={p} />
                                </div>
                              ))}
                          </div>
                        </>
                      )}

                      <p className="rec-header">Recommendations</p>
                      <div className="rec-container">
                        {products
                          .filter((p) =>
                            (
                              item.data as ProductRecommendation
                            ).suggestedProductIds!.includes(p.id)
                          )
                          .map((p) => (
                            <div key={p.id} className="rec-container__item">
                              <ProductCard product={p} />
                            </div>
                          ))}
                      </div>
                    </div>
                  );
                }
              })}
              {(messageBlock as AIMessageBlock).isLoading && (
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
