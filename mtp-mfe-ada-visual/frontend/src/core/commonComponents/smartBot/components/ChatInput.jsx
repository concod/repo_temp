import { Input } from "impact-ui";
import { Button } from "impact-ui-v3";
import { isEmpty, cloneDeep } from "lodash";
import PropTypes from "prop-types";
import { getDynamicFunction } from "../utlis";

const ChatInput = ({
  classes,
  globalClasses,
  userInput,
  setUserInput,
  fetchUserResultsFromQuery,
  loader,
  currentMode,
  prepareDataAndSendToAgent,
  currentAgentId,
  currentSessionId,
  baseUrl,
  customChatConfig,
  chatBotInfoRef
}) => {
  const isInputValid = () => {
    try {
      if (isEmpty(userInput.trim())) {
        setUserInput("");
        return false;
      }
      return true;
    } catch (error) {
      console.error("isInputValid error", error);
      return false;
    }
  };

  const handleSendMessage = async () => {
    try {
      if (isInputValid() && currentMode !== "agent") {
        fetchUserResultsFromQuery();
      } else if (customChatConfig?.useMiddleware) {
        let middleWareFunction = await getDynamicFunction(
          customChatConfig.middleWareFunctionPath,
          customChatConfig.middleWareFunctionName
        );
        let data = {
          agentId: currentAgentId,
          userInput: userInput,
          sessionId: currentSessionId,
          baseUrl: baseUrl,
        };
        let middleWareResponse = await middleWareFunction(data, chatBotInfoRef);
        if (middleWareResponse) {
          prepareDataAndSendToAgent(middleWareResponse);
          setUserInput("");
        }
      } else {
        let data = {
          agentId: currentAgentId,
          userInput: cloneDeep(userInput),
          sessionId: currentSessionId,
          baseUrl: baseUrl,
        };
        prepareDataAndSendToAgent(data);
        setUserInput("");
      }
    } catch (error) {
      console.error("handleSendMessage error", error);
    }
  };

  return (
    <form
      className={`${globalClasses.flexRow} ${globalClasses.layoutAlignCenter} ${classes.headerGap} ${classes.mt2}`}
      onSubmit={(event) => {
        event.preventDefault();
        handleSendMessage();
      }}
    >
      <Input
        className={classes.userInput}
        value={userInput}
        onChange={(event) => {
          setUserInput(event.target.value);
        }}
        placeholder="Type Something.."
      />
      <Button
        type="button" // Ensure this is a button, not submit
        onClick={handleSendMessage}
        variant={"primary"}
        icon={<span class="material-symbols-outlined">send</span>}
      ></Button>
    </form>
  );
};

ChatInput.propTypes = {
  classes: PropTypes.object.isRequired,
  globalClasses: PropTypes.object.isRequired,
  userInput: PropTypes.string.isRequired,
  setUserInput: PropTypes.func.isRequired,
  fetchUserResultsFromQuery: PropTypes.func.isRequired,
  loader: PropTypes.bool.isRequired,
};

export default ChatInput;
