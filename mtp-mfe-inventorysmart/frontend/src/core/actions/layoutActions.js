import {
  LAYOUT_FETCHED,
  SET_ROUTES,
  SET_HEADER_MENU,
  SET_SIDEBAR_MENU,
  INGESTION_STATUS,
  LOADER,
} from "./types";
import axios from "../Utils/axios";

const layoutActions = {
  setLayout: (app) => (dispatch) => {
    dispatch({
      type: LOADER,
      payload: { status: true },
    });
    axios({ url: `user/menu_routes/?app_name=${app}`, method: "GET" })
      .then((data) => {
        dispatch({
          type: SET_ROUTES,
          payload: data.data.data.ROUTES,
        });
        dispatch({
          type: SET_HEADER_MENU,
          payload: data.data.data.HEADER,
        });
        dispatch({
          type: SET_SIDEBAR_MENU,
          payload: data.data.data.SIDEBAR,
        });
        dispatch({
          type: LOADER,
          payload: { status: false },
        });
        dispatch({
          type: LAYOUT_FETCHED,
          payload: true,
        });
      })
      .catch(() => {
        dispatch({
          type: LOADER,
          payload: { status: false },
        });
        dispatch({
          type: LAYOUT_FETCHED,
          payload: true,
        });
      });
  },
};

export const ingestionEnabled = (enabled) => (dispatch) => {
  dispatch({
    type: INGESTION_STATUS,
    payload: enabled,
  });
}

export default layoutActions;
