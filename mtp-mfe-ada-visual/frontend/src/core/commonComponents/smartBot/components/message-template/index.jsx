import React, { useState, useCallback } from "react";
import { Typography } from "@mui/material";
import { throttle } from "lodash";
import { handleMessageLike } from "../../utlis";
import { useStyles } from "../../styling";
import globalStyles from "core/Styles/globalStyles";
import { formatDate } from "./utils.js";
import BotMessage from "./components/message-types/BotMessage";
import UserMessage from "./components/message-types/UserMessage";
import LoaderMessage from "./components/message-types/LoaderMessage";
import RedirectLink from "../RedirectLink";

const MessageTemplate = (props) => {
  const {
    templateData,
    chatMode,
    screenLinkData,
    displaySnackMessages,
    activeConversationId,
    chatDataState,
    loader
  } = props;
  const classes = useStyles();
  const globalClasses = globalStyles();
  const [loadingState, setLoadingState] = useState({
    like: null,
    dislike: null,
  });

  const handleLikeDislike = useCallback(
    throttle(
      (key, isLike, answer) => {
        setLoadingState({
          ...loadingState,
          [isLike ? "like" : "dislike"]: key,
        });
        handleMessageLike(
          key,
          isLike,
          setLoadingState,
          displaySnackMessages,
          templateData,
          activeConversationId, 
          answer
        );
      },
      5000,
      { trailing: false }
    ),
    [loadingState, templateData, displaySnackMessages]
  );

  const renderDateChip = (dateString) => {
    if(dateString) {
      return <Typography className={classes.dateChip}>{dateString}</Typography>
    }
    return null;
  };

  const renderActionableCTA = () => (
    <>
      {screenLinkData?.[chatMode]?.screenName && (
        <div className={`${globalClasses.layoutAlignStart} ${classes.ml12}`}>
          <RedirectLink
            to={screenLinkData?.[chatMode]?.currentAppLink}
            screenName={screenLinkData?.[chatMode]?.screenName}
          />
        </div>
      )}
    </>
  );

  const renderChats = React.useMemo(() => {
    if (
      !templateData[chatMode]?.conversations?.[activeConversationId]?.messages
        ?.length &&
      chatMode !== "agent"
    )
      return null;

    let chatData = chatMode === "agent" ? templateData[chatMode] : templateData[chatMode]?.conversations?.[activeConversationId]?.messages;

    let dayData;
    return chatData?.map(
      (data, index) => {
        const currentDayData = data.timeStamp
          ? formatDate(data.timeStamp)
          : null;

        let dateChip;
        if (currentDayData !== dayData) {
          dayData = currentDayData;
          dateChip = renderDateChip(currentDayData);
        }

        let chatCTA;
        if (
          ["bot", "loader"].includes(data.userType) &&
          chatData?.length ===
            index + 1
        ) {
          chatCTA = renderActionableCTA();
        }

        return (
          <React.Fragment key={index}>
            {dateChip}
            {data.userType === "bot" && (
              <BotMessage
                botData={data}
                state={loadingState}
                handleLikeDislike={handleLikeDislike}
                props={props}
              />
            )}
            {data.userType === "user" && (
              <UserMessage userData={data} props={props} />
            )}
            {data.userType === "loader" && (
              <LoaderMessage botData={data} props={props} />
            )}
            {chatCTA}
          </React.Fragment>
        );
      }
    );
  }, [
    templateData[chatMode]?.conversations?.[activeConversationId]?.messages,
    templateData[chatMode],
    chatMode,
    loadingState,
  ]);

  return <>{renderChats}</>;
};

export default MessageTemplate;
