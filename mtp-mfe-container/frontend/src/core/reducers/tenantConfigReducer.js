import {
  SET_HIERARCHY_LEVEL,
  SET_HELP_DESK,
  SET_SPECIFIC_SCREEN_NAME,
  SET_KEYBOARD_SHORTCUT,
  UPDATE_TAM_CACHE,
  SET_COMMENTING_CONFIG,
  SET_PRODUCT_STORE_ATTRIBUTES_LIST,
  SET_SHOW_ALL_SET_BOX,
  SET_LANGUAGE_CONFIG
} from "../actions/types";

const initialState = {
  hierarchyLevels: {},
  helpDesk: "",
  coreScreenNames: [],
  tenantConfigApplicationLevel: [],
  keyboardShortcuts: {},
  tamAPICache: {},
  commentingConfig: {},
  productStoreList: null,
  productStoreGenericMappings: null,
  showAllSetBox: false,
  languageConfig: null,
};

export default function (state = initialState, action) {
  switch (action.type) {
    case SET_HIERARCHY_LEVEL:
      return {
        ...state,
        hierarchyLevels: { ...state.hierarchyLevels, ...action.payload },
      };
    case SET_HELP_DESK:
      return {
        ...state,
        helpDesk: action.payload,
      };
    case SET_SPECIFIC_SCREEN_NAME:
      return {
        ...state,
        coreScreenNames: action.payload,
      };
    case SET_KEYBOARD_SHORTCUT:
      return {
        ...state,
        keyboardShortcuts: action.payload,
      };
    case UPDATE_TAM_CACHE:
      if (action.payload === "reset") {
        return {
          ...state,
          tamAPICache: {},
        };
      }
      return {
        ...state,
        tamAPICache: {
          ...state.tamAPICache,
          ...action.payload,
        },
      };
     case SET_COMMENTING_CONFIG:
      return {
        ...state,
        commentingConfig: action.payload,
      };
    case SET_PRODUCT_STORE_ATTRIBUTES_LIST:
      return {
        ...state,
        productStoreList: action.payload,
      };
    case SET_SHOW_ALL_SET_BOX:
      return {
        ...state,
        showAllSetBox: action.payload,
      };
    case SET_LANGUAGE_CONFIG:
      return {
        ...state,
        languageConfig: action.payload,
      };
    default:
      return state;
  }
}
