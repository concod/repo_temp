import { useStyles } from "core/commonComponents/smartBot/styling.jsx";

const AgentResponse = ({ children }) => {
  const classes = useStyles();
  return (
    <div className={classes.agentResponseContainer}>
      {children}
    </div>
  )
}

export default AgentResponse