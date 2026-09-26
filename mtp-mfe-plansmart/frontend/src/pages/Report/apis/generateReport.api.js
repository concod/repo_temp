import axiosInstanceWrapper from "utils/axiosInstanceWrapper";
import { addSnack } from "actions/snackbarActions";
import { SNACK_VARIANT } from "constants/toast.constant";
import {
  ERROR_MESSAGE,
  SUCCESS_MESSAGE,
  GENERATE_REPORT_URL
} from "../report.constant";
import { generateReportPayload } from "../report.util";
import { API_METHOD } from "constants/api.constant";

export const generateReportApi = (
  payload,
  setGenerateReportLoader,
  setFieldsDefaultValues
) => async (dispatch) => {
  try {
    setGenerateReportLoader(true);
    const { fields, fieldsDefaultValues } = payload;
    const requestPayload = generateReportPayload({
      fields,
      fieldsDefaultValues
    });

    const response = await axiosInstanceWrapper({
      axiosProps: {
        url: GENERATE_REPORT_URL,
        method: API_METHOD.POST,
        data: {
          ...requestPayload,
          source: "client",
          plan_code: 0
        }
      },
      dispatch: dispatch
    });
    if (response.status) {
      dispatch(
        addSnack({
          message: SUCCESS_MESSAGE,
          options: {
            variant: SNACK_VARIANT.INFO
          }
        })
      );
    }
  } catch (error) {
    dispatch(
      addSnack({
        message: ERROR_MESSAGE.DOWNLOAD_REPORT,
        option: {
          variant: SNACK_VARIANT.ERROR
        }
      })
    );
  } finally {
    setGenerateReportLoader(false);
    setFieldsDefaultValues({});
  }
};
