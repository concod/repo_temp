import { Button } from "@mui/material";
import clsx from "clsx";
import { useStyles } from "../../ada-styles";

const ActionButton = ({ onFilter, onReset }) => {
  const adaStyleClasses = useStyles();

  return (
    <div
      className={clsx(
        adaStyleClasses.rightAlign,
        adaStyleClasses.applyBottomMargin
      )}
    >
      <Button
        color="primary"
        variant="contained"
        onClick={onFilter}
        className={adaStyleClasses.applyRightMargin}
      >
        Filter
      </Button>
      <Button variant="outlined" color="primary" onClick={onReset}>
        Reset
      </Button>
    </div>
  );
};

export default ActionButton;
