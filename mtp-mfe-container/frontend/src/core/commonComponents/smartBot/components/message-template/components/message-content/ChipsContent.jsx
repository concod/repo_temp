import { Fragment } from "react";
import { Typography } from "@mui/material";
import { useStyles } from "../../../../styling";
import globalStyles from "core/Styles/globalStyles";

const ChipsContent = ({ bodyText, props, botData, isFormDisabled = false }) => {
  const classes = useStyles();
  const globalClasses = globalStyles();

  // Suggested-question chips are one-shot: once the user has clicked one of them
  // or asked a new question the block disappears. isFormDisabled is true for
  // every bot message except the latest, so it flips exactly when the user
  // moves past these chips. Only chips that opt in via isQuestionsDisabled
  // behave this way; all other chips stay visible.
  if (botData?.isQuestionsDisabled && isFormDisabled) {
    return null;
  }

  const showHeaderTitle =
    !botData?.noShowHeaderTitle && Boolean(botData?.headerTitle?.length);

  return (
    <Fragment>
      {showHeaderTitle && (
        <div
          className={`${classes.chatbotText} ${classes.boldText} ${classes.combinedBlockHeaderTitle}`}
        >
          {botData.headerTitle}
        </div>
      )}
      <div
        className={`${globalClasses.flexRow} ${globalClasses.flexWrap} ${globalClasses.gap} ${globalClasses.verticalAlignCenter}`}
      >
        {bodyText.map((data, index) => {
          const callBack = data.interactable && props
            ? Object.entries(props).filter(
              (entry) => entry[0] === data.actionName
            )?.[0]?.[1]
            : null;

          return (
            <Typography
              key={index}
              component="span"
              variant="body1"
              className={`${classes.gptChips} ${data.interactable ? globalClasses.cursorPointer : ""
                }`}
              onClick={() => {
                callBack && callBack(data);
              }}
            >
              {data.displayText}
            </Typography>
          );
        })}
      </div>
    </Fragment>
  );
};

export default ChipsContent;
