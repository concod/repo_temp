import React, { useState } from "react";
import { Button } from "@mui/material";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import CommentingMainSection from "./CommentingMainSection";
import TextInputFieldSection from "./TextInputFieldSection";
import globalStyles from "core/Styles/globalStyles";

const CommentingReplySection = ({
  commentData,
  classes,
  showReplySection,
  selectedComment,
  handleOpenDropdown,
  openChilCommentdDropDown,
  handleCloseDropdown,
  setChildComment,
  setShowReplyTextInput,
  editCommentFn,
  setEditCommentTextInput,
  setShowDeleteDialog,
  saveComment,
  childComment,
  showReplyTextInput,
  setDeleteCommentData,
  editCommentTextInput,
  userData,
  setShowReplySection,
  setSelectedComment,
  usersMentioned,
  setUserMentioned,
}) => {
  const globalClasses = globalStyles();
  const [isChildCommentEditable, setChildCommentEditable] = useState(false);
  const [selectedChildComment, setSelectedChildComment] = useState(null);
  const toggleReplyActiveSection = (showReplySection, data) => {
    // Show Reply section for the selected comment
    if (selectedComment && selectedComment.note_code === data.note_code) {
      setShowReplySection(!showReplySection);
      setShowReplyTextInput(!showReplyTextInput);
    } else {
      setShowReplySection(true);
      setShowReplyTextInput(true);
    }
    // Show reply text input field
    setChildComment(null);
    setChildCommentEditable(false);
    setSelectedComment(data);
  };
  const toggleChildComment = (commentData) => {
    setSelectedComment(commentData);
    // Show/hide reply section and text input
    setShowReplyTextInput(!showReplyTextInput);
    setShowReplySection(!showReplySection);
  };

  return (
    <div>
      {commentData?.repliesArray?.length ? (
        <div className={classes.replyWrapper}>
          <Button
            onClick={() => {
              toggleReplyActiveSection(showReplySection, commentData);
            }}
          >
            <span
              className={`${globalClasses.centerAlign} ${
                showReplySection &&
                selectedComment?.note_code === commentData.note_code
                  ? classes.downArrowIcon
                  : classes.rightArrowIcon
              }`}
            >
              <ArrowForwardIosIcon className={classes.arrowForwardIosIcon} />
            </span>
            <span>{commentData.repliesArray.length} Replies</span>
          </Button>
          {showReplySection &&
            selectedComment?.note_code === commentData.note_code && (
              <div>
                <ul>
                  {commentData?.repliesArray.map((childCommentData) => {
                    return (
                      <li>
                        <div className={classes.contentWrapper}>
                          <CommentingMainSection
                            commentData={childCommentData}
                            isCommentEditable={
                              isChildCommentEditable &&
                              childCommentData.note_code ===
                                selectedChildComment?.note_code
                            }
                            handleOpenDropdown={handleOpenDropdown}
                            setSelectedComment={setSelectedChildComment}
                            openCommentDropdown={openChilCommentdDropDown}
                            handleCloseDropdown={handleCloseDropdown}
                            userData={userData}
                            selectedComment={selectedChildComment}
                            setCommentEditable={setChildCommentEditable}
                            setEditCommentTextInput={setEditCommentTextInput}
                            setShowDeleteDialog={setShowDeleteDialog}
                            setDeleteCommentData={setDeleteCommentData}
                            type="child"
                            classes={classes}
                            editCommentFn={editCommentFn}
                            editCommentTextInput={editCommentTextInput}
                            setUserMentioned={setUserMentioned}
                            usersMentioned={usersMentioned}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
        </div>
      ) : (
        <Button
          id="reply"
          color="primary"
          onClick={() => toggleChildComment(commentData)}
        >
          Reply
        </Button>
      )}
      <div className={classes.editTextDiv}>
        {showReplySection &&
          showReplyTextInput &&
          selectedComment?.note_code === commentData.note_code && (
            <div className={classes.editTextInput}>
              <TextInputFieldSection
                type={"reply"}
                comment={childComment}
                setComment={setChildComment}
                saveComment={() => saveComment("reply")}
                closeComment={() => {
                  setShowReplyTextInput(false);
                  setShowReplySection(false);
                  setChildComment(null);
                }}
                classes={classes}
                setUserMentioned={setUserMentioned}
                usersMentioned={usersMentioned}
              />
            </div>
          )}
      </div>
    </div>
  );
};

export default CommentingReplySection;
