import { get } from "lodash";
import axiosInstance from "core/Utils/axios";
import { addSnack } from "actions/snackbarActions";
import { setScreenIdMapping } from "../slices/viewManagement.slice";
import { VIEW_MANAGEMENT_API_URLS } from "../viewManagement.constant";

export const getScreensMapping = () => async (dispatch) => {
  try {
    const response = await axiosInstance({
      url: VIEW_MANAGEMENT_API_URLS.SCREEN_NAME_ID_MAPPING_URL,
      method: "GET",
      isV3: true,
    });
    dispatch(setScreenIdMapping(get(response, "data.data", {})));
  } catch (error) {
    dispatch(
      addSnack({
        message: "Something went wrong",
        options: { variant: "error" },
      })
    );
  }
};
