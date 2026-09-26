import { Button, useTranslation } from "impact-ui-v3";
import { makeStyles } from "@mui/styles";
import globalStyles from "core/Styles/globalStyles";
import ROBOT_ICON_STORE_FLOW from "assets/impactv3/Robot_Icon.svg";
import colours from "core/Styles/colours";

const useStyles = makeStyles(() => ({
  optimizeWrapper: {
    padding: "24px",
    gap: "36px",
    borderRadius: "12px",
    background: colours.white,
    maxWidth: "fit-content",
    margin: "0 auto",
  },
  optimizationContent: {
    gap: "36px",
  },
  optimizerTitle: {
    color: colours.black,
    textAlign: "center",
    fontFamily: "Manrope",
    fontSize: "28px",
    fontStyle: "normal",
    fontWeight: 700,
    lineHeight: "32px", 
    letterSpacing: "-0.28px",
  },
  optimizerDescription: {
    color: colours.black,
    textAlign: "center",
    fontFamily: "Manrope",
    fontSize: "16px",
    fontStyle: "normal",
    fontWeight: 500,
    lineHeight: "18px", 
  },
  optimizerOR: {
    color: colours.lighGrey,
    textAlign: "center",
    fontFamily: "Manrope",
    fontSize: "14px",
    fontStyle: "normal",
    fontWeight: 500,
    lineHeight: "20px", 
  },
  optimizerFooter: {
    justifyContent: "center",
  },
}));

export default function StoreTransferOptimizationScreen({
  heading = "inventorysmart.s2sOptimizerHeading",
  description = "inventorysmart.s2sOptimizerDescription",
  onSecondaryButtonClick,
  primaryButtonLabel = "inventorysmart.s2sOptimizerPrimaryButtonLabel",
  secondaryButtonLabel = "inventorysmart.s2sOptimizerSecondaryButtonLabel",
  onPrimaryButtonClick,
}) {
  const classes = useStyles();
  const globalClasses = globalStyles();
  const { t } = useTranslation();
  const ImageComponent = ROBOT_ICON_STORE_FLOW;

  return (
    <div className={`${classes.optimizeWrapper} ${globalClasses.centerAlign} ${globalClasses.flexColumn}`}>
      <ImageComponent />
      <div className={`${classes.optimizationContent} ${globalClasses.centerAlign} ${globalClasses.flexColumn}`}>
        <h2 className={classes.optimizerTitle}>
          {t(heading)}
        </h2>
        <div className={`${globalClasses.gap_12} ${globalClasses.flexRow} ${globalClasses.flexColumn}`}>
          <div className={classes.optimizerDescription}>
            {t(description)}
          </div>
          <div className={classes.optimizerOR}>{t("inventorysmart.s2sOptimizerOR")}</div>
          <div className={`${classes.optimizerFooter} ${globalClasses.flexRow} ${globalClasses.gap_16}`}>
            {secondaryButtonLabel && (
              <Button variant="secondary" onClick={onSecondaryButtonClick}>
                {t(secondaryButtonLabel)}
              </Button>
            )}
            {primaryButtonLabel && (
              <Button variant="primary" onClick={onPrimaryButtonClick}>
                {t(primaryButtonLabel)}
              </Button>
            )}
          </div>
          </div>
      </div>
    </div>
  );
}
