import makeStyles from "@mui/styles/makeStyles";
import { pxToRem } from "core/Utils/functions/utils";
import globalStyles from "core/Styles/globalStyles";
import { Typography } from "@mui/material";
import { useTranslation } from "impact-ui-v3";
import TrendingDown from "assets/trendingDown.svg";
import TrendingUp from "assets/trendingUp.svg";
import { ticketTypeConfig } from "../constants";
const useStyles = makeStyles((theme) => ({
  cardBody: (props) => ({
    width: pxToRem(255),
    maxWidth: pxToRem(255),
    flexShrink: 0,
    height: pxToRem(62),
    borderRadius: pxToRem(12),
    padding: pxToRem(16),
    boxShadow: "0px 0px 4px 0px #0000001F",
    gap: pxToRem(12),
    borderBottom: `1px solid ${ticketTypeConfig?.[props?.configKey || props?.label]?.color}`,
    background: theme?.palette?.common?.white,
  }),
  ticketLabel: {
    fontWeight: 500,
    fontSize: pxToRem(12),
    lineHeight: pxToRem(21),
    color: theme?.palette?.colours?.darkBlack,
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  ticketValue: {
    fontWeight: 600,
    fontSize: pxToRem(20),
    lineHeight: pxToRem(21),
    color: theme?.palette?.colours?.darkBlack,
  },
  timeHelperText: {
    fontWeight: 400,
    fontSize: pxToRem(12),
    color: theme?.palette?.colours?.filterLabelColor,
    whiteSpace:"nowrap"
  },
  percent: {
    fontWeight: 600,
    fontSize: pxToRem(12),
    gap: pxToRem(3),
    "&.positive": {
      color: theme?.palette?.colours?.forestGreen,
    },
    "&.negative": {
      color: theme?.palette?.colours?.lightPeach,
    },
  },
  infoContainer: {
    gap: pxToRem(8),
    marginTop: pxToRem(6),
  },
  imageContainer: {
    height: "100%",
    "& img": {
      height: pxToRem(25),
      width: pxToRem(32),
    },
  },
  verticalSeparator: {
    border: `1px dashed ${theme?.palette?.colours?.linkWater1}`,
    height: pxToRem(60),
  },
}));
const TicketInfoCard = (props) => {
  const globalClasses = globalStyles();
  const classes = useStyles(props);
  const { t } = useTranslation();
  return (
    <div
      className={`${classes.cardBody} ${globalClasses.flexRow} ${globalClasses.verticalAlignCenter} `}
    >
      {props && (
        <div className={`${classes.imageContainer}`}>
          <img src={ticketTypeConfig?.[props?.configKey || props?.label]?.icon} />
        </div>
      )}
      <div className={`${classes.verticalSeparator}`}></div>
      <div>
        <Typography variant="text" className={classes.ticketLabel}>
          {props?.label}
        </Typography>
        <div
          className={`${classes.infoContainer} ${globalClasses.flexRow} ${globalClasses.verticalAlignCenter}`}
        >
          <Typography variant="text" className={classes.ticketValue}>
            {props?.value}
          </Typography>
          {props?.showTrend && (
            <>
              <Typography
                variant="text"
                className={`${globalClasses.flexRow} ${
                  globalClasses.verticalAlignCenter
                } ${classes.percent} ${
                  props.percent >= 0 ? "positive" : "negative"
                }`}
              >
                {isNaN(props.percent) ? "0" : Math.abs(props.percent)}%
                {props.percent >= 0 ? (
                  <TrendingUp viewBox="0 0 15 15" />
                ) : (
                  <TrendingDown viewBox="0 0 15 15" />
                )}
              </Typography>
              <Typography variant="text" className={classes.timeHelperText}>
                {t("ticketing.thenLastWeek")}
              </Typography>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TicketInfoCard;
