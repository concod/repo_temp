import MoreVertOutlinedIcon from "@mui/icons-material/MoreVertOutlined";
import { useState } from "react";
import makeStyles from "@mui/styles/makeStyles";
import { Menu, useTranslation } from "impact-ui-v3";
import ModeEditIcon from "@mui/icons-material/ModeEdit";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import colours from "core/Styles/colours";
import UseCopyToClipboard from "core/Utils/hooks/UseCopyToClipboard";
import ReplyIcon from "assets/impactv3/reply.svg";
import { useDispatch } from "react-redux";
import { displaySnackMessages } from "core/Utils/utils";
import {
  getTextFromHTML,
  checkCurrentTimeIsGreaterThanSomeTime,
} from "../utils";
import "./ChatSystemMessage.scss";

const useStyles = makeStyles((theme) => ({
  icon: {
    height: "1.25rem",
    width: "1.25rem",
    color: colours.icon,
    cursor: "pointer",
  },
}));

const ChatSystemEditOptions = (props) => {
  const classes = useStyles();
  const { t } = useTranslation();

  const {
    starred,
    setStarred,
    setReplayMessage,
    chatMessage,
    handleCommentChanges,
    setEditMessage,
    userName,
  } = props;

  const [anchorEl, setAnchorEl] = useState(null);

  const dispatch = useDispatch();

  const closeMenu = () => {
    setAnchorEl(null);
  };

  const copyToClipboard = () => {
    UseCopyToClipboard(getTextFromHTML(chatMessage.comment));
    displaySnackMessages(t("chatSystem.messageCopiedSuccessfully"), "success", dispatch, {
      horizontal: "right",
      vertical: "top",
    });
    closeMenu();
  };

  const deleteMessage = async () => {
    handleCommentChanges("delete", chatMessage);
    closeMenu();
  };

  const makeStarred = () => {
    setStarred(!starred);
    handleCommentChanges("starred", {
      ...chatMessage,
      starred: !starred,
    });
    closeMenu();
  };

  const makeReply = () => {
    setReplayMessage(chatMessage);
    closeMenu();
  };

  const editComment = () => {
    setEditMessage(chatMessage);
    closeMenu();
  };

  const isCommentEditabled =
    userName !== chatMessage.created_by?.user_name ||
    checkCurrentTimeIsGreaterThanSomeTime(chatMessage.created_at, 5);

  const options = [
    {
      label: t("chat.edit"),
      value: "edit",
      icon: <ModeEditIcon />,
      disabled: isCommentEditabled,
      onClick: () => editComment(),
    },
    {
      label: t("chat.reply"),
      value: "reply",
      icon: <ReplyIcon />,
      onClick: () => makeReply(),
    },
    {
      label: starred ? t("chat.unstar") : t("chat.star"),
      value: starred ? "unstar" : "star",
      disabled: userName !== chatMessage.created_by.user_name,
      icon: <StarBorderIcon />,
      onClick: () => makeStarred(),
    },
    {
      label: t("chat.copy"),
      value: "copy",
      icon: <ContentCopyIcon />,
      onClick: () => copyToClipboard(),
    },
    {
      label: t("chat.delete"),
      value: "delete",
      icon: <DeleteOutlineOutlinedIcon />,
      disabled: userName !== chatMessage.created_by.user_name,
      onClick: () => deleteMessage(),
    },
  ];

  return (
    <div className="edit-options-container">
      <MoreVertOutlinedIcon
        className={classes.icon}
        onClick={(event) => setAnchorEl(event.currentTarget)}
      />
      <Menu
        anchorEl={anchorEl}
        className="edit-options"
        open={anchorEl}
        onClose={() => closeMenu()}
        options={options}
      />
    </div>
  );
};

export default ChatSystemEditOptions;
