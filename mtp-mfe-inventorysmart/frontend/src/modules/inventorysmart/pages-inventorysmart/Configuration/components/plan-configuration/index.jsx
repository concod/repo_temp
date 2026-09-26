import React, { useEffect, useState, useRef } from "react";
import { connect } from "react-redux";

import { Button, useTranslation } from "impact-ui-v3";
import moment from "moment";

import AgGridComponent from "core/Utils/agGrid";
import globalStyles from "core/Styles/globalStyles";
import { addSnack } from "core/actions/snackbarActions";
import { getColumnsAg } from "core/actions/tableColumnActions";
import { cloneDeep, isEmpty } from "lodash";
import Loader from "core/Utils/Loader/loader";
import { makeStyles } from "@mui/styles";

const useLocalStyles = makeStyles(() => ({
  footerAlignEnd: {
    justifyContent: 'flex-end !important',
  },
}));

import {
  getPlanConfigurationInfo,
  setPlanConfigurationScreenLoader,
  setPlanConfigurationData,
  updatePlanConfigurationInfo,
  resetPlanConfiguration,
} from "../../../../services-inventorysmart/Plan-Configuration/plan-configuration-service";
import {
  ERROR_MESSAGE,
  UPDATED_MESSAGE,
  PLAN_CONFIG_START_DATE_VALIDATION,
  PLAN_CONFIG_END_DATE_VALIDATION,
  CURRENT_DATE_START_DATE_VALIDATION,
  INVENTORY_SUBMODULES_NAMES,
  NO_UPDATE,
} from "../../../../constants-inventorysmart/stringConstants";
import {
  configureAttributeOptions,
  isActionAllowedOnSubModule,
} from "../../../inventorysmart-utility";

