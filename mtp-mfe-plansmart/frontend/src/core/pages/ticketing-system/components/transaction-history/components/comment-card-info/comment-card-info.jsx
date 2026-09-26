import { useStyles } from "./styles-comment-card-info";

/**
 * CommentCardInfo is a component which will
 * be used to show the key: value data
 * in the transaction history component
 * @param {object} props
 * @returns
 */
const CommentCardInfo = (props) => {
  const { keyInfo, value } = props;
  const classes = useStyles();

  return (
    <div className={classes.keyValue}>
      <p className={classes.keyValueKey}>{keyInfo}</p>
      <div className={classes.keyValueValue}>{value}</div>
    </div>
  );
};

export default CommentCardInfo;
