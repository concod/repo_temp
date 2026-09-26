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
    subject,
    description,
    icon,
    images,
  } = props;
  const classes = useStyles();
  return (
    <div className={classes.commentCard}>
      <div className={classes.commentCardNameInitials}>{nameInitials}</div>
      <div className={classes.commentCardCommentInfo}>
        <div className={classes.commentCardNameTime}>
          <p className={classes.commentCardNameTimeName}>{name}</p>
          <p className={classes.commentCardNameTimeTime}>{time}</p>
        </div>
        {subject !== "" && (
          <div className={classes.commentCardSubject}>{subject}</div>
        )}
        <div className={classes.commentCardDescription}>{description}</div>
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
