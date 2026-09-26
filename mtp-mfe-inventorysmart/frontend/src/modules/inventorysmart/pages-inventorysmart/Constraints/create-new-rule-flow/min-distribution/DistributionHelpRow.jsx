import { Button } from "impact-ui-v3";
import InfoIcon from "assets/Info.svg";

export const DistributionHelpRow = ({
  helpText,
  classes,
  previewLabel,
  onPreviewClick,
  previewDisabled,
}) => (
  <div className={classes.helpRow}>
    <span className={classes.infoIconBox}>
      <InfoIcon />
    </span>
    <p className={classes.helpText}>{helpText}</p>
    <Button
      size="medium"
      type="default"
      variant="secondary"
      className={classes.previewButton}
      disabled={previewDisabled}
      onClick={onPreviewClick}
    >
      {previewLabel || "Show Preview"}
    </Button>
  </div>
);
