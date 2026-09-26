import { Reviews } from "@mui/icons-material";
import { useStyles } from "core/Utils/styles/assortSmartUsestyles";

const ReviewCell = (props) => {
  const classes = useStyles();

  return (
    <div
      onClick={() => {
        props.onReviewClick(props);
      }}
      title="Review"
    >
      <Reviews className={classes.reviewIcon} />
    </div>
  );
};

export default ReviewCell;
