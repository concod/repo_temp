import { useEffect, useRef, useState } from "react";
import makeStyles from "@mui/styles/makeStyles";
import { Typography } from "@mui/material";
import { Input, Badge, Button, Tooltip, useTranslation } from "impact-ui-v3";
import colours from "core/Styles/colours";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import CheckOutlinedIcon from "@mui/icons-material/CheckOutlined";
import { pxToRem } from "core/Utils/functions/utils";
import globalStyles from "core/Styles/globalStyles";
import ResolvedIcon from "assets/impactv3/resolve.svg";
import moment from "moment";

const useStyles = makeStyles((theme) => ({
  icon: {
    height: "1.5rem",
    width: "1.5rem",
    cursor: "pointer",
    color: colours.icon,
  },
  heading: {
    fontSize: "1rem",
    fontWeight: 500,
    lineHeight: "1.25rem",
    color: colours.neutrals,
    marginTop: "0.25rem",
    marginBottom: "0.25rem",
    marginRight: "0.67rem",
    fontFamily: "Manrope",
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
    display: "inline-block",
    overflow: "hidden",
    maxWidth: "130px",
  },
  subHeading: {
    fontSize: "0.75rem",
    fontWeight: 500,
    lineHeight: pxToRem(15),
    color: colours.darkGrey,
    fontFamily: "Manrope",
  },
  input: {
    height: "28px !important",
  },
}));

const ChatSystemEventName = (props) => {
  const classes = useStyles();
  const globalClasses = globalStyles();
  const { t } = useTranslation();

  const { chatList, activeEvent, handleEvents, activeEventId } = props;

  const eventCreatedDate = chatList[activeEventId]?.created_at;

  const [inputValue, setInputValue] = useState(activeEvent);
  const [editMode, setEditMode] = useState(false);

  const inputRef = useRef(inputValue);

  useEffect(() => {
    setInputValue(activeEvent);
    inputRef.current = activeEvent;
  }, [activeEvent]);

  const handleSubmitEventName = () => {
    if (activeEvent !== inputValue) {
      handleEvents("event-name", {
        previousName: activeEvent,
        newName: inputValue,
      });
    }
    setEditMode(false);
  };

  const commentCounts = chatList[activeEventId]?.comments_count || 0;
  const isResolved = chatList[activeEventId]?.resolved;

  return (
    <>
      <div className="event-name-data">
        {editMode ? (
          <div
            className={`${globalClasses.flexRow} ${globalClasses.layoutAlignCenter}`}
          >
            <Input
              value={inputValue}
              className={classes.input}
              type="text"
              onChange={(event) => setInputValue(event.target.value)}
            />
            <CheckOutlinedIcon
              className={classes.icon}
              onClick={() => handleSubmitEventName()}
            />
            <CloseOutlinedIcon
              className={classes.icon}
              onClick={() => {
                setInputValue(inputRef.current);
                setEditMode(false);
              }}
            />

            {commentCounts ? (
              <Badge
                color="info"
                label={`${commentCounts} ${t("chat.replies")}`}
                onClick={() => {}}
                variant="stroke"
              />
            ) : null}
          </div>
        ) : (
          <>
            <Tooltip title={inputValue}>
              <Typography
                className={classes.heading}
                onClick={() => setEditMode(true)}
              >
                {inputValue}
              </Typography>
            </Tooltip>

            {commentCounts ? (
              <Badge
                color="info"
                label={`${commentCounts} ${t("chat.replies")}`}
                onClick={() => {}}
                variant="stroke"
              />
            ) : null}
          </>
        )}

        <div className="resolve">
          <ResolvedIcon />
          {!isResolved && !props?.isResolvedFilter ? (
            <Button
              variant="url"
              onClick={() => handleEvents("resolve", { key: activeEvent })}
            >
              {isResolved ? t("chat.unresolve") : t("chat.resolve")}
            </Button>
          ) : null}
        </div>
      </div>
      <Typography className={classes.subHeading}>
        {`${t("chat.createdOn")} ${moment(eventCreatedDate).format("L")}`}
      </Typography>
    </>
  );
};

export default ChatSystemEventName;
