import {
  SAVE_TABLE_STATE,
  SAVE_LAST_SEARCH_TAB,
  SAVE_TABLE_SEARCH_CONFIG,
  SAVE_TABLE_RECENT_CONFIG,
  RESET_TABLE_RECENT_CONFIG,
  SET_FONT_SIZE,
  SET_NUMERIC_FORMAT,
  SET_COLUMN_SEARCHED,
  KEYBOARD_SHORTCUT_TABLE_ACTION,
} from "../actions/types";

const initialState = {
  tableState: {},
  tableSearchConfig: null,
  recentTableConfig: {},
  searchedColumn: null,
  keyboardShortcut: {},
};

export default function (state = initialState, action) {
  switch (action.type) {
    case SAVE_TABLE_STATE:
      return {
        ...state,
        tableState: { ...state.tableState, ...action.payload },
      };
    case SAVE_TABLE_SEARCH_CONFIG:
      return {
        ...state,
        tableSearchConfig: action.payload,
      };
    case SAVE_TABLE_RECENT_CONFIG:
      return {
        ...state,
        recentTableConfig: {
          ...state.recentTableConfig,
          [action.key]: action.payload,
        },
      };
    case RESET_TABLE_RECENT_CONFIG:
      return {
        ...state,
        recentTableConfig: {}
      }
    case SAVE_LAST_SEARCH_TAB: {
      return {
        ...state,
        lastSearchTab: action.payload,
      };
    }
    case SET_FONT_SIZE: {
      return {
        ...state,
        fontSize: action.payload,
      };
    }
    case SET_NUMERIC_FORMAT: {
      return {
        ...state,
        numericFormat: action.payload,
      };
    }
    case SET_COLUMN_SEARCHED: {
      return {
        ...state,
        searchedColumn: action.payload,
      };
    }
    case KEYBOARD_SHORTCUT_TABLE_ACTION: {
      return {
        ...state,
        keyboardShortcut: {
          ...state.keyboardShortcut,
          tableKey: action.tableKey,
          [action.key]: {
            ...(state.keyboardShortcut?.[action.key] || {}),
            ...action.payload,
          },
        },
      };
    }
    default:
      return state;
  }
}
