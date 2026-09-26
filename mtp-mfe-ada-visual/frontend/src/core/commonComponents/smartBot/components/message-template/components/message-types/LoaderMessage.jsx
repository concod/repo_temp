import { Typography } from "@mui/material";
import { useStyles } from "../../../../styling";
import globalStyles from "core/Styles/globalStyles";
import { formatTime } from "../../utils.js";

const LoaderMessage = ({ botData }) => {
  const classes = useStyles();
  const globalClasses = globalStyles();
  const time = formatTime(botData.timeStamp);

  return (
    <div
      className={`${classes.botViewBlock} ${globalClasses.flexRow} ${globalClasses.flexColumn}`}
    >
      <div
        className={`${globalClasses.flexRow} ${globalClasses.layoutAlignBetweenCenter}`}
      >
        <Typography variant="text" className={classes.botViewHeader}>
          {botData.userName}
        </Typography>
        <Typography variant="text" className={classes.botViewHeader}>
          {time}
        </Typography>
      </div>
      <div className={`${globalClasses.positionRelative}`}>
        <div className={classes.loader}></div>
      </div>
    </div>
  );
};

export default LoaderMessage;
