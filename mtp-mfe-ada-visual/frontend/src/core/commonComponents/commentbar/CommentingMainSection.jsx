import { useEffect } from "react";
import moment from "moment";
import { DASHBOARD } from "../../Utils/constants/assortSmart-constants";
import { Button } from "impact-ui-v3";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { Delete, Edit } from "@mui/icons-material";
import TextInputFieldSection from "./TextInputFieldSection";
import { sanitizeHtml } from "core/Utils/functions/utils";
import globalStyles from "core/Styles/globalStyles";

const CommentingMainSection = ({
  commentData,
  handleOpenDropdown,
  setSelectedComment,
  isCommentEditable,
  openCommentDropdown,
  handleCloseDropdown,
  userData,
  selectedComment,
  setCommentEditable,
  setEditCommentTextInput,
  setShowDeleteDialog,
  setDeleteCommentData,
  type,
  classes,
  editCommentFn,
  editCommentTextInput,
  usersMentioned,
  setUserMentioned,
}) => {
  const globalClasses = globalStyles();
  useEffect(() => {
    if (!isCommentEditable) {
      document.getElementById(
        `comment_${commentData.note_code}`
      ).innerHTML = sanitizeHtml(commentData.html_msg, {
        ALLOWED_TAGS: ["mark"],
      });
    }
  }, [commentData, isCommentEditable]);

  return (
    <div className={classes.parentContainer}>
      <div className={`${classes.headerWrap} ${globalClasses.gapHalf}`}>
        <div className={classes.userWrap}>
          <div className={classes.userName}>
            <span>{commentData.created_by_name}</span>
          </div>
          <div className={classes.timeStamp}>
            {moment(commentData.updated_at).format(DASHBOARD.__Date_Format)}
          </div>
        </div>
        <Button
          id="action-button"
          icon={
            <MoreHorizIcon onClick={() => setSelectedComment(commentData)} />
          }
          variant="url"
          onClick={(event) => handleOpenDropdown(event, type)}
        />
      </div>
      {!isCommentEditable && (
        <div className={classes.editTextDiv}>
          <span id={`comment_${commentData.note_code}`}>
            {commentData.html_msg}
          </span>
        </div>
      )}
      <div>
        {isCommentEditable &&
          commentData.note_code === selectedComment?.note_code && (
            <div className={classes.editTextDiv}>
              <div className={classes.editTextInput}>
                <TextInputFieldSection
                  type="edit"
                  editCommentTextInput={editCommentTextInput}
                  setEditCommentTextInput={setEditCommentTextInput}
                  setCommentEditable={setCommentEditable}
                  selectedComment={selectedComment}
                  editCommentFn={editCommentFn}
                  classes={classes}
                  setUserMentioned={setUserMentioned}
                  usersMentioned={usersMentioned}
                />
              </div>
            </div>
          )}
      </div>
      <Menu
        id="menu"
        className={classes.menu}
        anchorEl={openCommentDropdown}
        open={openCommentDropdown}
        onClose={() => handleCloseDropdown(type)}
      >
        {userData.name === selectedComment?.created_by_email ? (
          <>
            <MenuItem
              onClick={() => {
                setCommentEditable(true);
                setEditCommentTextInput(selectedComment.html_msg);
                handleCloseDropdown(type);
              }}
            >
              <Edit /> Edit
            </MenuItem>
            <MenuItem
              onClick={() => {
                setShowDeleteDialog(true);
                handleCloseDropdown(type);
                setDeleteCommentData(selectedComment);
              }}
            >
              <Delete /> Delete
            </MenuItem>
          </>
        ) : null}
      </Menu>
    </div>
  );
};
export default CommentingMainSection;
