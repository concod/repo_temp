import {
  SET_HIERARCHY_LEVEL,
  SET_HELP_DESK,
  SET_SPECIFIC_SCREEN_NAME,
  UPDATE_TAM_CACHE,
} from "../actions/types";

const initialState = {
  hierarchyLevels: {},
  helpDesk: "",
  coreScreenNames: [],
  tenantConfigApplicationLevel: [],
  tamAPICache: {},
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
    default:
      return state;
  }
}
