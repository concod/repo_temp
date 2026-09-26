import { Typography } from "@mui/material";
import { useStyles } from "../../../../styling";
import globalStyles from "core/Styles/globalStyles";

const ChipsContent = ({ bodyText, props }) => {
  const classes = useStyles();
  const globalClasses = globalStyles();

  return (
    <div
      className={`${globalClasses.flexRow} ${globalClasses.flexWrap} ${globalClasses.gap} ${globalClasses.verticalAlignCenter}`}
    >
      {bodyText.map((data, index) => {
        const callBack = data.interactable
          ? Object.entries(props).filter(
              (entry) => entry[0] === data.actionName
            )?.[0]?.[1]
          : null;

        return (
          <Typography
            key={index}
            component="span"
            variant="body1"
            className={`${classes.gptChips} ${
              data.interactable ? globalClasses.cursorPointer : ""
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
  );
};

export default ChipsContent;
