import {
  SAVE_TABLE_STATE,
  SAVE_LAST_SEARCH_TAB,
  SAVE_TABLE_SEARCH_CONFIG,
  SAVE_TABLE_RECENT_CONFIG,
  RESET_TABLE_RECENT_CONFIG,
  SET_COLUMN_SEARCHED,
  KEYBOARD_SHORTCUT_TABLE_ACTION,
  TOGGLE_CELL_COMMENT_PANEL,
  PAGE_NUMBER,
  SET_EDITABLE_CELL_FOCUS,
  SET_MULTI_TABLE_VIEW_ENABLED_APPS
} from "../actions/types";

const initialState = {
  tableState: {},
  tableSearchConfig: null,
  recentTableConfig: {},
  searchedColumn: null,
  keyboardShortcut: {},
  cellCommentPanel: false,
  activeEditableCell: null,
  multiTableViewEnabledApps:{}
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
    case TOGGLE_CELL_COMMENT_PANEL:{
      return {
        ...state,
        pageLimit: action.payload
      }
    }
    case PAGE_NUMBER: {
      return {
        ...state,
        pageNumber: action.payload
      }
    }
    case SET_EDITABLE_CELL_FOCUS: {
      return {
        ...state,
        activeEditableCell: action.payload,
      };
    }
    case SET_MULTI_TABLE_VIEW_ENABLED_APPS: {
      return {
        ...state,
        multiTableViewEnabledApps: {
          ...state.multiTableViewEnabledApps,
          ...action.payload
        }
      }
    }
    default:
      return state;
  }
}
