import { useState } from "react";
import { Button, Tooltip } from "impact-ui-v3";
import makeStyles from "@mui/styles/makeStyles";
import { pxToRem } from "core/Utils/functions/utils";
import colours from "core/Styles/colours";
import { Avatar } from "@mui/material";
import ChatSystemMemberDropdown from "./ChatSystemMemberDropdown/ChatSystemMemberDropdown";
import "./ChatSystemHeader.scss";


const useStyles = makeStyles(() => ({
  avatar: {
    height: "1rem",
    width: "1rem",
    fontSize: pxToRem(14),
    fontWeight: 400,
    transform: "scale(1.25)",
  },
  avatar0: {
    background: "#0055AF4D",
    color: "#0055AF",
  },
  avatar1: {
    background: "#646CE74D",
    color: "#646CE7",
  },
  avatar2: {
    background: "#FF832B4D",
    color: "#FF832B",
  },
  button: {
    fontSize: "0.75rem",
    fontWeight: 400,
    lineHeight: pxToRem(18),
    color: colours.newBlue,
    padding: 0,
    marginRight: "0.5rem",
  },
}));

const ChatSystemMemberAddition = (props) => {
  const classes = useStyles();

  const { handleEvents, eventId, userMentioned } = props;

  const [userDropdown, setUserDropdown] = useState(false);
  const avatar = props?.userMentioned?.map((user) => user?.user_name);

  return (
    <section className="member-section">
      <Button variant="url" onClick={() => setUserDropdown(!userDropdown)}>
        + Add Members
      </Button>
      {userDropdown && (
        <ChatSystemMemberDropdown
          setUserDropdown={setUserDropdown}
          handleEvents={handleEvents}
          eventId={eventId}
          userMentioned={userMentioned}
        />
      )}
      <div className="avatar-section">
        {avatar.slice(0, 3).map((item, index) => (
          <Tooltip
            orientation="bottom"
            variant="tertiary"
            title={item}
          >
            <Avatar
              key={item}
              className={`${classes.avatar} ${classes[`avatar${index}`]}`}
            >
              {item.charAt(0)}
            </Avatar>
          </Tooltip>
        ))}
        {avatar.length > 3 && (
          <div className="more-avatar">{`+${avatar.length - 3}`}</div>
        )}
      </div>
    </section>
  );
};

export default ChatSystemMemberAddition;
