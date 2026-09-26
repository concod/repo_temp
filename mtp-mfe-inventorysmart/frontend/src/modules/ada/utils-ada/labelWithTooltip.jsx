import { Tooltip } from "impact-ui-v3";
import { Button } from "impact-ui-v3";
import clsx from "clsx";
import { makeStyles } from "@mui/styles";
import TooltipIcon from "assets/impactv3/tooltip.svg";

const LabelWithTooltip = ({ label = "", title }) => {
  const classes = useStyles();
  return (
    <div className={classes.labelTooltipContainer}>
      <span>{label}</span>
      <Tooltip orientation="right" title={title} variant="tertiary">
        <Button
          className={clsx(classes.customTooltip)}
          icon={<TooltipIcon />}
          iconPlacement="left"
          size="small"
          type="default"
          variant="tertiary"
        />
      </Tooltip>
    </div>
  );
};

export default LabelWithTooltip;

const useStyles = makeStyles((theme) => ({
  labelTooltipContainer: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  customTooltip: {
    border: "none !important",
  },
}));
