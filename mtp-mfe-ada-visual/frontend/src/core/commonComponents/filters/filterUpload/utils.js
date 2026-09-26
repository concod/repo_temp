import * as XLSX from "xlsx";
import { getFilterFields, uploadFilterExcel } from "./filter-upload-services";
import { saveAs } from "file-saver";
import { fetchBaseUrl } from "core/Utils/functions/utils";
import { isEmpty, isNull, isUndefined } from "lodash";
import { SET_UPLOADED_FILTERS } from "core/actions/types";

/**
 * Function to generate the filter template xlsx and then trigger download
 * @param {String} screenName
 */
export const generateFilterTemplate = async (screenName) => {
  try {
    const request = await getFilterFields(screenName);
    const response = await request;
    if (response?.data?.status) {
      const fieldNames = [
        response?.data?.data?.map((element) => element.label),
      ];
      const filename = "filtersTemplate.xlsx";
      const ws = XLSX.utils.aoa_to_sheet(fieldNames);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
      const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([wbout], { type: "application/octet-stream" });
      saveAs(blob, filename);
    }
  } catch (err) {
    console.error("generateFilterTemplate => ", err);
  }
};

/**
 * Function to generate the filter template xlsx and then trigger download
 * @param {String} appCode - Application code
 * @param {String} fileList - Selected file
 * @param {String} screenName - ScreenName
 * @param {String} displaySnackMessages - Hook to trigger display message
 * @param {Function} dispatch
 * @param {String} filterConfigKey - Key for which the filter values are to be stored in the reducer
 * @param {Function} setPromptState - Function to handle the state of the prompt to be displayed
 */
export const filterUploadHandler = async (
  appCode,
  fileList,
  screenName,
  displaySnackMessages,
  dispatch,
  filterConfigKey,
  setPromptState
) => {
  if (isNull(appCode) || isEmpty(fileList) || isUndefined(screenName)) {
    displaySnackMessages("Something went wrong", "error", dispatch);
    return;
  }
  try {
    const baseUrl = await fetchBaseUrl(appCode);
    const formData = new FormData();
    formData.append("upload_file", fileList[0].file);
    // const request = await uploadFilterExcel(baseUrl, formData, screenName);
    // const response = await request?.data;
    const response = {
      data: {
        data: {
          country: ["CAN", "USA"],
          channel: ["Brick __ia_char_13 Mortar"],
        },
        is_partial_validation_succesful: false,
        signed_url: "",
        is_full_validation_successful: false,
      },
      status: true,
    };

    // Checking if the file validation was unsuccessful.
    if (!response?.status) {
      displaySnackMessages("Something went wrong!", "error", dispatch);
      return;
    }
    // If the api call was successful
    if (response?.status) {
      if (response?.data?.is_full_validation_successful) {
        triggerFilterApply(
          filterConfigKey,
          response?.data?.data,
          dispatch
        );
      } else if (response?.data?.is_partial_validation_succesful) {
        setPromptState({
          isOpen: true,
          title: "Filter validation partially successful!",
          message:
            "Some of the uploaded filter data might be missing. Do you wish to proceed?",
          data: response?.data?.data,
          status: "partial",
          downloadUrl: response?.data?.signed_url,
        });
      } else {
         setPromptState({
           isOpen: true,
           title: "Filter validation failed!",
           message: "You can download the file with error highlights below.",
           data: [],
           status: "failed",
           downloadUrl: response?.data?.signed_url,
         });
      }
    }
  } catch (err) {
    console.error("filterUploadHandler => ", err);
  }
};

/**
 * @param {String} filterConfigKey - Key for which the filter values are to be stored in the reducer
 * @param {Object} data - Object with filter fields & values to be applied.
 */
export const triggerFilterApply = (filterConfigKey, data, dispatch) => {
  dispatch({
    type: SET_UPLOADED_FILTERS,
    payload: {
      [filterConfigKey]: data,
    },
  });
  setTimeout(() => {
    document.getElementById("filter-panel-primary-btn")?.click();
  }, 500);
};


export const handleFileDownload = (url) => {
  const link = Object.assign(document.createElement("a"), {
    href: url,
    style: "display: none",
  });
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export const primaryBtnHandlerForPrompt = (
  setFileList,
  setPromptState,
  initialPromptState,
  promptState,
  filterConfigKey,
  dispatch
) => {
  try {
    if (promptState?.status === "failed") {
      handleFileDownload(promptState?.downloadUrl);
    } else if (promptState?.status === "partial") {
      triggerFilterApply(filterConfigKey, promptState?.data, dispatch);
    }
  } catch (error) {
    console.error("Error primaryBtnHandlerForPrompt => ", error);
  } finally {
    setFileList([]);
    setPromptState(initialPromptState);
  }
};

export const resetHandler = (
  setFileList,
  setPromptState,
  initialPromptState
) => {
  setFileList([]);
  setPromptState(initialPromptState);
};
