import {
  SET_HIERARCHY_LEVEL,
  SET_HELP_DESK,
  SET_SPECIFIC_SCREEN_NAME,
  SET_KEYBOARD_SHORTCUT,
} from "../actions/types";

const initialState = {
  hierarchyLevels: {},
  helpDesk: "",
  coreScreenNames: [],
  tenantConfigApplicationLevel: [],
  keyboardShortcuts: {},
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
    default:
      return state;
  }
}
