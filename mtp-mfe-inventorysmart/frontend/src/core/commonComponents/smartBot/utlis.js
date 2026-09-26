import { cloneDeep } from "lodash";
import { likeDislikeComment, likeDislikeCommentForAgent } from "./services/chatbot-services";
import moment from "moment";

/**
 * Method to parse API response into chat format
 * @param {object} data - API response data
 * @param {string} type - Response type (text/questions)
 * @returns {object} Formatted chat message
 */
export const parseResponse = (
  data,
  type,
  agentId = "",
  currentMode = "",
  disableTimeAndName = false,
  sessionId = "",
  utilityData = {},
  inputBody = null,
  utilityObject = {}
) => {
  const timeString = disableTimeAndName ? "" : moment().format("DD-MM-YYYY HH:mm:ss");
  const userName = disableTimeAndName ? "" : "Iris";

  switch (type || data?.type) {
    case "text":
      return {
        ...data,
        timeStamp: timeString,
        userType: "bot",
        userName: userName,
        bodyText: data?.response,
        headerTitle: data?.response_heading,
        thinkingResponse: data?.thinkingResponse,
        noShowHeaderTitle: false,
        bodyType: "text",
      };
    case "stream":
      return {
        timeStamp: timeString,
        userType: "bot",
        userName: userName,
        bodyText: "",
        headerTitle: "",
        noShowHeaderTitle: true,
        bodyType: "stream",
        isStreaming: true,
        inputBody,
        utilityObject,
        thinkingResponse: utilityObject?.thinkingResponse
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
        isMultiSelect: data?.isMultiSelect,
        utilityData: utilityData,
        bodyText: data.data.map((chip, index) => ({
          id: index,
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
    case "slider":
      return {
        ...data,
        timeStamp: timeString,
        userType: "bot",
        userName: userName,
        headerTitle: data?.data?.header || "",
        bodyType: "slider",
        bodyText: {
          header: data?.data?.header,
          headerOrentiation: data?.data?.headerOrentiation,
          inputPosition: data?.data?.inputPosition,
          label: data?.data?.label,
          max: data?.data?.max,
          min: data?.data?.min,
          required: data?.data?.required,
          disabled: data?.data?.disabled,
          paramName: data?.data?.param_name
        }
      };
    case "select":
      return {
        ...data,
        timeStamp: timeString,
        userType: "bot",
        userName: userName,
        headerTitle: data?.data?.header || "",
        bodyType: "select",
        bodyText: {
          header: data?.data?.header,
          inputPosition: data?.data?.inputPosition,
          labelOrientation: data?.data?.labelOrientation,
          label: data?.data?.label,
          options: data?.data?.options,
          isRequired: data?.data?.isRequired,
          isDisabled: data?.data?.isDisabled,
          isMulti: data?.data?.isMulti,
          paramName: data?.data?.param_name
        }
      };
    case "datePicker":
      return {
        ...data,
        timeStamp: timeString,
        userType: "bot",
        userName: userName,
        headerTitle: data?.data?.label || "",
        bodyType: "datePicker",
        bodyText: {
          displayFormat: data?.data?.displayFormat,
          label: data?.data?.label,
          isRequired: data?.data?.isRequired,
          labelOrientation: data?.data?.labelOrientation,
          placeholder: data?.data?.placeholder,
          minDate: data?.data?.minDate,
          maxDate: data?.data?.maxDate,
          isDisabled: data?.data?.isDisabled,
          paramName: data?.data?.param_name,
          minStartDate: data?.data?.minStartDate
        }
      };
    case "dateRangePicker":
      return {
        ...data,
        timeStamp: timeString,
        userType: "bot",
        userName: userName,
        headerTitle: data?.data?.label || "",
        bodyType: "dateRangePicker",
        bodyText: {
          displayFormat: data?.data?.displayFormat,
          label: data?.data?.label,
          isRequired: data?.data?.isRequired,
          labelOrientation: data?.data?.labelOrientation,
          minDate: data?.data?.minDate,
          maxDate: data?.data?.maxDate,
          isDisabled: data?.data?.isDisabled,
          showMonthYearSelect: data?.data?.showMonthYearSelect,
          paramName: data?.data?.param_name,
          minStartDate: data?.data?.minStartDate
        }
      };
    case "checkbox":
      return {
        ...data,
        timeStamp: timeString,
        userType: "bot",
        userName: userName,
        headerTitle: data?.data?.label || "",
        bodyType: "checkbox",
        bodyText: {
          label: data?.data?.label,
          checked: data?.data?.checked,
          required: data?.data?.required,
          disabled: data?.data?.disabled,
          paramName: data?.data?.param_name
        }
      };
    case "radio":
      return {
        ...data,
        timeStamp: timeString,
        userType: "bot",
        userName: userName,
        headerTitle: data?.data?.label || "",
        bodyType: "radio",
        bodyText: {
          label: data?.data?.label,
          isDisabled: data?.data?.isDisabled,
          orientation: data?.data?.orientation,
          options: data?.data?.options,
          paramName: data?.data?.param_name
        }
      };
    case "button":
      return {
        ...data,
        timeStamp: timeString,
        userType: "bot",
        userName: userName,
        headerTitle: data?.data?.header || "",
        bodyType: "button",
        bodyText: {
          message: data?.data?.message,
          buttons: data?.data?.buttons?.map(button => ({
            label: button?.label,
            variant: button?.variant || "primary",
            size: button?.size || "medium",
            disabled: button?.disabled || false,
            icon: button?.icon,
            iconPlacement: button?.iconPlacement || "left",
            onClick: button?.onClick,
            link: button?.link,
            target: button?.target,
            className: button?.className
          }))
        }
      };
    case "input":
      return {
        ...data,
        timeStamp: timeString,
        userType: "bot",
        userName: userName,
        headerTitle: data?.data?.label || "",
        bodyType: "input",
        bodyText: {
          label: data?.data?.label,
          placeholder: data?.data?.placeholder,
          isRequired: data?.data?.isRequired,
          isDisabled: data?.data?.isDisabled,
          inputType: data?.data?.inputType || "text",
          labelOrientation: data?.data?.labelOrientation,
          defaultValue: data?.data?.defaultValue,
          maxLength: data?.data?.maxLength,
          minLength: data?.data?.minLength,
          paramName: data?.data?.param_name
        }
      };
    case "image":
      return {
        ...data,
        timeStamp: timeString,
        userType: "bot",
        userName: userName,
        headerTitle: data?.response_heading || "",
        bodyType: "image",
        bodyText: data?.image || data,
      };
    case "html":
      return {
        ...data,
        timeStamp: timeString,
        userType: "bot",
        userName: userName,
        headerTitle: "",
        noShowHeaderTitle: true,
        bodyType: "html",
        bodyText: {
          content: data?.data?.content || "",
        },
      };
    case "combined":
      return {
        ...data,
        timeStamp: timeString,
        userType: "bot",
        userName: userName,
        headerTitle: data?.headerTitle || "",
        bodyType: "combined",
        bodyText: data?.data || data, // Array of different content types
        agentId: agentId,
        sessionId: sessionId,
        currentMode: currentMode,
        utilityData: utilityData,
        thinkingResponse: utilityObject?.thinkingResponse,
        enableLikes: true
      };
    default:
      return null;
  }
};

/**
 * Method to like/dislike messages
 * @param {string} question
 * @param {boolean} liked - true if response was liked / false if disliked
 * @param {function} setLoadingState
 * @param {function} displaySnackMessages
 * @param {object} templateData
 * @returns
 */
export const handleMessageLike = async (
  question,
  liked,
  setLoadingState,
  displaySnackMessages,
  templateData,
  activeConversationId,
  answer,
  chatDataInfoRef,
  chatIndex,
  setChatDataState,
  baseUrl,
  sessionId
) => {
  let answerData;
  let questionData;
  answer?.forEach((item) => {
    if(item?.type === "text") {
      answerData = item?.response;
      questionData = item?.response_heading || "";
    }
  })
  const payload = {
    question: questionData,
    liked,
    response: answerData,
  };

  const currentMode = localStorage?.getItem("currentModeData");
  const chats = cloneDeep(templateData);
  // const activeMessageIndex = _.findIndex(
  //   chats?.[currentMode]?.conversations?.[activeConversationId]?.messages,
  //   (item) =>
  //     question ===
  //     `${item?.response_heading || item?.screen_name}_${item?.timeStamp}`
  // );
  const activeMessage = chatDataInfoRef?.[currentMode]?.conversations?.[activeConversationId]?.messages?.[chatIndex];
  // const activeMessage = chats?.[currentMode].conversations[activeConversationId].messages[activeMessageIndex];
  try {
    let request;
    if (currentMode === "agent") {
      const agentPayload = {
        session_id: sessionId,
        liked,
      };
      request = await likeDislikeCommentForAgent(agentPayload, baseUrl);
    } else {
      request = await likeDislikeComment(payload);
    }
    if (request?.status) {
      let updatedMessage = {
        ...activeMessage,
        extra: {
          status: liked ? "liked" : "disliked",
        },
      };
      // const newChats = _.updateWith(
      //   chats?.[currentMode].conversations[activeConversationId].messages,
      //   activeMessageIndex,
      //   () => updatedMessage
      // );
      chatDataInfoRef[currentMode].conversations[activeConversationId].messages[chatIndex] = updatedMessage;
      // templateData[currentMode].conversations[activeConversationId].messages = newChats;
      setChatDataState({ ...chatDataInfoRef });
      localStorage.setItem("chatData", JSON.stringify(templateData));
      displaySnackMessages("Thank you, your feedback is noted", "success");
      return true;
    }
  } catch (error) {
    console.error("likeDislikeComment error", error);
    displaySnackMessages("Something went wrong", "error");
    return false;
  } finally {
    setLoadingState({
      like: null,
      dislike: null,
    });
  }
};

export const ensureConversationExists = (mode, conversationId, chatDataRef) => {
  try {
    if (mode !== "agent" && !chatDataRef.current[mode].conversations[conversationId]) {
      chatDataRef.current[mode].conversations[conversationId] = {
        id: conversationId,
        name: `Conversation ${conversationId}`,
        timestamp: new Date().toISOString(),
        messages: [],
      };
    }
  } catch (error) {
    console.error("ensureConversationExists error", error);
  }
};

export const removeAfterLastDash = (str) => {
  try {
    const lastDashIndex = str.lastIndexOf("-");
    return lastDashIndex !== -1 ? str.substring(0, lastDashIndex) : str;
  } catch (error) {
    console.error("removeAfterLastDash error", error);
  }
};

export const transformValues = (data) => {
  try {
    let transFormedData = [];
    data.forEach((value) => {
      let capitalizedValue = value.toUpperCase();
      transFormedData.push({
        id: capitalizedValue,
        label: capitalizedValue,
        value: capitalizedValue,
      });
    });
    return transFormedData;
  } catch (error) {
    console.error("transformValues error", error);
  }
};

export const getCurrentDateTimeString = (dateFormat) => {
  try {
    return moment().format(dateFormat);
  } catch (error) {
    console.error("getCurrentDateTimeString error", error);
  }
};

export const getFormattedTableConfig = (tableConfig) => {
  try {
    return tableConfig.map((config) => {
      if (config?.column_header || config?.field) {
        return {
          ...config,
          headerName: config?.column_header ? config.column_header : "",
          column_name: config.field,
          label: config?.column_header ? config.column_header : "",
        };
      } else {
        return config;
      }
    });
  } catch (error) {
    console.error("getFormattedTableConfig error", error);
    return tableConfig;
  }
};


/**
 * Dynamically imports a function from a specified path
 * @param {string} path - Path to the module containing the function
 * @param {string} functionName - Name of the function to import
 * @returns {Promise<Function>} - The imported function
 */
export const getDynamicFunction = async (path, functionName) => {
  try {
    const module = await import(`../../../dynamic/${path}`);
    return module[functionName];
  } catch (error) {
    console.error(`Error loading dynamic function ${functionName} from ${path}:`, error);
    return null;
  }
};

export const generateConversationId = () => {
  try {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  } catch (error) {
    console.error("generateConversationId error", error);
    return 0;
  }
};

/**
 * Generates a conversation object structure with empty messages array and current timestamp
 * @returns {object} - The conversation object structure
 */
export const generateConversationObject = (conversationId) => {
  try {
    return {
      id: conversationId,
      name: `Conversation ${conversationId}`,
      timestamp: new Date().toISOString(),
      messages: [],
    };
  } catch (error) {
    console.error("generateConversationObject error", error);
    return {
      id: conversationId,
      name: `Conversation ${conversationId}`,
      timestamp: new Date().toISOString(),
      messages: [],
    };
  }
};

/**
 * Extracts userExplicitInput and textWithColumnNames from a saved filter set.
 * @param {object} selectedFilterSet - The selected saved filter set object
 * @param {string} userText - The user's input text (used to build textWithColumnNames)
 * @param {object} existingExplicitInput - Optional existing userExplicitInput to merge with (e.g. from @ mentions)
 * @returns {{ userExplicitInput: object, textWithColumnNames: string }}
 */
export const extractSavedFilterData = (selectedFilterSet, userText = "", existingExplicitInput = {}) => {
  let userExplicitInput = { ...existingExplicitInput };
  let textWithColumnNames = "";

  if (!selectedFilterSet?.saved_filter_preference) {
    return { userExplicitInput: existingExplicitInput, textWithColumnNames };
  }

  selectedFilterSet.saved_filter_preference.forEach((filter) => {
    const attrName = filter.attribute_name;
    if (!attrName) return;

    let filterValues = [];
    if (Array.isArray(filter.values)) {
      filter.values.forEach((v) => {
        if (v && Array.isArray(v.values)) {
          filterValues.push(...v.values.map(String));
        } else if (typeof v === "string" || typeof v === "number") {
          filterValues.push(String(v));
        }
      });
    }

    if (filterValues.length > 0) {
      if (userExplicitInput[attrName]) {
        userExplicitInput[attrName] = [
          ...new Set([...userExplicitInput[attrName], ...filterValues]),
        ];
      } else {
        userExplicitInput[attrName] = [...new Set(filterValues)];
      }

      const filterText = `${attrName}: ${filterValues.join(", ")}`;
      textWithColumnNames = textWithColumnNames
        ? `${filterText} ${textWithColumnNames}`
        : `${filterText} ${userText}`;
    }
  });

  // Ensure textWithColumnNames ends with the user's text
  if (textWithColumnNames && !textWithColumnNames.includes(userText) && userText.trim()) {
    textWithColumnNames = `${textWithColumnNames} ${userText}`.trim();
  }

  return { userExplicitInput, textWithColumnNames };
};
