import { Typography, Divider } from "@mui/material";
import { Button } from "impact-ui-v3";
import { Tooltip } from "impact-ui-v3";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import ChatInput from "./ChatInput";
import PropTypes from "prop-types";
import { useConversationManagement } from "../hooks/useConversationManagement";
import LoadingOverlay from "./LoadingOverlay";
import { isEmpty } from "lodash";
import { useDispatch } from "react-redux";
import { clearPersistedFormValues } from "core/actions/smartBotActions";

const ChatFooter = ({
  classes,
  globalClasses,
  showExtendedContent,
  endCurrentSession,
  setShowExtendedContent,
  userInput,
  setUserInput,
  fetchUserResultsFromQuery,
  loader,
  currentMode,
  setSelectedModule,
  chatDataRef,
  chatDataScreenLinkRef,
  initiateNewChat,
  setShowAlert,
  activeConversationId,
  setActiveConversationId,
  setChatDataState,
  selectedModule,
  isModuleChanged,
  setIsModuleChanged,
  prepareDataAndSendToAgent,
  currentAgentId,
  currentSessionId,
  baseUrl,
  customChatConfig,
  chatBotInfoRef,
}) => {

  const dispatch = useDispatch();

  const {
    saveCurrentChat,
    loading,
    error
  } = useConversationManagement(
    chatDataRef,
    currentMode,
    activeConversationId,
    setActiveConversationId,
    setChatDataState,
    selectedModule,
    setSelectedModule,
    isModuleChanged,
    setIsModuleChanged
  );

  const handleClearChat = () => {
    if (currentMode === "navigation") {
      setSelectedModule((prev) => ({ ...prev, [activeConversationId]: "" }));
    }
    setUserInput("");
    if (currentMode === "agent") {
      chatDataRef.current[currentMode] = [];
    } else {
      chatDataRef.current[currentMode].conversations[
        activeConversationId
      ].messages = [];
    }
    chatDataScreenLinkRef.current[currentMode] = {
      screenName: "",
      currentAppLink: "",
    };
    localStorage.setItem(
      "chatDataScreenLinkRef",
      JSON.stringify(chatDataScreenLinkRef.current)
    );
    localStorage.setItem("chatData", JSON.stringify(chatDataRef.current));
    setSelectedModule("");
    localStorage.removeItem("currentSelectedModuleData");
    localStorage.removeItem("smartBotScreenName");
    localStorage.removeItem("smartBotCurrentAppLink");
    initiateNewChat(currentMode);
    dispatch(clearPersistedFormValues());
    setShowAlert(true);
  };

  const handleSubmit = () => {
    if (currentMode === "agent") {
      const data = {
        agentId: currentAgentId,
        userInput: userInput,
        sessionId: currentSessionId,
        baseUrl: baseUrl,
      };
      prepareDataAndSendToAgent(data);
    } else {
      fetchUserResultsFromQuery();
    }
  };

  return (
    <>
      {loading && <LoadingOverlay />}
      <Divider />
      <div
        className={`${classes.modalFooter} ${
          showExtendedContent ? classes.expandedMargin : classes.collapsedMargin
        }`}
      >
        <div className={classes.footerButtonsLayout}>
          <div className={classes.footerButtonGroup}>
            <Tooltip title="End Chat" orientation="top" variant="secondary">
              <div>
                <Button
                  className={classes.iconBtn}
                  icon={
                    <span className="material-symbols-outlined">
                      chat_error
                    </span>
                  }
                  onClick={endCurrentSession}
                  variant="secondary"
                  size="large"
                  // disabled={isEmpty(chatDataRef.current[currentMode])}
                />
              </div>
            </Tooltip>
            {/* <Tooltip
              title={"Save Chat"}
              orientation={"top"}
              variant={"secondary"}
            >
              <div>
                <Button
                  icon={<SaveOutlinedIcon />}
                  onClick={() => {
                    saveCurrentChat()
                  }}
                  variant="secondary"
                  size={"large"}
                  disabled={true || loading}
                />
              </div>
            </Tooltip> */}
          </div>
          <Button onClick={handleClearChat} variant="secondary" size="small" disabled={loading}>
            Clear all
          </Button>
        </div>
        <Typography className={classes.footNote} variant="" component="span">
          **I can make mistakes. Please re-check critical information/steps.
          Though I am constantly learning and getting better
        </Typography>
        <ChatInput
          classes={classes}
          globalClasses={globalClasses}
          userInput={userInput}
          setUserInput={setUserInput}
          fetchUserResultsFromQuery={handleSubmit}
          loader={loader}
          currentMode={currentMode}
          prepareDataAndSendToAgent={prepareDataAndSendToAgent}
          currentAgentId={currentAgentId}
          currentSessionId={currentSessionId}
          baseUrl={baseUrl}
          customChatConfig={customChatConfig}
          chatBotInfoRef={chatBotInfoRef}
        />
      </div>
    </>
  );
};

ChatFooter.propTypes = {
  classes: PropTypes.object.isRequired,
  globalClasses: PropTypes.object.isRequired,
  showExtendedContent: PropTypes.bool.isRequired,
  endCurrentSession: PropTypes.func.isRequired,
  setShowExtendedContent: PropTypes.func.isRequired,
  userInput: PropTypes.string.isRequired,
  setUserInput: PropTypes.func.isRequired,
  fetchUserResultsFromQuery: PropTypes.func.isRequired,
  loader: PropTypes.bool.isRequired,
  currentMode: PropTypes.string.isRequired,
  setSelectedModule: PropTypes.func.isRequired,
  chatDataRef: PropTypes.object.isRequired,
  chatDataScreenLinkRef: PropTypes.object.isRequired,
  initiateNewChat: PropTypes.func.isRequired,
  setShowAlert: PropTypes.func.isRequired,
  prepareDataAndSendToAgent: PropTypes.func.isRequired,
  currentAgentId: PropTypes.string.isRequired,
  currentSessionId: PropTypes.string.isRequired,
  baseUrl: PropTypes.string.isRequired,
  customChatConfig: PropTypes.object.isRequired,
};

export default ChatFooter;
