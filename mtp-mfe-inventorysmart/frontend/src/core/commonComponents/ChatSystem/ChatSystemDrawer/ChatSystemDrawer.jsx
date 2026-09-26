import clsx from "clsx";
import makeStyles from "@mui/styles/makeStyles";
import { Drawer } from "@mui/material";
import ChatSystemHeader from "../ChatSystemHeader/ChatSystemHeader";
import ChatSystemLeftSideSection from "../ChatSystemLeftSideSection/ChatSystemLeftSideSection";
// import ChatSystemRightSideSection from "../ChatSystemRightSideSection/ChatSystemRightSideSection";
import ChatEvents from "../ChatEvents/ChatEvents";
import ChatStarredMessages from "../ChatStarredMessages/ChatStarredMessages";
import UseChatSystem from "./UseChatSystem";
import LoadingOverlay from "core/Utils/Loader/loader";
import { useSelector } from "react-redux";
import "./ChatSystemDrawer.scss";

const useStyles = makeStyles((theme) => ({
  drawer: {
    flexShrink: 0,
    whiteSpace: "nowrap",
    backgroundColor: theme.palette.common.white,
    transition: "width 300ms ease-out",
  },
  drawerOpen: {
    overflow: "hidden",
    zIndex: 999,
  },
  drawerClose: {
    overflow: "hidden",
    width: 0,
  },
  drawerWidth: {
    width: theme.customVariables.chatDrawerWidth,
  },
  drawerWidthWithEvents: {
    width: theme.customVariables.chatDrawerWidthWithEvents,
  },
}));

const ChatSystemDrawer = (props) => {
  const classes = useStyles();

  const {
    openChat,
    openChatWithEvents,
    chatList,
    activeEvent,
    activeEventId,
    selectedOption,
    isChannel,
    isStarred,
    starredList,
    isResolved,
    resolvedList,
    userName,
    setActiveEvent,
    setActiveEventId,
    currentEventIdRef,
    setSelectedOptions,
    handleEvents,
    setChatList,
    handleCommentChanges,
  } = UseChatSystem(props);

  const chatLoading = useSelector(
    (state) => state.commonChatReducer.chatLoading
  );

  return (
    <Drawer
      open={openChat}
      variant="permanent"
      anchor="right"
      classes={{
        paper: clsx(
          {
            [classes.drawerOpen]: openChat,
            [classes.drawerClose]: !openChat,
            [classes.drawerWidth]: !openChatWithEvents,
            [classes.drawerWidthWithEvents]: openChatWithEvents,
          },
          classes.drawer
        ),
      }}
    >
      <LoadingOverlay loader={chatLoading}>
        <section className="drawer">
          {openChatWithEvents && (
            <ChatEvents
              chatList={chatList}
              activeEventId={activeEventId}
              setActiveEvent={setActiveEvent}
              setActiveEventId={setActiveEventId}
              currentEventIdRef={currentEventIdRef}
              selectedOption={selectedOption}
              setSelectedOptions={setSelectedOptions}
              isChannel={isChannel}
              handleEvents={handleEvents}
              resolvedList={resolvedList}
              isResolved={isResolved}
            />
          )}
          <div className="drawer-content">
            <ChatSystemHeader
              chatList={chatList}
              activeEvent={activeEvent}
              activeEventId={activeEventId}
              handleEvents={handleEvents}
              handleCommentChanges={handleCommentChanges}
              isResolved={isResolved}
              isStarred={isStarred}
            />
            <main>
              {isStarred || isResolved ? (
                <ChatStarredMessages
                  starredList={isStarred ? starredList : resolvedList}
                  isStarred={isStarred}
                  activeEventId={activeEventId}
                  isChannel={isChannel}
                  chatList={chatList}
                  handleCommentChanges={handleCommentChanges}
                  currentEventIdRef={currentEventIdRef}
                  setSelectedOptions={setSelectedOptions}
                  isResolved={isResolved}
                />
              ) : (
                <>
                  <ChatSystemLeftSideSection
                    chatList={chatList}
                    isStarred={isStarred}
                    isChannel={isChannel}
                    activeEvent={activeEvent}
                    setChatList={setChatList}
                    handleCommentChanges={handleCommentChanges}
                    userName={userName}
                    activeEventId={activeEventId}
                    currentEventIdRef={currentEventIdRef}
                  />
                  {/* <ChatSystemRightSideSection
                  handleCommentChanges={handleCommentChanges}
                /> */}
                </>
              )}
            </main>
          </div>
        </section>
      </LoadingOverlay>
    </Drawer>
  );
};

export default ChatSystemDrawer;
