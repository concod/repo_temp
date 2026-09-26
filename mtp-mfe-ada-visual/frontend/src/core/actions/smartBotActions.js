import { SET_IS_SMART_BOT_RESTRICTED, SET_SMART_BOT_ACTIVE, SET_CHATBOT_CONTEXT, SET_THINKING_CONTEXT, SET_HIERARCHY_KEY_VALUE_PAIR, SET_CURRENT_AGENT_CHAT_ID, SET_PERSISTED_FORM_VALUES, CLEAR_PERSISTED_FORM_VALUES, SET_SAVED_FILTER_SETS, SET_STEP_FORM_RESTREAM_PAYLOAD, SET_STEP_FORM_STREAM_DATA } from "./types";

export const setSmartBotActive = (value) => (dispatch) => {
  dispatch({
    type: SET_SMART_BOT_ACTIVE,
    payload: value,
  });
};

export const setIsSmartBotRestricted = (value) => (dispatch) => {
  dispatch({
    type: SET_IS_SMART_BOT_RESTRICTED,
    payload: value,
  });
};

export const setChatbotContext = (value) => (dispatch) => {
  dispatch({
    type: SET_CHATBOT_CONTEXT,
    payload: value,
  });
};

export const setThinkingContext = (value) => (dispatch) => {
  dispatch({
    type: SET_THINKING_CONTEXT,
    payload: value,
  });
};

export const setHierarchyKeyValue = (value) => (dispatch) => {
  dispatch({
    type: SET_HIERARCHY_KEY_VALUE_PAIR,
    payload: value,
  });
};

export const setCurrentAgentChatId = (value) => (dispatch) => {
  dispatch({
    type: SET_CURRENT_AGENT_CHAT_ID,
    payload: value,
  });
};

export const setPersistedFormValues = (value) => (dispatch) => {
  dispatch({
    type: SET_PERSISTED_FORM_VALUES,
    payload: value,
  });
};

export const clearPersistedFormValues = () => (dispatch) => {
  dispatch({
    type: CLEAR_PERSISTED_FORM_VALUES,
  });
};

export const setStepFormRestreamPayload = (value) => (dispatch) => {
  dispatch({
    type: SET_STEP_FORM_RESTREAM_PAYLOAD,
    payload: value,
  });
};

export const setSavedFilterSets = (value) => (dispatch) => {
  dispatch({
    type: SET_SAVED_FILTER_SETS,
    payload: value,
  });
};

export const setStepFormStreamData = (value) => (dispatch) => {
  dispatch({
    type: SET_STEP_FORM_STREAM_DATA,
    payload: value,
  });
};
