import { Typography } from "@mui/material";
import { useStyles } from "../../../../styling";
import { formatTime, getBubbleWidth } from "../../utils.js";
import DoubleTicks from "assets/chatbot/DoubleTicks.svg";

const UserMessage = ({ userData }) => {
  const classes = useStyles();
  const time = formatTime(userData.timeStamp);
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

export default UserMessage;