const PlanConfigTable = (props) => {
  const { t } = useTranslation();
  const [planConfigurationColumns, setPlanConfigurationColumns] = useState([]);
  const [updatedRowEdits, setUpdatedRowEdits] = useState([]);
  const [mountPlanConfigTable, setMountPlanConfigTable] = useState(true);

  const planConfigurationTableInstance = useRef(null);
  const globalClasses = globalStyles();
  const localClasses = useLocalStyles();

  const canTakeActionOnModules = (subModuleName, action) => {
    return isActionAllowedOnSubModule(
      props.inventorysmartModulesPermission,
      props.module,
      subModuleName,
      action
    );
  };

  useEffect(() => {
    (async () => {
      props.setPlanConfigurationScreenLoader(true);
      let planInfoColumn = await getColumnsAg(
        "table_name=configuration_plan"
      )();
      let hasAccess = canTakeActionOnModules(
        INVENTORY_SUBMODULES_NAMES.INVENTORY_PLAN_CONFIG,
        "edit"
      );
      planInfoColumn.forEach((item) => {
        // Highlight plan start date column on basis of plan end date's disablePast config
        if (item.column_name === "plan_start_date") {
          item.disablePastDynamically = setDisabledDates;
        }
      });
      if (!hasAccess) {
        planInfoColumn.forEach((item) => {
          if (item.is_editable) {
            item.disabled = true;
          }
        });
      }
      setPlanConfigurationColumns(planInfoColumn);
    })();
    return () => {
      props.resetPlanConfiguration();
    };
  }, [props.module]);

  const setDisabledDates = (_item, _value, data) => {
    let endDateValue = moment(data.plan_end_date).format(
      localStorage.getItem("tenantDateFormat")
    );
    let currentDate = moment(new Date()).format(
      localStorage.getItem("tenantDateFormat")
    );
    // parse date strings to fetch time difference to compare
    return Date.parse(endDateValue) < Date.parse(currentDate);
  };

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const manualCallBackPlanConfig = async (manualbody, pageIndex) => {
    props.setPlanConfigurationScreenLoader(true);
    let body = {
      meta: {
        ...manualbody,
        limit: { limit: 10, page: pageIndex + 1 },
      },
      filters: [],
    };
    try {
      let response = await props.getPlanConfigurationInfo(body);
      
      // Check if the response indicates an error
      if (response.data?.status === false) {
        props.setPlanConfigurationScreenLoader(false);
        const errorMessage = response.data?.message || ERROR_MESSAGE;
        if (response.data?.show_message) {
          displaySnackMessages(errorMessage, "error");
        }
        return {
          data: [],
          totalCount: 0,
        };
      }
      
      let setDropDownOptionsInResponse = response.data?.data
        ? response.data.data.map((item) => {
            return {
              ...item,
              all_plan_ly: isEmpty(item.all_plan_ly)
                ? ""
                : configureAttributeOptions([item.all_plan_ly]),
              all_plan_ly_options: configureAttributeOptions(
                item.all_plan_ly_total
              ),
            };
          })
        : [];
      props.setPlanConfigurationData(cloneDeep(setDropDownOptionsInResponse));
      props.setPlanConfigurationScreenLoader(false);
      return {
        data: setDropDownOptionsInResponse,
        totalCount: response.data.total,
      };
    } catch (e) {
      props.setPlanConfigurationScreenLoader(false);
      const errorMessage = e?.response?.data?.message || ERROR_MESSAGE;
      displaySnackMessages(errorMessage, "error");
      return {
        data: [],
        totalCount: 0,
      };
    }
  };

  const updateEditedRowState = (data) => {
    const cloneRefInstance = cloneDeep(updatedRowEdits);
    const existingIndex = cloneRefInstance.findIndex(
      (obj) => obj.l0_code === data.l0_code
    );
    if (existingIndex !== -1) {
      // Replace the existing object with the new object
      cloneRefInstance[existingIndex] = data;
      setUpdatedRowEdits(cloneRefInstance);
    } else {
      // Push the new object to the state
      setUpdatedRowEdits((prevState) => [...prevState, data]);
    }
  };

  const onCellValueChanged = (params) => {
    const { column, node, data, newValue, oldValue } = params;
    // Plan start date cannot be set to empty or have value greater than plan end date or have a value lesser than current date
    if (column.colId === "plan_start_date") {
      if (newValue === null || !moment(newValue)?.isValid()) {
        displaySnackMessages(NO_UPDATE, "warning");
        data[column.colId] = oldValue;
        planConfigurationTableInstance.current.api.refreshCells({
          columns: [column.colId],
        });
      } else {
        if (
          !isEmpty(data.plan_end_date) &&
          moment(newValue).format("YYYY-MM-DD") >=
            moment(data.plan_end_date).format("YYYY-MM-DD")
        ) {
          displaySnackMessages(PLAN_CONFIG_START_DATE_VALIDATION, "warning");
          data[column.colId] = oldValue;
          planConfigurationTableInstance.current.api.refreshCells({
            columns: [column.colId],
          });
        } else if (new Date(data.plan_start_date) < new Date()) {
          displaySnackMessages(CURRENT_DATE_START_DATE_VALIDATION, "warning");
          data[column.colId] = oldValue;
          planConfigurationTableInstance.current.api.refreshCells({
            columns: [column.colId],
          });
        } else updateEditedRowState(data);
      }
    }

    // Plan end date cannot be set to empty or have value lesser than plan start date
    if (column.colId === "plan_end_date") {
      if (newValue === null || !moment(newValue)?.isValid()) {
        displaySnackMessages(NO_UPDATE, "warning");
        data[column.colId] = oldValue;
        planConfigurationTableInstance.current.api.refreshCells({
          columns: [column.colId],
        });
      } else {
        if (
          !isEmpty(data.plan_start_date) &&
          moment(newValue).format("YYYY-MM-DD") <=
            moment(data.plan_start_date).format("YYYY-MM-DD")
        ) {
          displaySnackMessages(PLAN_CONFIG_END_DATE_VALIDATION, "warning");
          data[column.colId] = oldValue;
          planConfigurationTableInstance.current.api.refreshCells({
            columns: [column.colId],
          });
        } else {
          setDisabledDates(column, newValue, data);
          // Remove the highlight on plan start date column when plan end value has changes to a date greater than or equal to current date
          planConfigurationTableInstance.current.api.refreshCells({
            columns: ["plan_start_date"],
            force: true,
            rowNodes: [node],
          });
          updateEditedRowState(data);
        }
      }
    }
    if (column.colId === "all_plan_ly") {
      planConfigurationTableInstance.current.api.refreshCells({
        columns: [column.colId],
      });
      updateEditedRowState(data);
    }
  };

  const loadTableInstance = (params) => {
    planConfigurationTableInstance.current = params;
  };

  const applyEdits = async () => {
    try {
      props.setPlanConfigurationScreenLoader(true);
      let updateBody = updatedRowEdits.map((item) => {
        return {
          l0_code: item.l0_code,
          l0_name: item.l0_name,
          plan_end_date: moment(item?.plan_end_date).format("YYYY-MM-DD"),
          plan_start_date: moment(item?.plan_start_date).format("YYYY-MM-DD"),
          all_plan_ly: isEmpty(item.all_plan_ly) ? "" : item.all_plan_ly[0]?.value,
        };
      });
      let response = await props.updatePlanConfigurationInfo({
        data: updateBody,
      });
      if (response.data.status) {
        // display success msg and reload the table
        setUpdatedRowEdits([]);
        setMountPlanConfigTable(false);
        displaySnackMessages(UPDATED_MESSAGE, "success");
        setMountPlanConfigTable(true);
      }
      props.setPlanConfigurationScreenLoader(false);
    } catch (e) {
      props.setPlanConfigurationScreenLoader(false);
      displaySnackMessages(ERROR_MESSAGE, "error");
    }
  };

  return (
    <Loader loader={props.planConfigurationLoader}>
      <div className={globalClasses.marginAround}>
        {mountPlanConfigTable && (
          <AgGridComponent
            manualCallBack={(body, pageIndex) =>
              manualCallBackPlanConfig(body, pageIndex)
            }
            columns={planConfigurationColumns}
            uniqueRowId={"l0_code"}
            onCellValueChanged={onCellValueChanged}
            loadTableInstance={loadTableInstance}
            rowModelType="serverSide"
            serverSideStoreType="partial"
            cacheBlockSize={10}
            sizeColumnsToFitFlag
          />
        )}
        <div className={`${globalClasses.stickyFooter} ${localClasses.footerAlignEnd}`}>
          <Button
            variant="primary"
            disabled={!updatedRowEdits.length}
            onClick={() => applyEdits()}
          >
            {t("inventorysmart.configSaveButton")}
          </Button>
        </div>
      </div>
    </Loader>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer } = store;
  return {
    planConfigurationData:
      inventorysmartReducer.planConfigurationService.planConfigurationData,
    planConfigurationLoader:
      inventorysmartReducer.planConfigurationService.planConfigurationLoader,
    inventorysmartModulesPermission:
      inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartModulesPermission,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (snack) => dispatch(addSnack(snack)),
    getPlanConfigurationInfo: (body) =>
      dispatch(getPlanConfigurationInfo(body)),
    setPlanConfigurationData: (body) =>
      dispatch(setPlanConfigurationData(body)),
    setPlanConfigurationScreenLoader: (body) =>
      dispatch(setPlanConfigurationScreenLoader(body)),
    updatePlanConfigurationInfo: (body) =>
      dispatch(updatePlanConfigurationInfo(body)),
    resetPlanConfiguration: () => dispatch(resetPlanConfiguration()),
  };
};
export default connect(mapStateToProps, mapDispatchToProps)(PlanConfigTable);
