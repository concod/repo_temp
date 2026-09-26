import ThumbUpAltOutlinedIcon from "@mui/icons-material/ThumbUpAltOutlined";
import ThumbDownAltOutlinedIcon from "@mui/icons-material/ThumbDownAltOutlined";
import ThumbUpIcon from "@mui/icons-material/ThumbUp";
import ThumbDownIcon from "@mui/icons-material/ThumbDown";
import { useStyles } from "../../../../styling";
import globalStyles from "core/Styles/globalStyles";

const LikeDislikeActions = ({
  botData,
  state,
  likeDislikeKey,
  handleLikeDislike,
}) => {
  const classes = useStyles();
  const globalClasses = globalStyles();

  if (!botData?.enableLikes) return null;

  return (
    <div
      className={`${globalClasses.layoutAlignEnd} ${classes.messageActionWrapper}`}
    >
      {/* {botData?.extra?.hasOwnProperty("status") ? (
        botData?.extra?.status === "liked" ? (
          <ThumbUpIcon className="activeIcon" />
        ) : (
          <ThumbDownIcon className="activeIcon" />
        )
      ) : (
        <>
          {state?.like === likeDislikeKey ? (
            <ThumbUpIcon className="activeIcon" />
          ) : (
            <ThumbUpAltOutlinedIcon
              onClick={() => handleLikeDislike(likeDislikeKey, true, botData?.response)}
            />
          )}
          {state?.dislike === likeDislikeKey ? (
            <ThumbDownIcon className="activeIcon" />
          ) : (
            <ThumbDownAltOutlinedIcon
              onClick={() => handleLikeDislike(likeDislikeKey, false, botData?.response)}
            />
          )}
        </>
      )} */}
    </div>
  );
};

export default LikeDislikeActions;
