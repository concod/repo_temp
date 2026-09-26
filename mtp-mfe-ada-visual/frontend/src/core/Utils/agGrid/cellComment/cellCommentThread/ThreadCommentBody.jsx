import { useState } from "react";
import globalStyles from "core/Styles/globalStyles";
import { makeStyles } from "@mui/styles";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { pxToRem } from "core/Utils/functions/utils";
import { Typography } from "@mui/material";
import {
  getRandomProfileColor,
  getRelativeTime,
  handleMenuOpen,
  handleMenuClose,
} from "../utils";
import { useDispatch, useSelector } from "react-redux";
import { handleDeleteComment } from "./cellCommentThreadActions";
import { addUsersMentioned } from "core/commonComponents/ChatSystem/utils";

const useStyles = makeStyles((theme) => ({
  commentBody: {
    minHeight: pxToRem(64),
    width: pxToRem(381),
    paddingRight: pxToRem(8),
  },
  commentHeader: {
    gap: pxToRem(4),
  },
  commentContentHeader: {
    marginBottom: pxToRem(13),
    gap: pxToRem(4),
  },
  commentContentWrapper: {
    flexGrow: 1,
    marginTop: pxToRem(8),
  },
  profileIcon: {
    minWidth: pxToRem(36),
    aspectRatio: "1/1",
    borderRadius: pxToRem(12),
    border: `1px solid ${theme.palette.common.white}`,
    color: theme.palette.common.white,
    fontSize: pxToRem(12),
    lineHeight: pxToRem(30),
    fontWeight: 800,
  },
  username: {
    fontWeight: 600,
    fontSize: pxToRem(14),
    lineHeight: pxToRem(21),
    color: theme.palette.text.black,
    fontFamily: "Manrope",
  },
  helperText: {
    fontWeight: 500,
    fontSize: pxToRem(12),
    lineHeight: pxToRem(15),
    color: theme.palette.colours.neutralGrey,
    cursor: "pointer",
  },
  commentText: {
    lineHeight: pxToRem(20),
    fontSize: pxToRem(14),
    fontWeight: 500,
    color: theme.palette.text.black,
    fontFamily: "Manrope",
    boxSizing: "border-box",
  },

  menuBody: {
    width: pxToRem(150),
    height: pxToRem(90),
    borderRadius: pxToRem(12),
    border: `1px solid  ${theme.palette.colours.menuBorder}`,
    boxShadow: "0px 1px 6px 0px #1A277C24",
    padding: `${pxToRem(8)} ${pxToRem(6)}`,
    "& .MuiList-root": {
      padding: 0,
    },
  },
  highlight: {
    display: "inline",
    color: theme.palette.colours.brightRoyalBlue,
    cursor: "pointer",
    fontSize: "1em",
    fontWeight: 500,
    lineHeight: "1.25rem",
    wordBreak: "break-word",
  },
  menuItem: {
    width: pxToRem(138),
    height: pxToRem(36),
    padding: `${pxToRem(8)} ${pxToRem(12)}`,
  },
}));
const ThreadCommentBody = ({ props }) => {
  const {
    created_by = {
      user_name: null,
      user_id: null,
      email: null,
      user_code: null,
    },
    comment,
    created_at,
    comment_id,
    users_mentioned = [],
  } = props.comment;
  const { eventId = null, textFieldRef } = props;
  const classes = useStyles();
  const globalClasses = globalStyles();
  const dispatch = useDispatch();

  const { activeTableInfo, activeApplicationInfo } = useSelector(
    (state) => state.cellCommentReducer
  );
  const [actionsMenu, setActionsMenu] = useState({
    isMenuOpen: false,
    anchorEl: null,
  });

  const handleActivateEdit = () => {
    // props.setInputValue(props?.comment?.comment);
    props?.setIsEditComment({
      isActive: true,
      activeCommentID: comment_id,
      comment: comment,
      usersMentioned: users_mentioned
    });
    handleMenuClose(setActionsMenu);
  };
  const handleDelete = async () => {
    const payload = {
      event_id: eventId,
      component_type: activeTableInfo?.tableId,
      application_code: activeApplicationInfo?.applicationCode,
      screen_code: activeApplicationInfo?.screenCode,
      components: [
        {
          component_id: String(activeTableInfo?.rowId),
          sub_component_id: activeTableInfo?.columnName,
        },
      ],
    };
    handleDeleteComment(comment_id, payload, dispatch);
    handleMenuClose(setActionsMenu);
  };
  return (
    <>
      {created_by.user_name && (
        <div
          className={`${classes.commentBody} ${globalClasses.layoutAlignSpaceBetween} ${globalClasses.verticalAlignStart} ${classes.commentHeader}`}
        >
          <Typography
            variant="text"
            className={`${globalClasses.centerAlign}  ${classes.profileIcon}`}
            sx={{
              backgroundColor: getRandomProfileColor(created_by.user_name),
            }}
          >
            {created_by.user_name?.slice(0, 1)}
          </Typography>
          <div className={`${classes.commentContentWrapper}`}>
            <div
              className={`${classes.commentContentHeader} ${globalClasses.layoutAlignStart} ${globalClasses.verticalAlignBaseline}`}
            >
              <Typography variant="text" className={classes.username}>
                {created_by.user_name}
              </Typography>
              <Typography variant="text" className={classes.helperText}>
                {getRelativeTime(created_at)}
              </Typography>
            </div>
            <div
              className={classes.commentText}
              dangerouslySetInnerHTML={{
                __html: addUsersMentioned(
                  comment,
                  users_mentioned,
                  classes.highlight
                ),
              }}
            ></div>
          </div>
          {localStorage.getItem("name") === created_by?.email && (
            <>
              <MoreHorizIcon
                className={`${globalClasses.cursorPointer}`}
                onClick={(event) => handleMenuOpen(event, setActionsMenu)}
              />
              <Menu
                anchorEl={actionsMenu?.anchorEl}
                open={actionsMenu?.isMenuOpen}
                onClose={() => handleMenuClose(setActionsMenu)}
                classes={{ paper: classes.menuBody }}
                transformOrigin={{ horizontal: "right", vertical: "top" }}
                anchorOrigin={{
                  vertical: "bottom",
                  horizontal: "right",
                }}
              >
                <MenuItem
                  classes={{ root: classes.menuItem }}
                  onClick={handleActivateEdit}
                >
                  Edit
                </MenuItem>
                <MenuItem
                  classes={{ root: classes.menuItem }}
                  onClick={handleDelete}
                >
                  Delete
                </MenuItem>
              </Menu>
            </>
          )}
        </div>
      )}
    </>
  );
};

export default ThreadCommentBody;
