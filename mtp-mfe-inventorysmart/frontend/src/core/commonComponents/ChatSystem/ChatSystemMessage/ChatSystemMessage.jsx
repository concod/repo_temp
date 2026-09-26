import { useEffect, useState } from "react";
import moment from "moment";
import { Avatar } from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import { pxToRem } from "core/Utils/functions/utils";
import colours from "core/Styles/colours";
import StarIcon from "@mui/icons-material/Star";
import ChatSystemEditOptions from "./ChatSystemEditOptions";
import { addUsersMentioned } from "../utils";
import "./ChatSystemMessage.scss";
import { Badge } from "impact-ui-v3";
import globalStyles from "core/Styles/globalStyles";

const useStyles = makeStyles((theme) => ({
  avatar: {
    fontSize: "0.75rem",
    fontWeight: 800,
    lineHeight: pxToRem(16.67),
    height: "1.25rem",
    width: "1.25rem",
    textTransform: "capitalize",
  },
  icon: {
    height: "1.25rem",
    width: "1.25rem",
    color: colours.endavour,
    marginLeft: "0.25rem",
    cursor: "pointer",
  },
  avatar1: {
    background: colours.lightGreyNew,
    color: colours.darkGrey,
  },
  avatar2: {
    background: colours.lightGreyNew,
    color: colours.darkGrey,
  },
  avatar3: {
    background: colours.lightPink,
    color: colours.darkPink,
  },
  highlight: {
    display: "inline",
    color: colours.darkBlue,
    cursor: "pointer",
    fontSize: "1em",
    fontWeight: 500,
    lineHeight: "1.25rem",
    wordBreak: "break-word",
  },
}));

const ChatSystemMessage = (props) => {
  const classes = useStyles();
  const globalClasses = globalStyles();

  const {
    setReplayMessage,
    chatMessage = {},
    handleCommentChanges,
    setEditMessage,
    userName,
    isResolved,
  } = props;

  const [starred, setStarred] = useState(chatMessage.starred || false);
  const [hover, setHover] = useState(false);
  const randomNumber = Math.floor(Math.random() * 3) + 1;

  useEffect(() => {
    setStarred(chatMessage.starred || false);
  }, [chatMessage]);
  const isParentAvailable =
    chatMessage?.parent && chatMessage.parent.comment_id;

  if (chatMessage)
    return (
      <section
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        className={`msg-container`}
      >
        {!chatMessage.hasOwnProperty("created_by") ? (
          <div className={globalClasses.centerAlign}>
            <Badge
              label={chatMessage?.comment}
              color="default"
              size="default"
              variant="subtle"
            />
          </div>
        ) : (
        <div className="msg">
          <div className="user">
            <div className="user-details">
              <Avatar
                className={`${classes.avatar} ${
                  classes[`avatar${randomNumber}`]
                }`}
              >
                {chatMessage.created_by.user_name?.charAt(0) || "U"}
              </Avatar>
              <div className="user-name">
                {chatMessage.created_by.user_name}
              </div>
              <div className="time">
                {moment(chatMessage.created_at).format("LT")}
              </div>
            </div>
            {starred && <StarIcon className={classes.icon} />}
          </div>
          {isParentAvailable && (
            <div className="reply-msg">
              <div className="user">
                <div className="user-details">
                  <Avatar className={`${classes.avatar3} ${classes.avatar}`}>
                    {chatMessage.parent.created_by.user_name?.charAt(0) || "U"}
                  </Avatar>
                  <div className="user-name">
                    {chatMessage.parent.created_by.user_name}
                  </div>
                  <div className="time">
                    {moment(chatMessage.parent.created_at).format("LT")}
                  </div>
                </div>
                {chatMessage.parent.starred && (
                  <StarIcon className={classes.icon} />
                )}
              </div>
              <div className="message">
                <div
                  className="description"
                  dangerouslySetInnerHTML={{
                    __html: addUsersMentioned(
                      chatMessage.parent.comment,
                      chatMessage.parent.users_mentioned,
                      classes.highlight
                    ),
                  }}
                />
              </div>
            </div>
          )}
          <div className="message">
            <div
              className="description"
              dangerouslySetInnerHTML={{
                __html: addUsersMentioned(
                  chatMessage.comment,
                  chatMessage.users_mentioned,
                  classes.highlight
                ),
              }}
            />
            {!isResolved && hover && (
              <ChatSystemEditOptions
                starred={starred}
                setStarred={setStarred}
                setReplayMessage={setReplayMessage}
                chatMessage={chatMessage}
                handleCommentChanges={handleCommentChanges}
                setEditMessage={setEditMessage}
                userName={userName}
              />
            )}
          </div>
        </div>
        )}
      </section>
    );

  return null;
};

export default ChatSystemMessage;
