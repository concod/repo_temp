import { ArrowForwardIosRounded } from "@mui/icons-material";
import { useStyles } from "core/Utils/styles/assortSmartUsestyles";
import { Button, Tooltip } from "impact-ui-v3";

const ReviewButtonCell = (props) => {
  const classes = useStyles();
  const isDisabled = props.data?.disableAction
    ? props.data?.[props.data?.disableAction] === 0
    : typeof props.disabled === "function"
    ? props.disabled(props.data, props.column_name)
    : props.disabled;
  const renderContent = () => {
    return (
      <Button
        variant="url"
        onClick={() => {
          props.onReviewClick(props);
        }}
        className={props?.isOverflowing && "review_btn_overflow"}
        style={{
          maxWidth: props?.isOverflowing
            ? `${props?.eGridCell?.clientWidth - 36}px`
            : "unset",
        }}
        id="omniReviewBtn"
        disabled={isDisabled}
        iconPlacement={"right"}
        icon={
          <ArrowForwardIosRounded
            className={isDisabled ? classes.iconDisabled : classes.iconBlue}
          />
        }
      >
        <span>{props.value || props?.extra?.label}</span>
      </Button>
    );
  };
  return (
    <>
      {props?.isOverflowing ? (
        <Tooltip
          orientation="right"
          title={props.value || props?.extra?.label}
          variant="tertiary"
        >
          {renderContent()}
        </Tooltip>
      ) : (
        <>{renderContent()}</>
      )}
    </>
  );
};

export default ReviewButtonCell;
