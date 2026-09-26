import moment from "moment";

/**
 * Custom response parser for InventorySmart product
 * @param {object} data - API response data
 * @param {string} type - Response type (text/questions/image)
 * @param {string} agentId - Agent ID
 * @param {string} currentMode - Current mode
 * @param {boolean} disableTimeAndName - Whether to disable timestamp and username
 * @param {string} sessionId - Session ID
 * @param {object} productConfig - Product configuration
 * @returns {object} Formatted chat message
 */
export const customParseResponse = (data, type, agentId="", currentMode="", disableTimeAndName=false, sessionId="", productConfig=null) => {
  const timeString = disableTimeAndName ? "" : moment().format("DD-MM-YYYY HH:mm:ss");
  const userName = disableTimeAndName ? "" : "Alan";
  
  // Get the custom renderer path and function name from product config
  const rendererPath = productConfig?.rendererPath;
  const rendererFunctionName = productConfig?.rendererFunctionName;

  switch (type) {
    case "text":
      return {
        ...data,
        agentId: agentId,
        timeStamp: timeString,
        userType: "bot",
        userName: userName,
        bodyText: data.response,
        headerTitle: data.response_heading,
        noShowHeaderTitle: true,
        bodyType: "text",
      };
    case "image":
      // Special case to handle image responses
      return {
        ...data,
        agentId: agentId,
        timeStamp: timeString,
        userType: "bot",
        userName: userName,
        headerTitle: data.header || "Image",
        bodyType: "dynamic", // Use dynamic type to allow custom renderer
        bodyText: data,
        // Instead of trying to dynamically import here, just pass the function info
        // The actual renderer will be resolved by the BotMessage component
        rendererInfo: {
          path: rendererPath,
          functionName: rendererFunctionName
        },
        // Make sure the type is preserved for the renderer to use
        type: "image"
      };
    case "questions":
      return {
        ...data,
        timeStamp: timeString,
        userType: "bot",
        userName: userName,
        headerTitle:
          "Here are few questions that users are typically interested in.",
        bodyType: "questions",
        bodyText: data[type]
          ? data[type].map((quesObj) => ({
              ...quesObj,
              displayText: quesObj.question,
              interactable: true,
              actionType: "indirect",
              actionName: "setUserScreenAndFlow",
            }))
          : data?.data?.map((quesObj) => ({
              ...quesObj,
              displayText: quesObj.question,
              interactable: true,
              actionType: "indirect",
              actionName: "setUserScreenAndFlow",
              flow_type: quesObj.flow_type ? quesObj.flow_type : currentMode,
              agentId: agentId,
            })),
      };
    case "chips":
      return {
        ...data,
        timeStamp: timeString,
        userType: "bot",
        userName: userName,
        headerTitle: data?.headerTitle,
        bodyType: "chips",
        bodyText: data.data.map((chip) => ({
          displayText: chip.chip_name,
          interactable: true,
          actionType: "direct",
          actionName: "setUserScreenAndFlow",
          screen_name: chip.screen_name,
          flow_type: chip.flow_type ? chip.flow_type : currentMode,
          application_code: chip.application_code,
          agentId: agentId,
          sessionId: sessionId,
        })),
      };
    case "table":
      return {
        ...data,
        agentId: agentId,
        timeStamp: timeString,
        userType: "bot",
        userName: userName,
        headerTitle: data?.data?.display_name,
        bodyType: "table",
        bodyText: data?.data,
      };
    case "graph":
      return {
        ...data,
        agentId: agentId,
        timeStamp: timeString,
        userType: "bot",
        userName: userName,
        headerTitle: data?.data?.title || "Graph",
        bodyType: "graph",
        bodyText: data?.data,
      };
    default:
      return null;
  }
}; 