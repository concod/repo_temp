import { useStyles } from '../../styling.js';
import { useStyles as useChatStyles } from "core/commonComponents/smartBot/styling";
import { Typography } from "@mui/material";
import { TextRenderer } from "core/commonComponents/smartBot/components/TextRenderer";

const AgentResponse = (props) => {
  const { content, isStreaming } = props;
  const classes = useStyles();
  const chatClasses = useChatStyles();
  return (
    <div className={chatClasses.agentResponseContainer}>
      {content ? (
        <Typography className={chatClasses.bodyTextStyling}>
          <TextRenderer text={content} />
          {isStreaming && <span className={classes.cursor} />}
        </Typography>
      ) : (
        // Show cursor even when no content yet
        isStreaming && <span className={classes.cursor} />
      )}
    </div>
  )
}

export default AgentResponse;