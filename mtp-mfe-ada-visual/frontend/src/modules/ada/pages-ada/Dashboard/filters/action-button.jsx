import { Button } from "impact-ui-v3";
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
        variant="primary"
        onClick={onFilter}
        className={adaStyleClasses.applyRightMargin}
      >
        Filter
      </Button>
      <Button variant="tertiary" onClick={onReset}>
        Reset
      </Button>
    </div>
  );
};

export default ActionButton;
