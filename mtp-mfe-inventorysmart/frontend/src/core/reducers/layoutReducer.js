const defaultState = {
  layoutFetched: false,
  routes: [],
  headerMenu: [],
  sidebarMenu: [],
  ingestionEnabled: false,
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
      }
    }
    default:
      return state;
  }
};
