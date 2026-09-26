import { Typography } from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import { pxToRem } from "core/Utils/functions/utils";
import colours from "core/Styles/colours";
import globalStyles from "core/Styles/globalStyles";

const useStyles = makeStyles((theme) => ({
  icon: {
    height: "1.25rem",
    width: "1.25rem",
    cursor: "pointer",
    color: "#758490",
  },
  heading: {
    fontSize: "1rem",
    fontWeight: 600,
    lineHeight: "1.5rem",
  },
  subHeading: {
    fontSize: "0.75rem",
    fontWeight: 400,
    lineHeight: pxToRem(18),
    color: colours.lightslategray,
  },
  description: {
    fontSize: "0.75rem",
    fontWeight: 600,
    lineHeight: pxToRem(18),
  },
  chatInfo: {
    padding: "1.25rem",
    borderRadius: "0.25rem",
    boxShadow: "0px 0px 8px 0px #0000001F",
  },
}));
const ChatSystemInfo = (props) => {
  const classes = useStyles();
  const globalClasses = globalStyles();

  return (
    <div className={classes.chatInfo}>
      <Typography component="h2" className={classes.heading} mb={2}>
        Chat with Vendor Rep
      </Typography>
      <div
        className={`${globalClasses.flexRow} ${globalClasses.gap} ${globalClasses.flexWrap}`}
      >
        <div
          className={`${globalClasses.flexRow} ${globalClasses.layoutAlignCenter}`}
        >
          <Typography className={classes.subHeading}>Vendor:</Typography>
          <Typography className={classes.description}>76J2951-BDS</Typography>
        </div>
        <div
          className={`${globalClasses.flexRow} ${globalClasses.layoutAlignCenter}`}
        >
          <Typography className={classes.subHeading}>Vendor:</Typography>
          <Typography className={classes.description}>76J2951-BDS</Typography>
        </div>
        <div
          className={`${globalClasses.flexRow} ${globalClasses.layoutAlignCenter}`}
        >
          <Typography className={classes.subHeading}>Vendor:</Typography>
          <Typography className={classes.description}>76J2951-BDS</Typography>
        </div>
        <div
          className={`${globalClasses.flexRow} ${globalClasses.layoutAlignCenter}`}
        >
          <Typography className={classes.subHeading}>Vendor:</Typography>
          <Typography className={classes.description}>76J2951-BDS</Typography>
        </div>
        <div
          className={`${globalClasses.flexRow} ${globalClasses.layoutAlignCenter}`}
        >
          <Typography className={classes.subHeading}>Vendor:</Typography>
          <Typography className={classes.description}>76J2951-BDS</Typography>
        </div>
        <div
          className={`${globalClasses.flexRow} ${globalClasses.layoutAlignCenter}`}
        >
          <Typography className={classes.subHeading}>Vendor:</Typography>
          <Typography className={classes.description}>76J2951-BDS</Typography>
        </div>
        <div
          className={`${globalClasses.flexRow} ${globalClasses.layoutAlignCenter}`}
        >
          <Typography className={classes.subHeading}>Vendor:</Typography>
          <Typography className={classes.description}>76J2951-BDS</Typography>
        </div>
        <div
          className={`${globalClasses.flexRow} ${globalClasses.layoutAlignCenter}`}
        >
          <Typography className={classes.subHeading}>Vendor:</Typography>
          <Typography className={classes.description}>76J2951-BDS</Typography>
        </div>
        <div
          className={`${globalClasses.flexRow} ${globalClasses.layoutAlignCenter}`}
        >
          <Typography className={classes.subHeading}>Vendor:</Typography>
          <Typography className={classes.description}>76J2951-BDS</Typography>
        </div>
        <div
          className={`${globalClasses.flexRow} ${globalClasses.layoutAlignCenter}`}
        >
          <Typography className={classes.subHeading}>Vendor:</Typography>
          <Typography className={classes.description}>76J2951-BDS</Typography>
        </div>
        <div
          className={`${globalClasses.flexRow} ${globalClasses.layoutAlignCenter}`}
        >
          <Typography className={classes.subHeading}>Vendor:</Typography>
          <Typography className={classes.description}>76J2951-BDS</Typography>
        </div>
        <div
          className={`${globalClasses.flexRow} ${globalClasses.layoutAlignCenter}`}
        >
          <Typography className={classes.subHeading}>Vendor:</Typography>
          <Typography className={classes.description}>76J2951-BDS</Typography>
        </div>
      </div>
    </div>
  );
};

export default ChatSystemInfo;
