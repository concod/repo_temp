import React, { useState, useEffect, useRef } from "react";
import "./filterPlansModal.css";
import AI from "assets/AI.png";
import { Alert, Button, Tabs } from "impact-ui-v3";
import SendIcon from "@mui/icons-material/Send";
import invoice_icon from "assets/impactv3/invoice_icon.png";
import unit_icon from "assets/impactv3/unit_icon.png";
import noteDocument_icon from "assets/impactv3/noteDocument_icon.png";
import ClusterStoreIcon from "assets/impactv3/ClusterStoreIcon.png";
import TextFormatOutlinedIcon from "@mui/icons-material/TextFormatOutlined";
import TableChartOutlinedIcon from "@mui/icons-material/TableChartOutlined";
import {
  LOADING_STEPS,
  QUESTIONS,
  UI_TEXT,
} from "./filterPlansModal.constants";
import AllocationTable from "./AllocationTable";
import TextContent from "./TextContent";
import { 
  fetchFilterPlansData,
  getFilterPlan 
} from "modules/inventorysmart/services-inventorysmart/Decision-Dashboard/store-inventory-services";

const FilterPlansModal = ({ open, onClose, filters, summaryPlan, FilterPlan, onFilterTable }) => {
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [tabValue, setTabValue] = useState("table");
  const [chatInputValue, setChatInputValue] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const chatEndRef = useRef(null);
  const [showCopyAlert, setShowCopyAlert] = useState("");
  
  // Get logged-in user from localStorage
  const userName = localStorage.getItem("user") || "User";

  useEffect(() => {
    if (!loading) return;

    setLoadingStep(0);

    const interval = setInterval(() => {
      setLoadingStep((prev) => {
        if (prev < LOADING_STEPS.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 1500);

    return () => clearInterval(interval);
  }, [loading]);

  const handleChangeTabValue = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const newMessage = {
      question: inputValue,
      time: new Date(),
      response: null,
    };

    setMessages((prev) => [...prev, newMessage]);
    setInputValue("");
    setLoading(true);

    try {
      const formattedFilters = (filters || [])
        .filter(
          (f) =>
            f.dimension !== "store" &&
            Array.isArray(f.values) &&
            f.values.length > 0
        )
        .map(({ filter_id, values }) => ({
          filter_id,
          values,
        }));
      const body = {
        task: newMessage.question,
        filters: formattedFilters,
      };

      const data = summaryPlan && FilterPlan 
        ? await getFilterPlan(body)
        : await fetchFilterPlansData(body);
      // attach API response to last message
      setMessages((prev) =>
        prev.map((msg, i) =>
          i === prev.length - 1 ? { ...msg, response: data } : msg
        )
      );
    } catch (error) {
      console.error("API Error:", error);

      // fallback error message
      setMessages((prev) =>
        prev.map((msg, i) =>
          i === prev.length - 1
            ? {
                ...msg,
                response: { error: "Something went wrong. Please try again." },
              }
            : msg
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const formatDayLabel = (date) => {
    const today = new Date();
    const inputDate = new Date(date);

    const diffTime =
      today.setHours(0, 0, 0, 0) - new Date(inputDate).setHours(0, 0, 0, 0);
    const diffDays = diffTime / (1000 * 60 * 60 * 24);

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";

    return inputDate.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const ICON_MAP = [
    invoice_icon,
    unit_icon,
    noteDocument_icon,
    ClusterStoreIcon,
  ];

  const handleChat = async () => {
    if (!chatInputValue.trim()) return;

    const newMessage = {
      question: chatInputValue,
      time: new Date(),
      response: null,
    };

    setChatMessages((prev) => [...prev, newMessage]);
    setChatInputValue("");
    setLoading(true);

    try {
      const formattedFilters = (filters || [])
        .filter(
          (f) =>
            f.dimension !== "store" &&
            Array.isArray(f.values) &&
            f.values.length > 0
        )
        .map(({ filter_id, values }) => ({
          filter_id,
          values,
        }));

      const body = {
        task: newMessage.question,
        filters: formattedFilters,
      };

      const data = summaryPlan && FilterPlan 
        ? await getFilterPlan(body)
        : await fetchFilterPlansData(body);

      setChatMessages((prev) =>
        prev.map((msg, i) =>
          i === prev.length - 1 ? { ...msg, response: data } : msg
        )
      );
    } catch (error) {
      console.error("API Error:", error);

      setChatMessages((prev) =>
        prev.map((msg, i) =>
          i === prev.length - 1
            ? {
                ...msg,
                response: { error: "Something went wrong. Please try again." },
              }
            : msg
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e, type) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault(); 

      if (type === "initial") {
        handleSend();
      } else {
        handleChat();
      }
    }
  };

  useEffect(() => {
    if (!open) {
      // Clear only the text inputs and loading state — messages are kept
      // so chat history is restored when the modal is reopened
      setInputValue("");
      setChatInputValue("");
      setLoading(false);
    }
  }, [open]);
  useEffect(() => {
    const timeout = setTimeout(() => {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100); // small delay ensures DOM is ready

    return () => clearTimeout(timeout);
  }, [messages, chatMessages]);

  if (!open) return null;

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const allMessages = [...messages, ...chatMessages];

  return (
    <div className="overlay">
      <div className="modal">
        {/* Header */}
        <div className="header">
          <span className="headerName">{UI_TEXT.HEADER_NAME}</span>
          <span className="close" onClick={onClose}>
            ✕
          </span>
        </div>

        {/* BODY */}
        <div className="body">
          {messages.length === 0 ? (
            <>
              {/* Center Content */}
              <div className="centerContent">
                <img src={AI} alt="AI Icon" className="star-icon" />

                <h2 className="title">
                  {UI_TEXT.TITLE}{" "}
                  <span className="highlight">{userName}!</span>{" "}
                  <span className="sunIcon">☀️</span>
                </h2>

                {/* Input */}
                <div className="inputWrapper">
                  <textarea
                    className="inputField"
                    placeholder="Ask anything..."
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, "initial")}
                    rows={1}
                  />

                  <div className="inputActions">
                    <Button
                      icon={<SendIcon />}
                      variant="primary"
                      size="large"
                      onClick={handleSend}
                      disabled={!inputValue.trim()}
                    />
                  </div>
                </div>

                {/* Suggestions */}
                <div className="suggestions">
                  {QUESTIONS.map((q, i) => (
                    <div
                      key={i}
                      className="suggestionCard"
                      onClick={() => setInputValue(q)}
                    >
                      <img src={ICON_MAP[i]} alt="icon" className="cardIcon" />
                      <div key={i} className="questionContainer">
                        {q}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="chatArea">
                {showCopyAlert && (
                  <div className="chatAlertWrapper">
                    <Alert
                      severity="success"
                      description={showCopyAlert}
                      subtleBackground={true}
                      onClose={() => setShowCopyAlert("")}
                    />
                  </div>
                )}
                {/* Day Label */}
                {messages.length > 0 && (
                  <div className="dayLabel">
                    {formatDayLabel(messages[0].time)}
                  </div>
                )}

                {allMessages.map((msg, i) => (
                  <React.Fragment key={i}>
                    {/* USER MESSAGE */}
                    <div className="chatRow right">
                      <div className="userBubble">
                        {msg.question}
                        <div className="time">{formatTime(msg.time)}</div>
                      </div>
                    </div>

                    {/* AI RESPONSE BLOCK */}
                    <div className="chatRow left">
                      <div className="aiBlock">
                        <img src={AI} className="loaderIcon" />

                        <div className="aiContent">
                          {/* LOADER */}
                          {loading && i === allMessages.length - 1 && (
                            <div className="loaderTextWrapper">
                              <span className="loaderText">
                                {LOADING_STEPS[loadingStep]}
                              </span>

                              <span className="dots">
                                <span></span>
                                <span></span>
                                <span></span>
                              </span>
                            </div>
                          )}

                          {/* RESPONSE */}
                          {msg.response && (
                            <div className="responseCard">
                              {msg.response?.result_rows?.length > 0 && msg.response?.columns?.length > 0 ? (
                                <Tabs
                                  onChange={handleChangeTabValue}
                                  orientation="horizontal"
                                  tabNames={[
                                    {
                                      label: "Table",
                                      value: "table",
                                      icon: (
                                        <TableChartOutlinedIcon fontSize="small" />
                                      ),
                                    },
                                    {
                                      label: "Text",
                                      value: "text",
                                      icon: (
                                        <TextFormatOutlinedIcon
                                          fontSize="small"
                                          sx={{
                                            position: "relative",
                                            top: "1px",
                                          }}
                                        />
                                      ),
                                    },
                                  ]}
                                  tabPanels={[
                                    <AllocationTable data={msg.response} />,
                                    <TextContent
                                      data={msg.response}
                                      setShowCopyAlert={setShowCopyAlert}
                                      onFilterTable={onFilterTable}
                                      onClose={onClose}
                                    />,
                                  ]}
                                  value={tabValue}
                                />
                              ) : (
                                <div className="noDataMessage">
                                  <p>{UI_TEXT.NO_DATA_MESSAGE}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </React.Fragment>
                ))}
                <div ref={chatEndRef} />
              </div>
              <div className="inputSection">
                <textarea
                  className="inputField"
                  placeholder="Ask anything..."
                  value={chatInputValue}
                  onChange={(e) => setChatInputValue(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, "chat")}
                  rows={1}
                />
                <Button
                  icon={<SendIcon />}
                  variant="primary"
                  size="large"
                  onClick={handleChat}
                />
              </div>
              <div className="alanText">
                <span className="alanNormalText">{UI_TEXT.ALAN_DISCLAIMER}</span>{" "}
                <span className="learnMore">{UI_TEXT.LEARN_MORE}</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default FilterPlansModal;
