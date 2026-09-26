import { SET_THINKING_CONTEXT, SET_HIERARCHY_KEY_VALUE_PAIR, SET_CURRENT_AGENT_CHAT_ID, SET_PERSISTED_FORM_VALUES, CLEAR_PERSISTED_FORM_VALUES, SET_SAVED_FILTER_SETS, SET_STEP_FORM_RESTREAM_PAYLOAD, SET_STEP_FORM_STREAM_DATA, SET_MINIMIZED_STREAM_DATA, SET_CHATBOT_FILTER_OPTIONS } from "core/actions/types";
import {
  SET_IS_SMART_BOT_RESTRICTED,
  SET_SMART_BOT_ACTIVE,
  SET_CHATBOT_CONTEXT
} from "../actions/types";

export const initialState = {
  smartBotActive: false,
  isSmartBotRestricted: true,
  chatbotContext: {},
  thinkingContext: {
    thinkingContent: "",
    thinkingHeaderMessage: "Working for 0m:00s",
    streamStartTime: null,
    isStreamCompleted: false,
    finalElapsedSeconds: null,
  },
  heirarchyKeyValuePairs: {},
  currentAgentChatId: "",
  persistedFormValues: {},
  savedFilterSets: [],
  stepFormRestreamPayload: null,
  stepFormStreamData: null,
  minimizedStreamData: null,
  chatbotFilterOptions: [],
};

export default function (state = initialState, action) {
  switch (action.type) {
    case SET_SMART_BOT_ACTIVE:
      return {
        ...state,
        smartBotActive: action.payload,
      };
    case SET_IS_SMART_BOT_RESTRICTED:
      return {
        ...state,
        isSmartBotRestricted: action.payload,
      };
    case SET_CHATBOT_CONTEXT:
      return {
        ...state,
        chatbotContext: action.payload,
      };
    case SET_THINKING_CONTEXT:
      return {
        ...state,
        thinkingContext: action.payload,
      };
    case SET_HIERARCHY_KEY_VALUE_PAIR:
      return {
        ...state,
        heirarchyKeyValuePairs: action.payload,
      };
    case SET_CURRENT_AGENT_CHAT_ID:
      return {
        ...state,
        currentAgentChatId: action.payload,
      };
    case SET_PERSISTED_FORM_VALUES:
      return {
        ...state,
        persistedFormValues: {
          ...state.persistedFormValues,
          ...action.payload,
        },
      };
    case CLEAR_PERSISTED_FORM_VALUES:
      return {
        ...state,
        persistedFormValues: {},
      };
    case SET_SAVED_FILTER_SETS:
      return {
        ...state,
        savedFilterSets: action.payload,
      };
    case SET_STEP_FORM_RESTREAM_PAYLOAD:
      return {
        ...state,
        stepFormRestreamPayload: action.payload,
      };
    case SET_STEP_FORM_STREAM_DATA:
      return {
        ...state,
        stepFormStreamData: action.payload,
      };
    case SET_MINIMIZED_STREAM_DATA:
      return {
        ...state,
        minimizedStreamData: action.payload,
      };
    case SET_CHATBOT_FILTER_OPTIONS:
      return {
        ...state,
        chatbotFilterOptions: action.payload,
      };
    default:
      return state;
  }
}
