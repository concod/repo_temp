import { Typography } from "@mui/material";
import { useStyles } from "./styles-comment-card";

/**
 * CommentCard is a component which is used
 * to show the comments in the Trasaction History
 * component
 * @param {*} props
 * @returns
 */
const CommentCard = (props) => {
  const {
    nameInitials,
    name,
    time,
    subject="hereeeee",
    description,
    icon,
    images,
  } = props;
  const classes = useStyles();
  return (
    <div className={classes.commentCard}>
      <div className={classes.commentCardNameInitials}>{nameInitials}</div>
      <div>
        <div className={classes.commentCardNameTime}>
          <Typography
            className={classes.name}
            variant="text"
          >
            {name}
          </Typography>
          <Typography
            className={classes.time}
            variant="text"
          >
            {time}
          </Typography>
        </div>
        {subject !== "" && (
          <div className={classes.subject}>{"hererrre"}</div>
        )}
        <div className={classes.description}>{description}</div>
        {images !== "" && (
          <div className={classes.commentCardAttachments}>
            <div className={classes.commentCardAttachmentsIcon}>{icon}</div>
            <div className={classes.commentCardAttachmentsGroupImages}>
              {images?.map((image) => (
                <a href={image?.props?.file} target="_blank">
                  <div className={classes.commentCardAttachmentsGroupImage}>
                    {image}
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CommentCard;
