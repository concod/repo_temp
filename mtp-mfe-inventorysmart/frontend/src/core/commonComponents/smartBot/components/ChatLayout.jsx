import { Typography } from "@mui/material";
import BotFace from "../../../../assets/botFace.svg";
import CloseRoundIcon from "../../../../assets/closeRoundIcon.svg";
import MinimiseIcon from "../../../../assets/chatbot/MinimiseIcon.svg";
import CloseIcon from "../../../../assets/chatbot/CloseIcon.svg";
import Menu from "../../../../assets/chatbot/Menu.svg";
import Navigation from "../../../../assets/chatbot/Navigation.svg";
import NavigationSelected from "../../../../assets/chatbot/NavigationSelected.svg";
import Insights from "../../../../assets/chatbot/Insights.svg";
import InsightsSelected from "../../../../assets/chatbot/InsightsSelected.svg";
import AgentSelectedIcon from "../../../../assets/chatbot/AgentSelectedIcon.svg";
import AgentNotifyIcon from "../../../../assets/chatbot/AgentNotifyIcon.svg";
import { StyledRefreshIcon } from "../styling";
import PropTypes from "prop-types";
import { Tooltip } from "impact-ui-v3";

const ChatLayout = ({
  classes,
  globalClasses,
  showModal,
  minimizedMode,
  handleMouseDown,
  isDraggingRef,
  minimizedBtnRef,
  setShowModal,
  setMinimizedMode,
  closeBot,
  showExtendedContent,
  setShowExtendedContent,
  currentMode,
  setCurrentMode,
  enableRefreshAction,
  refreshLoader,
  refreshAndUpdateUserManual,
  children,
}) => {
  const handleButtonClick = (mode) => {
    setCurrentMode(mode);
    localStorage.setItem("currentModeData", mode);
  };

  if (minimizedMode) {
    return (
      <div
        className={classes.minimizedContainer}
        onMouseDown={handleMouseDown}
        ref={minimizedBtnRef}
      >
        <button
          className={`${classes.closeMinizeBtn} ${globalClasses.padding_0}`}
          onClick={() => {
            if (!isDraggingRef.current) {
              closeBot();
            } else {
              isDraggingRef.current = null;
            }
          }}
        >
          <CloseRoundIcon />
        </button>
        <button
          className={classes.minimizedButton}
          onClick={() => {
            if (!isDraggingRef.current) {
              setShowModal(true);
              setMinimizedMode(false);
            } else {
              isDraggingRef.current = null;
            }
          }}
        >
          <BotFace />
          <Typography
            component="span"
            variant="h5"
            className={classes.minimizedButtonText}
          >
            Questions? I'm here to help
          </Typography>
        </button>
      </div>
    );
  }
  return (
    <>
      {showModal && (
        <div
          className={`${classes.fixedBotPanel} ${
            showExtendedContent ? classes.extendedState : classes.collapsedState
          }`}
        >
          <div className={classes.sidebar}>
            <Tooltip title="Menu" orientation="left" variant="secondary">
              <button
                className={classes.sidebarButton}
                onClick={() => {
                  setShowExtendedContent(!showExtendedContent);
                }}
                disabled={true || currentMode === "agent"}
              >
                <Menu />
              </button>
            </Tooltip>
            <Tooltip title="Insights" orientation="left" variant="secondary">
              <button
                className={classes.sidebarButton}
                onClick={() => handleButtonClick("insights")}
              >
                {currentMode === "insights" ? (
                  <InsightsSelected />
                ) : (
                  <Insights />
                )}
              </button>
            </Tooltip>
            <Tooltip title="Navigation" orientation="left" variant="secondary">
              <button
                className={classes.sidebarButton}
                onClick={() => handleButtonClick("navigation")}
              >
                {currentMode === "navigation" ? (
                  <NavigationSelected />
                ) : (
                  <Navigation />
                )}
              </button>
            </Tooltip>
            <Tooltip title="Agent" orientation="left" variant="secondary">
              <button
                className={classes.sidebarButton}
                onClick={() => handleButtonClick("agent")}
              >
                {currentMode === "agent" ? (
                  <>
                    <AgentSelectedIcon />
                  </>
                ) : (
                  <>
                    <AgentNotifyIcon />
                  </>
                )}
              </button>
            </Tooltip>
          </div>

          <div
            className={`${classes.modalHeader} ${
              showExtendedContent
                ? classes.expandedMargin
                : classes.collapsedMargin
            }`}
          >
            <div
              className={`${globalClasses.flexRow} ${globalClasses.layoutAlignSpaceBetween}`}
            >
              <Typography className={classes.botTitle} variant="h6">
                Iris
              </Typography>
              <div
                className={`${globalClasses.flexRow} ${globalClasses.layoutAlignCenter} ${classes.headerGap}`}
              >
                {enableRefreshAction && (
                  <StyledRefreshIcon
                    className={globalClasses.cursorPointer}
                    onClick={
                      refreshLoader ? () => {} : refreshAndUpdateUserManual()
                    }
                    loading={refreshLoader}
                  />
                )}
                <MinimiseIcon
                  className={`${globalClasses.cursorPointer} ${classes.svgStyle}`}
                  onClick={() => setMinimizedMode(true)}
                />
                <CloseIcon
                  className={`${globalClasses.cursorPointer} ${classes.svgStyle}`}
                  onClick={() => {
                    closeBot();
                  }}
                />
              </div>
            </div>
          </div>

          {children}
        </div>
      )}
    </>
  );
};

ChatLayout.propTypes = {
  classes: PropTypes.object.isRequired,
  globalClasses: PropTypes.object.isRequired,
  showModal: PropTypes.bool.isRequired,
  minimizedMode: PropTypes.bool.isRequired,
  handleMouseDown: PropTypes.func.isRequired,
  isDraggingRef: PropTypes.object.isRequired,
  minimizedBtnRef: PropTypes.object.isRequired,
  setShowModal: PropTypes.func.isRequired,
  setMinimizedMode: PropTypes.func.isRequired,
  closeBot: PropTypes.func.isRequired,
  showExtendedContent: PropTypes.bool.isRequired,
  setShowExtendedContent: PropTypes.func.isRequired,
  currentMode: PropTypes.string.isRequired,
  setCurrentMode: PropTypes.func.isRequired,
  enableRefreshAction: PropTypes.bool.isRequired,
  refreshLoader: PropTypes.bool.isRequired,
  refreshAndUpdateUserManual: PropTypes.func.isRequired,
  children: PropTypes.node,
};

export default ChatLayout;
