import {
  SAVE_LAST_SEARCH_TAB,
  SAVE_TABLE_RECENT_CONFIG,
  SAVE_TABLE_SEARCH_CONFIG,
  SAVE_TABLE_STATE,
  RESET_TABLE_RECENT_CONFIG,
  SET_COLUMN_SEARCHED,
} from "../actions/types";

const initialState = {
  tableState: {},
  tableSearchConfig: null,
  recentTableConfig: {},
  searchedColumn: null,
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
        recentTableConfig: {},
      };
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
    default:
      return state;
  }
}
