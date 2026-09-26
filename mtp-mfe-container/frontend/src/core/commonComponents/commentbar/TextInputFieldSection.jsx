import React, { useEffect, useState } from "react";
import { Button, TextArea, useTranslation } from "impact-ui-v3";
import TagSuggestionSection from "./TagSuggestionSection";
import { sanitizeHtml } from "core/Utils/functions/utils";
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
  const { t } = useTranslation();
  const [hasSuggestions, setHasSuggestions] = useState(false);
  const globalClasses = globalStyles();

  useEffect(() => {
    if (type === "edit") {
      document.getElementById("editTextBoxField").innerHTML = sanitizeHtml(
        ` ${editCommentTextInput} &nbsp;`,
        {
          ALLOWED_TAGS: ["mark"],
        }
      );
    }
  }, [type]);

  const handleCommentInputChange = (e, type) => {
    type === "edit"
      ? setEditCommentTextInput(e.currentTarget.innerHTML)
      : setComment(e.currentTarget.innerText);
    if (e.nativeEvent.data.match(/@$/)) {
      setHasSuggestions(true);
    }
  };

  return (
    <React.Fragment>
      <div>
        <TextArea
          aria-expanded="true"
          // this is for CommentBar for other need to check
          width="325px"
          id={
            type === "create"
              ? "createTextBoxField"
              : type === "reply"
              ? "replyTextBoxField"
              : "editTextBoxField"
          }
          placeholder={placeholder}
          defaultValue=""
          onChange={(event) => handleCommentInputChange(event, type)}
          value={type === "edit" ? editCommentTextInput || "" : comment || ""}
        />
        {hasSuggestions && (
          <TagSuggestionSection
            comment={type === "edit" ? editCommentTextInput : comment}
            hasSuggestions={hasSuggestions}
            setHasSuggestions={setHasSuggestions}
            classes={classes}
            type={type}
            setUserMentioned={setUserMentioned}
            usersMentioned={usersMentioned}
          />
        )}
        <div
          className={`${classes.actionBtn} ${globalClasses.layoutAlignEnd} ${globalClasses.gapHalf}`}
        >
          <Button
            id="cancelButton"
            variant="url"
            disabled={type === "edit" ? !editCommentTextInput : !comment}
            onClick={() =>
              type === "edit" ? setCommentEditable(false) : closeComment(type)
            }
          >
            {t("buttons.cancel")}
          </Button>
          <Button
            id="submitButton"
            disabled={type === "edit" ? !editCommentTextInput : !comment}
            variant={type === "edit" ? "url" : "primary"}
            onClick={() =>
              type === "edit" ? editCommentFn(selectedComment) : saveComment()
            }
          >
            {t("buttons.submit")}
          </Button>
        </div>
      </div>
    </React.Fragment>
  );
};

export default TextInputFieldSection;
