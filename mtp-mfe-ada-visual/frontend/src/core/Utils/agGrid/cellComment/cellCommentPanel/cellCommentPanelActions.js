import { displaySnackMessages } from "core/Utils/utils";
import { getPanelComments } from "../cell-comment-services";

export const getAllCommentsForPanel = async (payload, dispatch) => {
  try {
    const request = await getPanelComments(payload);
    if (request?.data?.status) {
      return {
        status: true,
        data: request?.data?.data?.components,
      };
    }
  } catch (err) {
    console.error(
      "getAllCommentsForPanel : Error fetching panel comments ==> ",
      err
    );
    displaySnackMessages(
      "Error fetching comments panel data",
      "error",
      dispatch
    );
    return {
      status: false,
    };
  }
};
