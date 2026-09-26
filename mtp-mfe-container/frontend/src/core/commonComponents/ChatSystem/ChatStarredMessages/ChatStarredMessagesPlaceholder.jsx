import { Typography } from '@mui/material'
import { useTranslation } from 'impact-ui-v3'
import ResolvedIconPlaceholder from 'core/coreAssets/resolved_placeholder.svg'
import StarredIconPlaceholder from 'core/coreAssets/starred_placeholder.svg'
import ChannelIconPlaceholder from 'core/coreAssets/channel_placeholder.png'
import makeStyles from "@mui/styles/makeStyles";
import { pxToRem } from 'core/Utils/functions/utils';

const useStyles = makeStyles((theme) => ({
  placeholderWrapper: {
    maxWidth: pxToRem(358),
    display: "flex",
    flexDirection: 'column',
    margin: "auto",
    alignItems: "center"
  },
  title: {
    fontWeight: 800,
    fontSize: pxToRem(20),
    lineHeight: pxToRem(30),
    color: theme?.palette?.colours?.darkBlack,
    marginTop: pxToRem(16)
  },
  description: {
    fontWeight: 500,
    fontSize: pxToRem(14),
    lineHeight: pxToRem(21),
    color: theme?.palette?.textColours?.greyHelperText,
    marginTop: pxToRem(4),
    maxWidth: pxToRem(358),
    whiteSpace:"normal",
    textAlign:"center"
  }
}))
const ChatStarredMessagesPlaceholder = ({ isResolved = false, isStarred = false, isEmptyChannel = false }) => {
  const classes = useStyles();
  const { t } = useTranslation();
  const title = isEmptyChannel ? t("chat.noChannelSelected") : isResolved ? t("chat.noResolvedEvents") : t("chat.noStarredEvents")
  const description = isEmptyChannel ? t("chat.noChannelDescription") : isResolved ? t("chat.noResolvedDescription") : t("chat.noStarredDescription")
  const icon = isEmptyChannel ? <img src={ChannelIconPlaceholder} width={126} height={126} /> : isResolved ? <ResolvedIconPlaceholder /> : <StarredIconPlaceholder />
  return (
    <div className={classes.placeholderWrapper}>
      {icon}
      <Typography className={classes.title}>{title}</Typography>
      <Typography className={classes.description}>{description}</Typography>
    </div>
  );
}

export default ChatStarredMessagesPlaceholder;