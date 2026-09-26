import axiosInstanceWrapper from "utils/axiosInstanceWrapper";
import { addSnack } from "actions/snackbarActions";
import { API_METHOD } from "../../../../../constants/api.constant";
import {
  SNACK_VARIANT,
  SOMETHING_WENT_WRONG_MSG
} from "constants/toast.constant";
import { VERSIONS_API_CONSTS, ADD_VERSION_CONSTANTS } from "../constants";
import {
  planDetailsSelector,
  selectedRowsSelector,
  setListCompareLoader,
  trackBudgetTableChangesSelector,
  setVersionListData,
  setPrevSelectedPlans,
  productHierarchySelector,
  prevSelectedPlansSelector,
  setBudgetShowHideMetricsData,
  setIsVersionChipVisible,
  versionListDataSelector,
  setBudgetTableResp
} from "../../../slice/planningScreen.slice";
import { get } from "lodash";

export const listCompareApiReq = (
  setShowVersionModal,
  showHideMetricsData,
  budgetTableResp
) => async (dispatch, getStore) => {
  const store = getStore();

  const updatePlanPayload = trackBudgetTableChangesSelector(store);
  const planDetails = planDetailsSelector(store);
  const selectedRows = selectedRowsSelector(store);
  const prevPlans = prevSelectedPlansSelector(store);
  const hierarchyList = productHierarchySelector(store);
  const versionListData = versionListDataSelector(store);
  const currentVersionCount = showHideMetricsData?.[1].length;
  const productHierarchyLevels = hierarchyList.reduce((acc, level) => {
    return {
      ...acc,
      [level]: planDetails[level]
    };
  }, {});

  const addedVersionPlanCode = selectedRows?.[0]?.data.plan_code;
  const selectedPlan = selectedRows?.[0]?.data;

  const payload = {
    plan_code: planDetails?.plan_code,
    updates: updatePlanPayload,
    versions: [addedVersionPlanCode],
    existing_version_count: currentVersionCount,
    level: productHierarchyLevels
  };

  dispatch(setListCompareLoader(true));
  try {
    const response = await axiosInstanceWrapper({
      axiosProps: {
        isV3: true,
        url: VERSIONS_API_CONSTS.GET_PLANS_TO_COMPARE_API,
        method: API_METHOD.POST,
        data: payload
      },
      dispatch: dispatch
    });

    if (response.status) {
      dispatch(setIsVersionChipVisible(true));
      const responseData = get(response, "data.data.data_row", []);
      //TODO: Need to move this change to backend
      const addedVersionAndPlanCode = responseData.map((rowData) => {
        return {
          ...rowData,
          fromAddVersion: true,
          planCode: addedVersionPlanCode
        };
      });

      const versionRowData = {
        ...versionListData,
        [addedVersionPlanCode]: {
          rowData: addedVersionAndPlanCode,
          rowIndexMapping: get(response, "data.data.row_data_inx_mapping", [])
        }
      };

      dispatch(setVersionListData(versionRowData));

      const addedVersions = get(response, "data.data.added_versions", []);
      const showOrHideData = addedVersions.map((item) => {
        return {
          ...item,
          isChecked: item.is_checked,
          isEditable: item.is_editable
        };
      });

      //updated showHide metrics
      const [kipData, versionData = [], bucketData = []] =
        showHideMetricsData || [];
      const updatedShowHideData =
        showHideMetricsData.length === 2
          ? [kipData, [...versionData, ...showOrHideData]]
          : [kipData, [...versionData, ...showOrHideData], bucketData];

      dispatch(setBudgetShowHideMetricsData(updatedShowHideData));
      dispatch(
        addSnack({
          message: ADD_VERSION_CONSTANTS.ADD_VERSION_SUCCESS_MSG,
          options: {
            variant: SNACK_VARIANT.SUCCESS
          }
        })
      );

      let prevSelectPlans = [...prevPlans, selectedPlan];

      prevSelectPlans = prevSelectPlans.map((plan) => {
        addedVersions.forEach((versionData) => {
          if (
            versionData?.plan_code === plan.plan_code &&
            versionData?.is_added_version
          ) {
            plan = {
              ...plan,
              version: versionData?.label,
              match_with_label: versionData?.match_with_label
            };
          }
        });
        return plan;
      });

      dispatch(setPrevSelectedPlans(prevSelectPlans));

      //returning updated showHide metrics data
      return updatedShowHideData;
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
    dispatch(setListCompareLoader(false));
    setShowVersionModal(false);
  }
};
