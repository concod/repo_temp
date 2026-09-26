import React, { useEffect, useState } from "react";
import { Button } from "@mui/material";
import TagSuggestionSection from "./TagSuggestionSection";
import { doesFirstLetterStartsWithASymbol } from "core/Utils/utils";
import globalStyles from "core/Styles/globalStyles";

const TextInputFieldSection = ({
  type,
  comment,
  setComment,
  saveComment,
  closeComment,
  editCommentTextInput,
  setEditCommentTextInput,
  setCommentEditable,
  selectedComment,
  editCommentFn,
  classes,
  setUserMentioned,
  usersMentioned,
  placeholder = "",
}) => {
  const [hasSuggestions, setHasSuggestions] = useState(false);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const globalClasses = globalStyles();

  useEffect(() => {
    if (type === "edit") {
      document.getElementById(
        "editTextBoxField"
      ).value = ` ${editCommentTextInput}`;
    }
  }, [type]);

  const handleCommentInputChange = (e, type) => {
    try {
      type === "edit"
        ? setEditCommentTextInput(e.currentTarget.value)
        : setComment(e.currentTarget.value);
      if (doesFirstLetterStartsWithASymbol(e, "@", setCurrentWordIndex)) {
        setHasSuggestions(true);
      } else {
        setHasSuggestions(false);
      }
    } catch (error) {
      console.error("handleCommentInputChange error:", error);
    }
  };

  return (
    <React.Fragment>
      <div>
        <textarea
          id={
            type === "create"
              ? "createTextBoxField"
              : type === "reply"
              ? "replyTextBoxField"
              : "editTextBoxField"
          }
          role="textbox"
          contenteditable="true"
          aria-expanded="true"
          onInput={(e) => handleCommentInputChange(e, type)}
          className={classes.textInputField}
          data-placeholder={placeholder}
        ></textarea>
        {hasSuggestions && (
          <TagSuggestionSection
            comment={type === "edit" ? editCommentTextInput : comment}
            hasSuggestions={hasSuggestions}
            setHasSuggestions={setHasSuggestions}
            classes={classes}
            type={type}
            setUserMentioned={setUserMentioned}
            usersMentioned={usersMentioned}
            currentWordIndex={currentWordIndex}
          />
        )}
        <div
          className={`${classes.actionBtn} ${globalClasses.layoutAlignEnd} ${globalClasses.gapHalf}`}
        >
          <Button
            id="cancelButton"
            color="error"
            disabled={type === "edit" ? !editCommentTextInput : !comment}
            onClick={() =>
              type === "edit" ? setCommentEditable(false) : closeComment(type)
            }
          >
            Cancel
          </Button>
          <Button
            id="submitButton"
            color="primary"
            disabled={type === "edit" ? !editCommentTextInput : !comment}
            variant="contained"
            onClick={() =>
              type === "edit" ? editCommentFn(selectedComment) : saveComment()
            }
          >
            Submit
          </Button>
        </div>
      </div>
    </React.Fragment>
  );
};

export default TextInputFieldSection;
