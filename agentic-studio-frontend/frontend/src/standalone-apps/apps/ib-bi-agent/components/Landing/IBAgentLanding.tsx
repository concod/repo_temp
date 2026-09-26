import React, { useEffect, useMemo, useRef, useState } from "react";
import DOMPurify from "dompurify";
import { useSearchParams } from "react-router-dom";
import { useChat } from "../../hooks/useChat";
import { useChatStore } from "../../store";
import { useAuthStore } from "../../store/authStore";
import IBIcon from "../../assets/ib-icon.svg";
import IBLogo from "../../assets/ib-logo.svg";
// import IBHomeTab from "../../assets/ib-home-tab.svg";
import IBThunder from "../../assets/ib-thunder.svg";
import IBBullet from "../../assets/ib-bullet.svg";
import IBCopy from "../../assets/ib-copy.svg";
import IBThumbsDown from "../../assets/ib-thumbs-down.svg";
import IBThumbsUp from "../../assets/ib-thumbs-up.svg";
import IASubLogo from "../../assets/ia-sublogo.svg";
import type { Message } from "../../types/chat.types";
import {
  // BellIcon,
  ClockIcon,
  DeepResearchIcon,
  // EqualizerIcon,
  // DownloadIcon,
  // MicIcon,
  // MoreIcon,
  SendIcon,
} from "./icons";
import { LeftButtonGroup } from "./LeftButtonGroup";
import { LeftDrawer } from "./LeftDrawerView";
import { AudioRecorder } from "../AudioRecorder/AudioRecorder";
// import { exportChatReport } from "../../utils/reportExport";
import { MarkdownRenderer } from "../../utils/markdownRenderer";
import { StructuredDataView } from "../StructuredDataView";

const FEEDBACK_STORAGE_KEY = "ibAgentMessageFeedback";
type MessageFeedbackStore = Record<string, Record<string, "up" | "down">>;

const loadFeedbackStore = (): MessageFeedbackStore => {
  if (typeof window === "undefined") return {};
  const raw = window.localStorage.getItem(FEEDBACK_STORAGE_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as MessageFeedbackStore;
  } catch (error) {
    console.warn("Failed to parse feedback store", error);
    return {};
  }
};

const persistSessionFeedback = (
  sessionId: string | null,
  feedback: Record<string, "up" | "down">
) => {
  if (typeof window === "undefined") return;
  const key = sessionId ?? "__default";
  const store = loadFeedbackStore();
  const nextStore = { ...store, [key]: feedback };
  window.localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(nextStore));
};


const stripHtmlLinksFromText = (text: string): string => {
  return text.replace(
    /Visualization:\s*https?:\/\/[^\s\n]+\.html/gi,
    ""
  ).trim();
};


const getSessionFeedback = (
  sessionId: string | null
): Record<string, "up" | "down"> => {
  const store = loadFeedbackStore();
  return store[sessionId ?? "__default"] ?? {};
};

const IB_SPINNER_TEXTS = [
  "Analyzing your request",
] as const;

const EXAMPLE_QUESTIONS = [
  "What was Tractor Supply Company’s total revenue in the latest quarter?",
  "What is Costco’s gross margin for the latest fiscal year?",
  "Compare finances of Tractor Supply Company and Costco for the latest fiscal year.",
] as const;

const IB_GREETING_TITLE = "Welcome to the Business Intelligence Agent";

const getDateGroupKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDateDividerLabel = (date: Date): string => {
  const now = new Date();
  const todayKey = getDateGroupKey(now);
  const targetKey = getDateGroupKey(date);

  if (targetKey === todayKey) {
    return "Today";
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (targetKey === getDateGroupKey(yesterday)) {
    return "Yesterday";
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export const IBAgentLanding: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [inputValue, setInputValue] = useState("");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [spinnerIndex, setSpinnerIndex] = useState(0);
  const [greetingStage, setGreetingStage] = useState(0);
  const [typedGreetingTitle, setTypedGreetingTitle] = useState("");
  const [hasPlayedGreetingIntro, setHasPlayedGreetingIntro] = useState(false);
  // const [exportingMessageId, setExportingMessageId] = useState<string | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [messageFeedback, setMessageFeedback] = useState<Record<string, "up" | "down">>({});
  // const [openActionMenuMessageId, setOpenActionMenuMessageId] = useState<string | null>(null);
  const [isAudioRecording, setIsAudioRecording] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const hasLoadedSessionsRef = useRef(false);
  const hasInitializedSessionRef = useRef(false);

  const { sendMessage, isWaitingForResponse } = useChat();
  const { userName, userEmail, logout } = useAuthStore();
  const {
    messages,
    isTyping,
    currentError,
    classificationResult,
    manualDeepResearch,
    setManualDeepResearch,
    sessions,
    selectedSessionId,
    loading,
    sessionsError,
    conversationError,
    fetchSessions,
    startNewSession,
    selectSession,
    setActiveSessionId,
  } = useChatStore();

  const sessionIdFromUrl = (searchParams.get("session_id") ?? "").trim();

  /** Deep Research is on only when the user manually enables the toggle. */
  const deepResearch = manualDeepResearch;

  const messagesRef = useRef<HTMLDivElement>(null);
  const hasMessages = messages.length > 0;
  const groupedMessages = useMemo(() => {
    return messages.reduce<
      Array<{ key: string; date: Date; messages: Message[] }>
    >((groups: Array<{ key: string; date: Date; messages: Message[] }>, message: Message) => {
      const timestamp = message.clientTimestamp ?? message.timestamp;
      const messageDate =
        timestamp instanceof Date ? timestamp : new Date(timestamp);
      const dateKey = getDateGroupKey(messageDate);
      const lastGroup = groups[groups.length - 1];

      if (!lastGroup || lastGroup.key !== dateKey) {
        groups.push({ key: dateKey, date: messageDate, messages: [message] });
      } else {
        lastGroup.messages.push(message);
      }

      return groups;
    }, []);
  }, [messages]);
  const showAnalyzing = isWaitingForResponse || isTyping;
  const userInitials =
    (userName || userEmail || "IB")
      .split(/\s+|@/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "IB";
  const displayEmail = userEmail || "No email available";

  useEffect(() => {
    if (!isUserMenuOpen) return;

    const handleDocumentClick = (event: MouseEvent) => {
      if (!userMenuRef.current?.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleDocumentClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleDocumentClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isUserMenuOpen]);

  /** Spinner texts: from classification when available, else default. Simple: defaults + status last; complex: status then "Going into Deep Research Mode". */
  const spinnerTexts = useMemo(() => {
    if (!classificationResult) return [...IB_SPINNER_TEXTS];
    // if (classificationResult.type === "simple") {
    //   return [...IB_SPINNER_TEXTS, classificationResult.status];
    // }
    return [...IB_SPINNER_TEXTS, classificationResult.status];
  }, [classificationResult]);

  useEffect(() => {
    if (!showAnalyzing) {
      setSpinnerIndex(0);
      return;
    }

    let timeout: number | undefined;
    let index = 0;

    const step = () => {
      setSpinnerIndex(index);

      const delay = 1200;

      index = Math.min(index + 1, spinnerTexts.length - 1);

      timeout = window.setTimeout(step, delay);
    };

    step();

    return () => {
      if (timeout) {
        window.clearTimeout(timeout);
      }
    };
  }, [showAnalyzing, spinnerTexts]);

  const extractEmbeddableHtmlLinks = (text: string): string[] => {
    const urlRegex = /(https?:\/\/[^\s"'<>]+\.html(?:\?[^\s"'<>]+)?)/gi;
    const allowedDomain = /^https?:\/\/([a-z0-9-]+\.)*impact-agents\.ai\//i;
    const matches = text.match(urlRegex) ?? [];
    return Array.from(new Set(matches.filter((url) => allowedDomain.test(url))));
  };

  const stripEmbeddableHtmlReferences = (text: string): string => {
    if (!text) return text;

    const allowedDomain = /^https?:\/\/([a-z0-9-]+\.)*impact-agents\.ai\//i;
    const moreInfoPattern =
      /^more\s*info\s*:\s*(https?:\/\/[^\s"'<>]+\.html(?:\?[^\s"'<>]+)?)/i;

    return text
      .split(/\n+/)
      .filter((line) => {
        const trimmed = line.trim();
        const match = trimmed.match(moreInfoPattern);

        if (!match) {
          return true;
        }

        return !allowedDomain.test(match[1]);
      })
      .join("\n")
      .trim();
  };

  const allowedImpactAgentsHtml = /^https?:\/\/([a-z0-9-]+\.)*impact-agents\.ai\/.+\.html/i;

  const stripEmbeddableHtmlLinksFromHtml = (html: string): string => {
    if (!html) return html;
    return html.replace(
      /(\s*More Info:\s*)?<a\s[^>]*href=["'](https?:\/\/[^"']+\.html[^"']*)["'][^>]*>[\s\S]*?<\/a>/gi,
      (match, _prefix, url) =>
        url && allowedImpactAgentsHtml.test(url) ? "" : match
    );
  };

  const sanitizeHtml = (html: string): string =>
    DOMPurify.sanitize(html, {
      ALLOWED_TAGS: [
        "div", "p", "br", "a", "strong", "em", "b", "i", "u",
        "ul", "ol", "li", "h1", "h2", "h3", "h4", "h5", "h6",
        "span", "table", "thead", "tbody", "tr", "td", "th", "hr",
      ],
      ALLOWED_ATTR: ["href", "target", "rel", "style", "class", "id"],
    });

  const getIframeTitle = (url: string): string => {
    try {
      return `Embedded content from ${new URL(url).hostname}`;
    } catch {
      return "Embedded content preview";
    }
  };

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTo({
        top: messagesRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

  useEffect(() => {
    if (hasLoadedSessionsRef.current) return;
    hasLoadedSessionsRef.current = true;
    void fetchSessions();
  }, [fetchSessions]);

  useEffect(() => {
    if (hasInitializedSessionRef.current) return;
    const targetSessionId = sessionIdFromUrl || selectedSessionId || startNewSession();

    if (!sessionIdFromUrl) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set("session_id", targetSessionId);
      setSearchParams(nextParams, { replace: true });
    }

    setActiveSessionId(targetSessionId);
    void selectSession(targetSessionId);
    hasInitializedSessionRef.current = true;
  }, [
    searchParams,
    selectedSessionId,
    sessionIdFromUrl,
    setActiveSessionId,
    setSearchParams,
    selectSession,
    startNewSession,
  ]);

  useEffect(() => {
    const currentParam = (searchParams.get("session_id") ?? "").trim();

    if (selectedSessionId && currentParam !== selectedSessionId) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set("session_id", selectedSessionId);
      setSearchParams(nextParams, { replace: true });
      return;
    }

    if (!selectedSessionId && currentParam) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("session_id");
      setSearchParams(nextParams, { replace: true });
    }
  }, [searchParams, selectedSessionId, setSearchParams]);

  useEffect(() => {
    if (hasMessages || hasPlayedGreetingIntro) {
      setTypedGreetingTitle(IB_GREETING_TITLE);
      setGreetingStage(4);
      return;
    }

    const timeouts: number[] = [];
    let typingInterval: number | undefined;

    setGreetingStage(1);
    setTypedGreetingTitle("");

    timeouts.push(
      window.setTimeout(() => {
        setGreetingStage(2);

        let charIndex = 0;
        typingInterval = window.setInterval(() => {
          charIndex += 1;
          setTypedGreetingTitle(IB_GREETING_TITLE.slice(0, charIndex));

          if (charIndex >= IB_GREETING_TITLE.length) {
            if (typingInterval) {
              window.clearInterval(typingInterval);
            }

            setGreetingStage(3);
            timeouts.push(
              window.setTimeout(() => {
                setGreetingStage(4);
                setHasPlayedGreetingIntro(true);
              }, 600)
            );
          }
        }, 70);
      }, 500)
    );

    return () => {
      timeouts.forEach((timeoutId) => window.clearTimeout(timeoutId));
      if (typingInterval) {
        window.clearInterval(typingInterval);
      }
    };
  }, [hasMessages, hasPlayedGreetingIntro]);

  useEffect(() => {
    setMessageFeedback(getSessionFeedback(selectedSessionId));
  }, [selectedSessionId]);

  const handleNewChat = () => {
    const newSessionId = startNewSession();
    setInputValue("");

    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("session_id", newSessionId);
    setSearchParams(nextParams, { replace: true });
  };

  const handleSend = async () => {
    const message = inputValue.trim();
    if (!message) return;

    // Clear immediately so the input empties as soon as we send
    setInputValue("");
    await sendMessage(message);
  };

  const handleExampleClick = async (example: string) => {
    if (isWaitingForResponse) return;

    setInputValue("");
    await sendMessage(example);
  };

  const handleSuggestiveQuestionClick = async (question: string) => {
    if (isWaitingForResponse || isTyping) return;

    setInputValue("");
    await sendMessage(question);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const toggleDrawer = () => setIsDrawerOpen((prev) => !prev);
  const closeDrawer = () => setIsDrawerOpen(false);

  const retryConversationLoad = () => {
    const sessionId = selectedSessionId ?? sessionIdFromUrl;
    if (sessionId) {
      void selectSession(sessionId);
    }
  };
  // const closeActionMenu = () => setOpenActionMenuMessageId(null);

  const handleTranscribe = (text: string) => {
    setInputValue((prev) => (prev ? `${prev} ${text}` : text).trim());
    setIsAudioRecording(false);
  };

  // const getActiveSession = () =>
  //   sessions.find((session) => session.id === selectedSessionId) ?? null;

  const handleCopyMessage = async (message: Message) => {
    const textToCopy =
      message.text ||
      (message.structuredData?.summary
        ? `${message.structuredData.summary.title}\n\n${message.structuredData.summary.answer}`
        : "");
    if (!textToCopy) return;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedMessageId(message.id);
      window.setTimeout(() => {
        setCopiedMessageId((current) =>
          current === message.id ? null : current
        );
      }, 2000);
    } catch (error) {
      console.error("Failed to copy response:", error);
    }
  };

  // const handleExportMessage = (message: Message) => {
  //   const hasContent =
  //     message.text ||
  //     (message.structuredData?.summary?.answer ?? "");
  //   if (!hasContent || exportingMessageId) return;
  //   setExportingMessageId(message.id);
  //   try {
  //     const session = getActiveSession();
  //     exportChatReport({
  //       session,
  //       messages: [message],
  //       appName: "Interstate Batteries AI Assistant",
  //       filePrefix: `ib-message-${message.id}`,
  //     });
  //   } finally {
  //     setExportingMessageId(null);
  //   }
  // };

  const toggleFeedback = (messageId: string, direction: "up" | "down") => {
    setMessageFeedback((prev) => {
      const next = { ...prev };
      if (prev[messageId] === direction) {
        delete next[messageId];
      } else {
        next[messageId] = direction;
      }
      persistSessionFeedback(selectedSessionId, next);
      return next;
    });
  };

  // const toggleActionMenu = (messageId: string) => {
  //   setOpenActionMenuMessageId((current) =>
  //     current === messageId ? null : messageId
  //   );
  // };

  return (
    <div className="ib-landing">
      <header className="ib-landing__header">
        <div className="ib-landing__header-tabs">
          <div className="ib-landing__logo">
            <img src={IBLogo} alt="Interstate Batteries" className="ib-landing__logo-img" />
          </div>
          <div className="ib-landing__tabs" role="tablist" aria-label="IB Agent navigation">
            {/* <button className="ib-landing__tab" type="button" disabled aria-disabled="true">
              <img src={IBHomeTab} alt="Home" className="ib-landing__tab-icon" />
              Home
            </button> */}
            <button className="ib-landing__tab active" type="button" aria-selected="true">
              <img src={IBThunder} alt="Home" className="ib-landing__tab-icon" />
              Amplify.Me
            </button>
          </div>
        </div>
        <div className="ib-landing__header-actions">
          <button type="button" className="ib-landing__partner-btn">
            <img src={IASubLogo} alt="IA Agent" />
          </button>
          <div className="ib-landing__user-menu" ref={userMenuRef}>
            <button
              type="button"
              className="ib-landing__avatar"
              onClick={() => setIsUserMenuOpen((prev) => !prev)}
              aria-haspopup="menu"
              aria-expanded={isUserMenuOpen}
              aria-label="Open user menu"
            >
              <span className="ib-landing__avatar-ring" />
              <span className="ib-landing__avatar-initials">{userInitials}</span>
            </button>

            {isUserMenuOpen && (
              <div className="ib-landing__user-menu-popover" role="menu">
                <p className="ib-landing__user-menu-email" title={displayEmail}>
                  {displayEmail}
                </p>
                <button
                  type="button"
                  className="ib-landing__user-menu-logout"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    logout();
                  }}
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className={`ib-landing__panel ${isDrawerOpen ? "drawer-open" : ""}`}>
        <LeftButtonGroup onNewChat={handleNewChat} onToggleHistory={toggleDrawer} isHistoryOpen={isDrawerOpen} />
        <LeftDrawer
          isOpen={isDrawerOpen}
          sessions={sessions}
          selectedSessionId={selectedSessionId}
          loading={loading}
          error={sessionsError}
          onRetry={() => void fetchSessions()}
          onSelectSession={(sessionId: string) => {
            void selectSession(sessionId);
            closeDrawer();
          }}
        />

        <div className={`ib-landing__main ${hasMessages ? "has-messages" : "is-empty"}`}>
          <div className={`ib-landing__content ${hasMessages ? "has-messages" : ""}`}>
            {!hasMessages && (
              <div className={`ib-landing__greeting ib-landing__greeting--stage-${greetingStage}`}>
                <div className="ib-landing__intro-head">
                  <img src={IBIcon} alt="IB Agent" className="ib-landing__icon" />
                  <h1 aria-label={IB_GREETING_TITLE}>
                    {typedGreetingTitle}
                    {greetingStage === 2 && (
                      <span className="ib-landing__typing-cursor" aria-hidden="true" />
                    )}
                  </h1>
                  <h2 className={greetingStage >= 3 ? "is-visible" : ""}>How can I assist you today?</h2>
                </div>
                <div className={`ib-landing__examples ${greetingStage >= 4 ? "is-visible" : ""}`} role="list">
                  {EXAMPLE_QUESTIONS.map((question) => (
                    <button
                      key={question}
                      type="button"
                      className="ib-landing__example"
                      onClick={() => handleExampleClick(question)}
                      disabled={isWaitingForResponse}
                      role="listitem"
                    >
                      <img
                        src={IBBullet}
                        className="ib-landing__example-bullet"
                        alt=""
                        aria-hidden="true"
                      />
                      <span className="ib-landing__example-text">{question}</span>
                      <span aria-hidden className="ib-landing__example-arrow">&gt;</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {hasMessages && (
              <div className="ib-landing__messages-area" ref={messagesRef}>
                {groupedMessages.map((group: { key: string; date: Date; messages: Message[] }) => (
                  <React.Fragment key={group.key}>
                    <div className="ib-landing__date-divider">
                      <span>{formatDateDividerLabel(group.date)}</span>
                    </div>
                    {group.messages.map((message: Message) => {
                      const text = message.text || "";
                      const htmlContent = message.htmlContent;
                      const structuredData = message.structuredData;
                      const embeddableLinks = htmlContent
                        ? extractEmbeddableHtmlLinks(htmlContent)
                        : extractEmbeddableHtmlLinks(text);
                      const displayText = stripHtmlLinksFromText(stripEmbeddableHtmlReferences(text));
                      const isHtmlResponse =
                        !message.isUser && htmlContent && htmlContent.trim().length > 0;
                      const displayHtml = isHtmlResponse
                        ? sanitizeHtml(stripEmbeddableHtmlLinksFromHtml(htmlContent))
                        : "";
                      const hasStructuredData =
                        !message.isUser && Boolean(structuredData);
                      const suggestiveQuestions = !message.isUser
                        ? (message.suggestions ?? []).filter(
                          (question): question is string =>
                            typeof question === "string" && Boolean(question.trim())
                        )
                        : [];

                      const isLongText =
                        !hasStructuredData &&
                        !isHtmlResponse &&
                        displayText &&
                        displayText.length > 400;

                      return (
                        <div
                          key={message.id}
                          className={`ib-landing__message ${message.isUser ? "user" : "bot"}`}
                        >
                          <div className={`ib-landing__message-bubble ${hasStructuredData
                            ? "structured"
                            : isLongText
                              ? "report"
                              : "default"
                            }`}>
                            {hasStructuredData ? (
                              <StructuredDataView data={structuredData!} />
                            ) : isHtmlResponse ? (
                              <div
                                className="ib-landing__message-text ib-landing__message-html"
                                dangerouslySetInnerHTML={{ __html: displayHtml }}
                              />
                            ) : (
                              <div
                                className={`ib-landing__message-text ${isLongText ? "ib-landing__message-text-report" : ""
                                  }`}
                              >
                                <MarkdownRenderer content={displayText} />
                              </div>
                            )}
                            {!message.isUser &&
                              !hasStructuredData &&
                              embeddableLinks.map((link) => (
                                <div className="ib-landing__iframe-container" key={`${message.id}-${link}`}>
                                  <iframe
                                    src={link}
                                    title={getIframeTitle(link)}
                                    className="ib-landing__iframe"
                                    loading="lazy"
                                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                                    referrerPolicy="no-referrer"
                                  />
                                </div>
                              ))}
                          </div>
                          {!message.isUser &&
                            Boolean(message.text || message.htmlContent || message.structuredData) && (
                              <div className="ib-landing__message-actions">
                                <button
                                  type="button"
                                  className={`ib-landing__message-icon-btn ${messageFeedback[message.id] === "up" ? "active" : ""}`}
                                  onClick={() => toggleFeedback(message.id, "up")}
                                  aria-pressed={messageFeedback[message.id] === "up"}
                                  aria-label="Thumbs up"
                                >
                                  <img src={IBThumbsUp} alt="" />
                                </button>
                                <button
                                  type="button"
                                  className={`ib-landing__message-icon-btn ${messageFeedback[message.id] === "down" ? "active" : ""}`}
                                  onClick={() => toggleFeedback(message.id, "down")}
                                  aria-pressed={messageFeedback[message.id] === "down"}
                                  aria-label="Thumbs down"
                                >
                                  <img src={IBThumbsDown} alt="" />
                                </button>
                                <button
                                  type="button"
                                  className="ib-landing__message-icon-btn"
                                  onClick={() => handleCopyMessage(message)}
                                  aria-label={copiedMessageId === message.id ? "Copied" : "Copy response"}
                                >
                                  <img src={IBCopy} alt="" className="ib-landing__message-action-icon-img" />
                                </button>
                                {/* <div className="ib-landing__message-more">
                                  <button
                                    type="button"
                                    className="ib-landing__message-icon-btn"
                                    aria-haspopup="menu"
                                    aria-expanded={openActionMenuMessageId === message.id}
                                    onClick={() => toggleActionMenu(message.id)}
                                  >
                                    <MoreIcon />
                                  </button>
                                  {openActionMenuMessageId === message.id && (
                                    <>
                                      <div
                                        className="ib-landing__message-overlay-backdrop"
                                        onClick={closeActionMenu}
                                      />
                                      <div className="ib-landing__message-overlay" role="menu">
                                        <button
                                          type="button"
                                          className="ib-landing__message-overlay-item"
                                          onClick={() => {
                                            handleExportMessage(message);
                                            closeActionMenu();
                                          }}
                                          disabled={exportingMessageId === message.id}
                                        >
                                          <span className="ib-landing__message-overlay-icon">
                                            <DownloadIcon />
                                          </span>
                                          <span>
                                            {exportingMessageId === message.id ? "Exporting..." : "Export"}
                                          </span>
                                        </button>
                                      </div>
                                    </>
                                  )}
                                </div> */}
                                {copiedMessageId === message.id && (
                                  <span className="ib-landing__message-copy-status">Copied</span>
                                )}
                              </div>
                            )}
                          {message.timing && (
                            <div className="ib-landing__message-meta">
                              {message.timing}
                            </div>
                          )}
                          {!message.isUser && suggestiveQuestions.length > 0 && (
                            <div className="ib-landing__suggestive-questions" role="list" aria-label="Suggested follow-up questions">
                              {suggestiveQuestions.map((question) => (
                                <button
                                  key={`${message.id}-${question}`}
                                  type="button"
                                  className="ib-landing__suggestive-question"
                                  onClick={() => void handleSuggestiveQuestionClick(question)}
                                  disabled={isWaitingForResponse || isTyping}
                                  role="listitem"
                                >
                                  <img
                                    src={IBBullet}
                                    className="ib-landing__suggestive-question-bullet"
                                    alt=""
                                    aria-hidden="true"
                                  />
                                  <span className="ib-landing__suggestive-question-text">{question}</span>
                                  <span aria-hidden className="ib-landing__suggestive-question-arrow">&gt;</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </React.Fragment>
                ))}

                {showAnalyzing && (
                  <div className="ib-landing__message bot">
                    <div className="ib-landing__message-bubble analyzing">
                      <div className="ib-landing__analyzing-header">
                        <span className="ib-landing__analyzing-label" aria-live="polite">
                          {spinnerTexts[Math.min(spinnerIndex, spinnerTexts.length - 1)]}
                        </span>
                        <span className="ib-landing__analyzing-dots" aria-hidden>
                          <span />
                          <span />
                          <span />
                        </span>
                      </div>
                      <div className="ib-landing__analyzing-skeleton" aria-hidden>
                        <span className="ib-landing__analyzing-skeleton-line w-92" />
                        <span className="ib-landing__analyzing-skeleton-line w-68" />
                        <div className="ib-landing__analyzing-skeleton-bars">
                          <span className="ib-landing__analyzing-bar h-34" />
                          <span className="ib-landing__analyzing-bar h-64" />
                          <span className="ib-landing__analyzing-bar h-48" />
                          <span className="ib-landing__analyzing-bar h-78" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {(conversationError || currentError) && (
              <div className="ib-landing__error-banner">
                <span>{conversationError || currentError}</span>
                {conversationError && (
                  <button
                    type="button"
                    className="ib-landing__error-retry"
                    onClick={retryConversationLoad}
                  >
                    Retry
                  </button>
                )}
              </div>
            )}

            <div
              className={`ib-landing__chatbox ${hasMessages ? "anchored" : ""} ${!hasMessages && greetingStage < 4 ? "ib-landing__chatbox--intro-hidden" : ""}`}
            >
              <div className="ib-landing__input-wrapper">
                {isAudioRecording ? (
                  <AudioRecorder onTranscribe={handleTranscribe} />
                ) : (
                  <textarea
                    className="ib-landing__input"
                    placeholder={
                      isWaitingForResponse
                        ? "Analyzing..."
                        : "Ask anything..."
                    }
                    value={inputValue}
                    onChange={(event) => setInputValue(event.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isWaitingForResponse}
                    rows={1}
                    aria-label="Message input"
                  />
                )}
              </div>

              <div className="ib-landing__chatbox-controls">
                <div className="ib-landing__chatbox-left">
                  <button
                    className="ib-landing__icon-btn subtle square"
                    onClick={toggleDrawer}
                    aria-label="History"
                  >
                    <ClockIcon />
                  </button>
                  <button
                    className={`ib-landing__deep-research-pill ${deepResearch ? "active" : ""}`}
                    onClick={() => setManualDeepResearch(!manualDeepResearch)}
                    disabled={isWaitingForResponse || isTyping}
                    aria-label={`Deep Research ${manualDeepResearch ? "enabled" : "disabled"}`}
                    type="button"
                  >
                    <DeepResearchIcon />
                    <span className="ib-landing__pill-label">Deep Research</span>
                    <div className={`ib-landing__toggle ${deepResearch ? "on" : ""}`}>
                      <span className="ib-landing__toggle-thumb" />
                    </div>
                  </button>
                </div>

                <div className="ib-landing__chatbox-right">
                  {/* <button
                    className="ib-landing__icon-btn subtle"
                    onClick={() => setIsAudioRecording(true)}
                    // disabled={isWaitingForResponse || isTyping || isAudioRecording}
                    disabled
                    aria-label="Voice input"
                    type="button"
                  >
                    <MicIcon />
                  </button>
                  <button className="ib-landing__icon-btn subtle square" disabled>
                    <EqualizerIcon />
                  </button> */}
                  <button
                    className="ib-landing__send-btn"
                    aria-label="Send"
                    onClick={handleSend}
                    disabled={!inputValue.trim() || isWaitingForResponse || isTyping}
                  >
                    {isWaitingForResponse ? (
                      <span className="ib-landing__loader" aria-hidden />
                    ) : (
                      <SendIcon />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <footer className="ib-landing__footer">
            Chatbot can make mistakes. Check important info.{" "}
            <a href="#" className="ib-landing__footer-link">See Cookie Preferences.</a>
          </footer>
        </div>
      </div>
    </div>
  );
};
