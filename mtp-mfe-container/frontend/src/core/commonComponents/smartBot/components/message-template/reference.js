import React, { useState, useCallback } from "react";
import { Typography } from "@mui/material";
import moment from "moment";
import RedirectLink from "../RedirectLink";
import { TextRenderer } from "../TextRenderer";
import HighlightedRenderer from "../HighlightedRenderer";
import ThumbUpAltOutlinedIcon from "@mui/icons-material/ThumbUpAltOutlined";
import ThumbDownAltOutlinedIcon from "@mui/icons-material/ThumbDownAltOutlined";
import ThumbUpIcon from "@mui/icons-material/ThumbUp";
import ThumbDownIcon from "@mui/icons-material/ThumbDown";
import { handleMessageLike } from "../../utlis";
import { useStyles } from "../../styling";
import globalStyles from "core/Styles/globalStyles";
import DoubleTicks from "assets/chatbot/DoubleTicks.svg";
import { throttle } from "lodash";

const MessageTemplate = (props) => {
  const {
    templateData,
    chatMode,
    endCurrentSession,
    clearChatSession,
    screenName,
    currentAppLink,
    screenLinkData,
    selectedModule,
    displaySnackMessages,
  } = props;
  const globalClasses = globalStyles();
  const classes = useStyles();
  const dateFormat = "DD-MM-YYYY HH:mm:ss";
  const [loadingState, setLoadingState] = useState({
    like: null,
    dislike: null,
  });

  const renderActionableCTA = () => {
    return (
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
  };

  const renderDateChip = (dateString) => {
    return <Typography className={classes.dateChip}>{dateString}</Typography>;
  };

  const parseBody = (botData) => {
    switch (botData.bodyType) {
      case "text":
        const string = botData?.bodyText?.includes("IA Smart Platform");
        return Boolean(botData.bodyText.includes("\n")) ? (
          <div>
            {botData.bodyText.split("\n").map((text, index) => (
              <React.Fragment key={index}>
                <Typography className={classes.bodyTextStyling}>
                  {text.indexOf("**") > -1 ? (
                    <TextRenderer text={text} />
                  ) : (
                    text
                  )}
                </Typography>
                <br />
              </React.Fragment>
            ))}
          </div>
        ) : (
          <>
            {string ? (
              <Typography variant="div" className={classes.chatbotText}>
                {botData?.bodyText.slice(
                  0,
                  botData?.bodyText.indexOf("IA Smart Platform")
                )}
                <Typography variant="span" sx={{ fontWeight: 600 }}>
                  {botData?.bodyText.slice(
                    botData?.bodyText.indexOf("IA Smart Platform"),
                    botData?.bodyText.indexOf("IA Smart Platform") + 18
                  )}
                </Typography>
                {botData?.bodyText.slice(
                  botData?.bodyText.indexOf("IA Smart Platform") + 18,
                  botData?.bodyText?.length
                )}
              </Typography>
            ) : (
              <Typography className={classes.chatbotText}>
                <TextRenderer text={botData.bodyText} />
              </Typography>
            )}
          </>
        );
      case "chips":
        return (
          <div
            className={`${globalClasses.flexRow} ${globalClasses.flexWrap} ${globalClasses.gap} ${globalClasses.verticalAlignCenter}`}
          >
            {botData.bodyText.map((data, index) => {
              const callBack = data.interactable
                ? Object.entries(props).filter(
                    (entry) => entry[0] === data.actionName
                  )?.[0]?.[1]
                : null;

              return (
                <Typography
                  key={index}
                  component="span"
                  variant="body1"
                  className={`${classes.gptChips} ${
                    data.interactable ? globalClasses.cursorPointer : ""
                  }`}
                  onClick={() => {
                    callBack && callBack(data);
                  }}
                >
                  {data.displayText}
                </Typography>
              );
            })}
          </div>
        );
      case "questions":
        return (
          <div
            className={`${globalClasses.flexRow} ${globalClasses.flexColumn} ${classes.gptQuestionContainer}`}
          >
            {botData.bodyText.map((data, index) => {
              const callBack = data.interactable
                ? Object.entries(props).filter(
                    (entry) => entry[0] === data.actionName
                  )?.[0]?.[1]
                : null;

              return (
                <div
                  key={index}
                  className={`${globalClasses.layoutAlignStart} ${classes.gptQuestionBlock}`}
                >
                  <Typography
                    component="span"
                    variant="button"
                    className={classes.maxWidthFitContent}
                  >
                    Ques{" " + data.question_index}
                  </Typography>
                  <Typography
                    component="span"
                    variant="body1"
                    className={`${classes.gptQuestions} ${
                      data.interactable ? globalClasses.cursorPointer : ""
                    }`}
                    onClick={() => {
                      callBack && callBack(data);
                    }}
                  >
                    <HighlightedRenderer sentence={data.displayText} />
                  </Typography>
                </div>
              );
            })}
          </div>
        );
      default:
        return null;
    }
  };

  const botView = (botData, state) => {
    let time = moment(botData.timeStamp, dateFormat).format("HH:mm A");
    const likeDislikeKey = `${
      botData?.response_heading || botData?.screen_name
    }_${botData?.timeStamp}`;

    return (
      <>
        <div className={`${globalClasses.flexRow} ${classes.BotMessage}`}>
          <span className={classes.botTitleView}>{botData.userName}</span>
          <span className={classes.time}>{time}</span>
        </div>
        <div className={classes.BotMessage}>
          <div
            className={`${classes.botViewBlock} ${globalClasses.flexRow} ${globalClasses.flexColumn}`}
          >
            {!botData?.noShowHeaderTitle &&
              Boolean(botData.headerTitle?.length) && (
                <Typography className={classes.chatbotText}>
                  {botData.headerTitle}
                </Typography>
              )}
            {parseBody(botData)}
          </div>
          {renderLikeDislikeSection(botData, state, likeDislikeKey)}
        </div>
      </>
    );
  };

  const renderLikeDislikeSection = (botData, state, likeDislikeKey) => {
    if (!botData?.enableLikes) return null;

    return (
      <div
        className={`${globalClasses.layoutAlignEnd} ${classes.messageActionWrapper}`}
      >
        {botData?.extra?.hasOwnProperty("status") ? (
          botData?.extra?.status === "liked" ? (
            <ThumbUpIcon className="activeIcon" />
          ) : (
            <ThumbDownIcon className="activeIcon" />
          )
        ) : (
          renderLikeDislikeButtons(state, likeDislikeKey)
        )}
      </div>
    );
  };

  const renderLikeDislikeButtons = (state, likeDislikeKey) => {
    return (
      <>
        {state?.like === likeDislikeKey ? (
          <ThumbUpIcon className="activeIcon" />
        ) : (
          <ThumbUpAltOutlinedIcon
            onClick={() => handleLikeDislike(likeDislikeKey, true)}
          />
        )}
        {state?.dislike === likeDislikeKey ? (
          <ThumbDownIcon className="activeIcon" />
        ) : (
          <ThumbDownAltOutlinedIcon
            onClick={() => handleLikeDislike(likeDislikeKey, false)}
          />
        )}
      </>
    );
  };

  const handleLikeDislike = useCallback(
    throttle(
      (key, isLike) => {
        setLoadingState({
          ...loadingState,
          [isLike ? "like" : "dislike"]: key,
        });
        handleMessageLike(
          key,
          isLike,
          setLoadingState,
          displaySnackMessages,
          templateData
        );
      },
      5000,
      { trailing: false }
    ),
    [loadingState, templateData, displaySnackMessages]
  );

  const userView = (userData) => {
    let time = moment(userData.timeStamp, dateFormat).format("HH:mm A");
    const bubbleWidth = getBubbleWidth(userData.bodyText);

    return (
      <div className={classes.userViewBlock} style={{ width: bubbleWidth }}>
        <div className={classes.firstRow}>
          <Typography className={classes.time}>{time}</Typography>
          <DoubleTicks />
        </div>
        <div className={classes.messageRow}>
          {Boolean(userData.bodyText.includes("\n")) ? (
            userData.bodyText.split("\n").map((text, index) => (
              <Typography key={index} className={classes.messageText}>
                {text}
              </Typography>
            ))
          ) : (
            <Typography className={classes.messageText}>
              {userData.bodyText}
            </Typography>
          )}
        </div>
      </div>
    );
  };

  const getBubbleWidth = (text) => {
    const length = text?.length;
    if (length <= 20) return "30%";
    if (length <= 50) return "50%";
    return "70%";
  };

  const getLoader = (botData) => {
    let time = moment(botData.timeStamp, dateFormat).format("HH:mm A");
    return (
      <div
        className={`${classes.botViewBlock} ${globalClasses.flexRow} ${globalClasses.flexColumn}`}
      >
        <div
          className={`${globalClasses.flexRow} ${globalClasses.layoutAlignBetweenCenter}`}
        >
          <Typography variant="text" className={classes.botViewHeader}>
            {botData.userName}
          </Typography>
          <Typography variant="text" className={classes.botViewHeader}>
            {time}
          </Typography>
        </div>
        <div className={`${globalClasses.positionRelative}`}>
          <div className={classes.loader}></div>
        </div>
      </div>
    );
  };

  const renderChats = React.useMemo(() => {
    if (!templateData[chatMode]?.length) {
      return null;
    }

    let dayData;
    return templateData[chatMode]?.map((data, index) => {
      let currentDayData = data.timeStamp
        ? moment(data.timeStamp, dateFormat).format("DD MMM YYYY")
        : null;

      let dateChip;
      if (currentDayData !== dayData) {
        dayData = currentDayData;
        dateChip = renderDateChip(currentDayData);
      }

      let chatCTA;
      if (
        ["bot", "loader"].includes(data.userType) &&
        templateData[chatMode]?.length === index + 1
      ) {
        chatCTA = renderActionableCTA();
      }

      switch (data.userType) {
        case "bot":
          return (
            <React.Fragment key={index}>
              {dateChip}
              {botView(data, loadingState)}
              {chatCTA}
            </React.Fragment>
          );
        case "user":
          return (
            <React.Fragment key={index}>
              {dateChip}
              {userView(data)}
            </React.Fragment>
          );
        case "loader":
          return (
            <React.Fragment key={index}>
              {getLoader(data)}
              {chatCTA}
            </React.Fragment>
          );
        default:
          return null;
      }
    });
  }, [templateData[chatMode], chatMode, selectedModule, loadingState]);

  return <>{renderChats}</>;
};

export default MessageTemplate;
