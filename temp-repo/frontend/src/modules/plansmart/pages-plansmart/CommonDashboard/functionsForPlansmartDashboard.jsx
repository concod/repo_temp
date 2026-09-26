import { Button, Tooltip } from "@mui/material";
import get from "lodash/get";
import Visibility from "@mui/icons-material/Visibility";
import EditIcon from "@mui/icons-material/Edit";
import {
  PLAN_SMART_PLAN_DETAILS,
  EDIT_RECEIPT_PLAN,
} from "modules/plansmart/constants-plansmart/routesConstants";
import { parseBudgetTableResponseData } from "../plansmart-budget-table/budget-table-functions";
import { getHeaderForExcel, csvFormatter } from "../plansmart-utility";

export const editViewUi = (selectedRows, classes, history, tabValue) => {
  let actionArray = selectedRows?.[0]?.action;
  let viewAction = actionArray?.indexOf("view") !== -1 ? true : false;
  let editAction = actionArray?.indexOf("edit") !== -1 ? true : false;

  const editButton = () => {
    return (
      <Tooltip title="Edit">
        <Button
          className={classes.plansmartIconButton}
          variant="contained"
          onClick={() =>
            onViewEditClick(
              selectedRows[0].plan_code,
              "edit",
              history,
              tabValue
            )
          }
        >
          <EditIcon />
        </Button>
      </Tooltip>
    );
  };

  const viewButton = () => {
    return (
      <Tooltip title="View">
        <Button
          className={classes.plansmartIconButton}
          variant="contained"
          onClick={() =>
            onViewEditClick(selectedRows[0].plan_code, "view", history)
          }
        >
          <Visibility />
        </Button>
      </Tooltip>
    );
  };

  if (viewAction && editAction) {
    return (
      <div className={classes.buttonsWrapper}>
        {editButton()}
        {viewButton()}
      </div>
    );
  } else if (!editAction && viewAction) {
    return viewButton();
  } else if (editAction && !viewAction) {
    return editButton();
  }
};

export const onViewEditClick = (plan_code, action, history, tabValue) => {
  if (tabValue === 2) {
    history.location.pathname = `${EDIT_RECEIPT_PLAN}/${
      action === "view" ? "view" : "edit"
    }/${plan_code}`;
  } else {
    history.location.pathname = `${PLAN_SMART_PLAN_DETAILS}/${
      action === "view" ? "view" : "edit"
    }/${plan_code}`;
  }
  history.push(history.location);
};

/**
 * @function
 * @desc Fetch Headers for the required excel
 */

/**
 * @function
 * @desc Deleting the plan
 */
export const onDeletePlan = async (props, selectedRows, history) => {
  let selectedPlanCode = selectedRows?.map((dashboardRowData) => {
    return dashboardRowData.plan_code;
  });
  let deletePlanResponse = await props.deletePlanSmartPlanAPI({
    plan_codes: selectedPlanCode,
  });
  if (deletePlanResponse?.data?.status) {
    generateSnackMessages(
      "Plan(s) deleted successfully",
      "success",
      props.addSnack
    );
    props.fetchTableData();
  } else {
    generateSnackMessages("Error in deleting plan(s)", "error", props.addSnack);
  }
};

export const generateSnackMessages = (response, variant, addSnack) => {
  addSnack({
    message: response,
    options: {
      variant,
    },
  });
};

//get the plan hierarchy data from the selected plan for filters
export const getFilterForRows = (obj, planHierarchies) => {
  let filteredRows = {};

  planHierarchies.forEach((planHierarchy) => {
    filteredRows[planHierarchy.column_name] = obj[planHierarchy.column_name];
  });

  return filteredRows;
};

//getting the data for the plan selected from dashboard
export const getDownloadData = async (
  obj,
  setCsvData,
  setCsvHeaders,
  props
) => {
  let planCode = obj.plan_code;
  //fetching the headers for the plan selected from dashboard
  let planColDef = await props.getPlanningTableColumns(planCode);
  let planTableHeaders = getHeaderForExcel(planColDef.data.data);
  setCsvHeaders(planTableHeaders);

  let filterForRows = getFilterForRows(obj, props.planHierarchies);
  const postBody = {
    plan_code: planCode,
    level: filterForRows,
  };
  //fetching the values for the plan selected from dashboard
  try {
    let csvValues = await props.fetchPlanBudgetDetails(postBody);
    let parsedData = parseBudgetTableResponseData(csvValues?.data?.data, []);
    let planTableValues = csvFormatter(parsedData, planTableHeaders);
    setCsvData(planTableValues);
    props.setPlansmartDashboardLoader(false);
  } catch (error) {
    props.addSnack({
      message: "Error while copying plan",
      options: {
        variant: "error",
      },
    });
    props.setPlansmartDashboardLoader(false);
  }
};

export const disbaleCreateOrReviewButton = (props, selectedRows) => {
  if (props?.userAccessList?.["create"] && !props?.isInSeasonDashbaord) {
    return false;
  } else if (
    props?.userAccessList?.["create"] &&
    props?.isInSeasonDashbaord &&
    selectedRows?.length === 1
  ) {
    return false;
  } else return true;
};

export const copyPlan = async (
  props,
  selectedRows,
  setCopyModal,
  history,
  planDisplayName
) => {
  try {
    const [selectedPlan] = selectedRows;
    const planCode = selectedPlan.plan_code;
    props.setCopyLoader(true);
    const copyPlanPayload = {
      plan_code: planCode,
      plan_display_name: planDisplayName,
    };
    const result = await props.copyPlanReq(copyPlanPayload);
    if (result.data.status) {
      const scenarioPlanCode = get(result, "data.data.new_plan", null);
      setTimeout(() => {
        history.push(`${PLAN_SMART_PLAN_DETAILS}/edit/${scenarioPlanCode}`);
      }, 500);
      props.addSnack({
        message: "Plan save successfully",
        options: {
          variant: "success",
        },
      });
      setCopyModal(false);
    } else {
      props.addSnack({
        message: "Error in saving the plan details.",
        options: {
          variant: "error",
        },
      });
    }
  } catch (error) {
    props.addSnack({
      message: error?.response?.data?.message || "Error while copying plan",
      options: {
        variant: "error",
      },
    });
  }
  props.setCopyLoader(false);
};

/**
 * @function
 * @description Set state for Data to be downloaded
 */
export const updateDataForDownload = (rows, setDataForDownload) => {
  setDataForDownload(rows);
};
