const defaultState = {
  layoutFetched: false,
  routes: [],
  headerMenu: [],
  sidebarMenu: [],
  ingestionEnabled: false,
  ingestionEnabledScreens: [],
  ingestionScreenRemovalInProgress: false,
};

export default (state = defaultState, action) => {
  switch (action.type) {
    case "LAYOUT_FETCHED":
      return {
        ...state,
        layoutFetched: action.payload,
      };
    case "SET_ROUTES":
      return {
        ...state,
        routes: action.payload,
      };
    case "SET_HEADER_MENU": {
      return {
        ...state,
        headerMenu: action.payload,
      };
    }
    case "SET_SIDEBAR_MENU": {
      return {
        ...state,
        sidebarMenu: action.payload,
      };
    }
    case "INGESTION_STATUS": {
      return {
        ...state,
        ingestionEnabled: action.payload,
      };
    }
    case "ADD_INGESTION_SCREEN": {
      const newScreen = action.payload;
      const updatedScreens = new Set(state.ingestionEnabledScreens);
      updatedScreens.add(newScreen); // Add the new screen
      return {
        ...state,
        ingestionEnabledScreens: Array.from(updatedScreens),
      };
    }
    case "REMOVE_INGESTION_SCREEN": {
      // console.log(state, action.payload);
      const updatedScreens = new Set(state.ingestionEnabledScreens);
      updatedScreens.delete(action.payload); // Remove the screen
      return {
        ...state,
        ingestionEnabledScreens: Array.from(updatedScreens),
      };
    }
    default:
      return state;
  }
};
