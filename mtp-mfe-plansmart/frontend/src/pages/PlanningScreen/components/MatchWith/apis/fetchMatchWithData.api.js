import { get } from "lodash";
import { API_METHOD } from "../../../../../constants/api.constant";
import { MATCH_WITH_CONFIG } from "../../../../../constants/modalApi.constant";
import axiosInstanceWrapper from "utils/axiosInstanceWrapper";
import {
  setMatchWithKpiLoader,
  setMatchWithKpiList,
  setMatchWithKpiData,
  planDetailsSelector,
  setMatchWithKpiDataSelector
} from "../../../slice/planningScreen.slice";
import { addSnack } from "actions/snackbarActions";
import {
  SNACK_VARIANT,
  SOMETHING_WENT_WRONG_MSG
} from "constants/toast.constant";
import { updateFields } from "../matchWith.util";
import { getPlanningScreenBreadCrumbsDetails } from "../../../planningScreen.util";
import { IAF, WRITTEN_SALES } from "../matchWith.constants";

export const fetchMatchWithData = ({ planCode, version }) => async (
  dispatch,
  getStore
) => {
  try {
    const store = getStore();
    const planDetails = planDetailsSelector(store);
    const fields = setMatchWithKpiDataSelector(store);
    const { seasonType } = getPlanningScreenBreadCrumbsDetails(
      planDetails?.status
    );
    dispatch(setMatchWithKpiLoader(true));

    const response = await axiosInstanceWrapper({
      axiosProps: {
        isV3: true,
        url: MATCH_WITH_CONFIG,
        method: API_METHOD.POST,
        data: {
          season_type: seasonType,
          version: version,
          plan_code: planCode
        }
      },
      dispatch: dispatch
    });
    const kpiListRes = get(response, "data.data.match_with_master_info", []);
    const kpiList =
      version === IAF
        ? kpiListRes.map((item) => {
            return {
              [WRITTEN_SALES]: item[WRITTEN_SALES]
            };
          })
        : kpiListRes;
    const selectAllFlag = get(response, "data.data.select_all", true);
    const selectAllFlagValue = Boolean(selectAllFlag);

    if (kpiList.length > 0) {
      dispatch(setMatchWithKpiList(kpiList[0]));
      dispatch(
        setMatchWithKpiData(
          updateFields({ fields, kpiList, selectAllFlagValue })
        )
      );
    }
  } catch (error) {
    dispatch(
      addSnack({
        message: SOMETHING_WENT_WRONG_MSG,
        options: {
          variant: SNACK_VARIANT.ERROR
        }
      })
    );
  } finally {
    dispatch(setMatchWithKpiLoader(false));
  }
};
