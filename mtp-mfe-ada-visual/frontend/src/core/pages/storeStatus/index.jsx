import Delete from "@mui/icons-material/Delete";
import { IconButton, Typography } from "@mui/material";
import { Button, Prompt as IaPrompt } from "impact-ui-v3";
import makeStyles from "@mui/styles/makeStyles";
import colours from "core/Styles/colours";
import globalStyles from "core/Styles/globalStyles";
import AgGridComponent from "core/Utils/agGrid";
import CellRenderers from "core/Utils/agGrid/cellRenderer";
import SetAllMultiRow from "core/Utils/agGrid/setall-multirow-form";
import { isDateRangeConflict } from "core/Utils/functions/helpers/validation-helpers";
import { setFilterConfiguration } from "core/actions/filterAction";
import { addSnack } from "core/actions/snackbarActions";
import { getTenantConfigApplicationLevel } from "core/actions/tenantConfigActions";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import {
  fetchFilterFieldValues,
  formattedFilterConfiguration,
} from "core/commonComponents/coreComponentScreen/utils";
import { capitalize, cloneDeep, isEmpty, isEqual, isNull, uniq } from "lodash";
import moment from "moment";
import React, { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import { Prompt } from "react-router";
import Loader from "../../Utils/Loader/loader";
import ConfirmBox from "../../Utils/confirmPrompt/confirmPopup";
import {
  createNewProduct,
  getProductStatusData,
  getStatusData,
  setProductStatusData,
  setStatusData,
  setUpdateStatusData,
  downloadTableData,
} from "../../actions/productStoreStatusActions";
import { getPSMItineraryConfig } from "../../actions/tenantConfigActions";
import {
  getColumnsAg,
  resetTableRecentChanges,
} from "../../actions/tableColumnActions";
import {
  END_DATE,
  SKU_STORE_STATUS_START_DATE,
} from "../../../config/constants";
import ConflictResolutionModal from "./components/conflict-resolution-modal";
import CreateStoreModal from "./components/create-store";
import "./index.scss";
import {
  addCustomStatusDependency,
  checkConflictInAttributeType,
  checkDateValidationInAttributeType,
  dateValidation,
  formatAttribute,
  getActiveEntityFilter,
  getListOptions,
  getNextInactiveStatus,
  getUpdatedSetAllData,
  isDateFieldChangeValid,
  isValidDates,
} from "./utils";

import { INVENTORY_SUBMODULES_NAMES } from "core/Utils/constants/inventorySmart-constants";
import { isActionAllowedOnSubModule } from "core/Utils/utils";
import { IS_OVERRIDEN_CORE_BUTTON_WIDTH,IS_OVERRIDEN_CORE_BUTTON_PLACEMENT } from "core/constants";

const useStyles = makeStyles((theme) => ({
  actionButton: {
    padding: "0px",
  },
}));

const TABLE_NAME = "store_status";

function StoreFilter(props) {
  const [filterData, setFilterData] = useState([]);
  const [showloader, setloader] = useState(true);
  const [columns, setColumns] = useState([]);
  const [totalRowsCount, setTotalRowsCount] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [createStore, showCreateStore] = useState(false);
  const [setAllData, updateSetAllData] = useState([]);
  const [setAll, toggleSetAll] = useState(false);
  const [confirmBox, showConfirmBox] = useState(false);
  const [selectedRowsIDs, setSelectedRowsIDs] = useState([]);
  const [flag_edit, setFlag_edit] = useState(false);
  const onFilterDependency = useRef(null);
  const tableInstance = useRef({});
  const classes = useStyles();
  const globalClasses = globalStyles();

  const isThreadFeatureEnabled = Boolean(
    props?.commentingConfig?.inventory_smart_comment_and_thread
      ?.isThreadFeatureEnabled
  );

  const [resolutionType, setResolutionType] = useState("hard_reset");
  const [deleteActionObj, setDeleteActionObj] = useState({});
  const [editActionObj, setEditActionObj] = useState({});
  const [showCreateStoreBtn, setShowCreateStoreBtn] = useState(true);
  const [isMultipleStatus, setIsMultipleStatus] = useState(false);
  const [showDownloadBtn, setShowDownloadBtn] = useState(false);
  const [hasEditPermissions, setHasEditPermissions] = useState(false);
  const [psmItineraryConfig, setPsmItineraryConfig] = useState({});

  const setNewTableInstance = (params) => {
    tableInstance.current = params;
  };

  // called when delete icon is clicked and delete object is set
  useEffect(() => {
    if (!isEmpty(deleteActionObj)) {
      updateSetAllDataHandler(deleteActionObj, "delete");
    }
  }, [deleteActionObj]);

  // called when edit icon is clicked and edit object is set
  useEffect(() => {
    if (!isEmpty(editActionObj)) {
      updateSetAllDataHandler(editActionObj, "edit");
    }
  }, [editActionObj]);

  // handles edit/delete operations in setAllData
  const updateSetAllDataHandler = (inputActionObj, updateActionType) => {
    const { isEdited, updatedSetAllData } = getUpdatedSetAllData(
      inputActionObj,
      updateActionType,
      setAllData
    );

    if (isEdited) {
      // if attribute present then update in existing object
      updateSetAllData(updatedSetAllData);
    } else {
      //else add new attribute object
      updateSetAllData([...setAllData, inputActionObj]);
    }
  };

  const onFilterDashboardClick = (dependencyData) => {
    onFilterDependency.current = dependencyData;
    fetchValuesBasedOnFilterApplied(true);
  };

  const fetchValuesBasedOnFilterApplied = (unsavedCheck) => {
    if (unsavedCheck && setAllData.length) {
      showConfirmBox(true);
      throw Error("Unsaved changes");
    }
    props.resetTableRecentChanges();
    tableInstance.current?.api?.setFilterModel(null);
    tableInstance.current.api?.refreshServerSideStore({ purge: true });
    tableInstance.current.api?.deselectAll(true);
  };

  const editableFieldsList = React.useMemo(() => {
    const cloneStoreColumns = cloneDeep(columns);
    let editableFields = cloneStoreColumns.filter(
      (item) => !item.is_hidden && item.is_editable && !item.system_field
    );

    editableFields = editableFields.map((item) => {
      if (item.type === "datetime") {
        item.type = "DateTimeField";
        item.disablePast = false; //making it to false as per signet's requirement
      }
      return item;
    });
    return [
      {
        fields: editableFields,
        addRowLabel: "Add Status",
        id: "status",
        rowCount: 0,
        hideRowLabel: !isMultipleStatus,
      },
    ];
  }, [columns]);

  const multiValueAggregate = (value) => {
    value = value.filter((val) => val !== null);
    return value.length > 0 ? value.join(`${","}${" "}`) : "-";
  };

  useEffect(() => {
    const getInitialData = async () => {
      try {
        getPSMItineraryConfig().then(config => {
          setPsmItineraryConfig(config || {});
        }).catch(error => {
          console.error('Error fetching PSM Itinerary Config:', error);
        });
        
        let cols = await getColumnsAg(`table_name=${TABLE_NAME}`, {},{}, false, false, true, isThreadFeatureEnabled)();
        const statusValues = await getStatusData("store");
        // updating column properties

        let permissionCheckToDisable = !!canTakeActionOnModules(
          INVENTORY_SUBMODULES_NAMES.INVENTORY_STORE_STATUS,
          "edit"
        );
        let areStatusGrouped = false;
        cols = cols.map((item) => {
          if (item.column_name === "status") {
            item.showFilter = true;
            item.options = getListOptions(statusValues);
          }
          if (item.type === "datetime") {
            item.disablePast = false;
            // item.shouldDisableDate = setDisabledDates; //commenting this as per signet's requirement to select the historic dates as well
          }

          if (item.extra?.is_grouping_key) {
            areStatusGrouped = true;
            item.cellRenderer = "agGroupCellRenderer";
            item.rowGroup = true;
          }

          return item;
        });
        setIsMultipleStatus(areStatusGrouped);
        // adding custom renderer to aggregate status and and display date field in only sub rows
        cols = cols.map((item) => {
          if (item.column_name === "status") {
            item.disabled = !permissionCheckToDisable;
            item.cellRenderer = (params, extraProps) => {
              if (params.node.level === 0) {
                if (!areStatusGrouped && params.data.status_obj) {
                  if (permissionCheckToDisable) {
                    return (
                      <CellRenderers
                        cellData={params}
                        column={item}
                        extraProps={extraProps}
                        actions={null}
                      ></CellRenderers>
                    );
                  } else {
                    const value = params.data[item.column_name];
                    return value ? value : "-";
                  }
                } else {
                  const valueSet = params.data.status_obj
                    ? uniq(
                        params.data.status_obj.map((value) =>
                          capitalize(value.status)
                        )
                      )
                    : [];
                  return multiValueAggregate(valueSet);
                }
              } else {
                return (
                  <CellRenderers
                    cellData={params}
                    column={item}
                    extraProps={extraProps}
                    actions={null}
                  ></CellRenderers>
                );
              }
            };
          } else if (item.column_name === "store_size") {
            item.cellRenderer = (params, extraProps) => {
              return params.node.level === 0 ? params.data.store_size : "";
            };
            return item;
          } else if (item.type === "datetime") {
            item.disabled = !permissionCheckToDisable;
            item.cellRenderer = (params, extraProps) => {
              if (params.node.level !== 0) {
                return (
                  <CellRenderers
                    cellData={params}
                    column={item}
                    extraProps={extraProps}
                    actions={null}
                  ></CellRenderers>
                );
              } else {
                if (params.colDef.extra?.["show-inactive"]) {
                  return getNextInactiveStatus(
                    params.data.status_obj,
                    params.colDef.column_name
                  );
                } else {
                  return "";
                }
              }
            };
          }
          return item;
        });
        // pushing a column for delete action
        areStatusGrouped &&
          cols.push({
            headerName: "Delete Status",
            minWidth: 150,
            cellRenderer: (params, extraProps) => {
              if (params.node.level !== 0) {
                return (
                  <div>
                    <IconButton
                      variant="text"
                      color="primary"
                      className={classes.actionButton}
                      onClick={() => onDeleteClick(params)}
                      disabled={
                        params?.node?.parent?.data?.checkbox_disabled ||
                        !canTakeActionOnModules(
                          INVENTORY_SUBMODULES_NAMES.INVENTORY_STORE_STATUS,
                          "delete"
                        )
                      }
                      title="Delete"
                      size="large"
                    >
                      <Delete />
                    </IconButton>
                  </div>
                );
              } else {
                return null;
              }
            },
            editable: false,
            colId: "action",
            suppressMenu: true,
            lockPosition: "right",
          });

        const data = await fetchFilterFieldValues(
          "store status",
          props.savedFilterSelection,
          props.screenName,
          [getActiveEntityFilter("store")]
        );

        if (isEmpty(props.filterDashboardConfiguration)) {
          let filterConfigData = [
            {
              filterDashboardData: data,
              isCrossDimensionFilter: false,
              screen_name: props.screenName,
            },
          ];
          if (sessionStorage.getItem("currentApp") === "inventorysmart") {
            filterConfigData[0]["saved_filter_screen_name"] =
              "Inventorysmart Store Status";
          }
          const filterConfig = formattedFilterConfiguration(
            "storeStatusFilterConfiguration",
            filterConfigData,
            "Store Status"
          );
          props.setFilterConfiguration(filterConfig);
        }

        setColumns(cols);
        setFilterData(data);
        setloader(false);

        let showCreateStoreBtnResp = await props.getTenantConfigApplicationLevel(
          3,
          {
            attribute_name: "core_show_create_product_store_dc",
          }
        );

        if (showCreateStoreBtnResp?.data?.data?.[0]?.["attribute_value"]) {
          setShowCreateStoreBtn(
            showCreateStoreBtnResp?.data?.data?.[0]?.["attribute_value"]?.value
          );
        }
        const status = await props.getTenantConfigApplicationLevel(2, {
          attribute_name: "core_show_create_product_store_dc",
        });
        setShowDownloadBtn(Boolean(status?.data?.status));
        setHasEditPermissions(permissionCheckToDisable);
      } catch (error) {
        setloader(false);
      }
    };

    getInitialData();
  }, []);

  const storeStatusManualCallBack = async (manualbody, pageIndex, params) => {
    if (isNull(onFilterDependency.current)) {
      return {
        data: [],
        totalCount: 0,
      }; // returning for server side pagination on ag grid
    }
    setloader(true);
    let body = {
      filters: onFilterDependency.current,
      meta: {
        ...manualbody,
        search: manualbody.search,
        limit: { limit: props.pageSize || 10, page: pageIndex + 1 },
      },
      headers: [],
      selection: {
        data: tableInstance?.current?.api?.checkConfiguration,
        unique_columns: ["store_code"],
      },
    };
    try {
      let response = await getProductStatusData("store", body)();
      response.data.data = response.data.data.map((item) => {
        item.isDisabled = false;
        item.hasConflict = false;

        if (!isMultipleStatus) {
          if (item.status_obj?.[0]) {
            item = { ...item, ...item.status_obj?.[0] };
          } else {
            item.status = null;
            item.status_end_time = null;
            item.status_start_time = null;
          }
        }

        return item;
      });
      setTotalRowsCount(
        isNaN(Number(response?.data.total)) ? 0 : response?.data.total
      );
      setloader(false);
      return {
        data: response.data.data,
        totalCount: response.data.total,
      }; // returning for server side pagination on ag grid
    } catch (err) {
      setloader(false);
      props.handleErrorMessage(err);
    }
  };

  // set all, on apply action
  const setAllChanges = async (formattedAttributes) => {
    let setAllBody = {
      attributes: formattedAttributes,
      conflict_resolution: resolutionType,
      codes: {
        filters: onFilterDependency.current,
        meta: {
          range: [],
          sort: [],
          search: [],
        },
        headers: [],
        selection: {
          data: tableInstance?.current?.api?.checkConfiguration,
          unique_columns: ["store_code"],
        },
      },
    };
    toggleSetAll(false);
    // patch api call for set all action
    await onConfirm(setAllBody, true);
  };

  const formatSetAllData = (input, fieldRowId) => {
    let setAllOutput = [];
    for (let i = 0; i <= fieldRowId; i++) {
      const str = "_" + i;

      if (input["status" + str]) {
        const row = {
          attribute_name: "status",
          attribute_value: input["status" + str],
          start_time:
            input["status_start_time" + str] &&
            input["status_start_time" + str] !== "Invalid date"
              ? input["status_start_time" + str]
              : SKU_STORE_STATUS_START_DATE,
          end_time:
            input["status_end_time" + str] &&
            input["status_end_time" + str] !== "Invalid date"
              ? input["status_end_time" + str]
              : END_DATE,
        };
        if (!dateValidation(row.start_time, row.end_time)) {
          displaySnackMessages(
            "To date must be greater than from date",
            "error"
          );
          throw Error("Date is not correct");
        }
        setAllOutput.push(row);
      }
    }

    let inputList = setAllOutput.map((item) => {
      return {
        start_time: item.start_time,
        end_time: item.end_time,
      };
    });

    // checking if conflict exists in date ranges
    const hasConflict = isDateRangeConflict(inputList, "YYYY-MM-DD", "[]");
    if (hasConflict) {
      displayConflictError();
    }

    return setAllOutput;
  };

  const saveRequest = () => {
    // if (!isValidDateInputs) {
    //   displaySnackMessages("Please enter valid dates.", "error");
    //   return;
    // }
    if (setAllData.length) {
      setShowModal(true);
    } else {
      displaySnackMessages("There is no change to save.", "warning");
    }
  };

  const displayConflictError = () => {
    displaySnackMessages(
      "Please resolve overlapping date ranges or conflicts",
      "error"
    );
    throw Error("Date is overlapping");
  };

  // checks if conflict error is present in tabledata after edit/delete
  const isDateRangeConflictInData = () => {
    let hasConflictFlag = false;
    tableInstance.current.api.getRenderedNodes().forEach((item) => {
      if (item.data.hasConflict) {
        hasConflictFlag = true;
      }
    });
    if (hasConflictFlag) {
      displayConflictError();
    }
  };

  const onConfirm = async (payloadData, isSetAllAction = false) => {
    setloader(true);
    try {
      const useItineraryValue = psmItineraryConfig?.[0]?.attribute_value?.use_itinerary;
      const isShipMode = useItineraryValue === true;
      let alertMsg = isShipMode 
        ? "Ship updation request has been queued successfully. You will be notified once completed."
        : "Store updation request has been queued successfully. You will be notified once completed.";
      setShowModal(false);
      // set all patch api call
      isSetAllAction && (await setStatusData("store", payloadData)());
      // edit/delete patch api call
      if (!isSetAllAction) {
        // check if conflicts present in data
        isDateRangeConflictInData();
        await setUpdateStatusData("store", "store", { body: payloadData })();
        
        alertMsg = isShipMode ? "Ship updated successfully" : "Store updated successfully";
      } else {
        tableInstance.current?.api?.setCheckConfiguration([]);
        tableInstance.current?.api?.setPrevAction(null);
      }
      setFlag_edit(false);
      tableInstance.current.api?.deselectAll(true);
      tableInstance.current?.api?.setFilterModel(null);
      updateSetAllData([]);
      setloader(false);
      tableInstance.current.api?.refreshServerSideStore({ purge: false });
      displaySnackMessages(alertMsg, "success");
    } catch (err) {
      const errMsg = !isEmpty(err.response?.data.message)
        ? err.response.data.message
        : "Unsuccessfull at updating store status attributes";
      displaySnackMessages(errMsg, "error");
      setloader(false);
    }
  };

  const createNewStoreFunc = async (dataObj, newSetAllData) => {
    setloader(true);
    try {
      let body = [];
      let setAllBody = {
        attributes: [
          {
            attribute_name: "status",
            attribute_value: newSetAllData.status,
            start_time: moment(newSetAllData.start_time).format("YYYY-MM-DD"),
            end_time: moment(newSetAllData.end_time).format("YYYY-MM-DD"),
          },
        ],
        codes: [dataObj.store_code],
      };
      Object.keys(dataObj).forEach((key) => {
        if (key !== "store_code" && dataObj[key]) {
          let obj = {
            attribute_name: key,
            attribute_value: dataObj[key],
          };
          body.push(obj);
        }
      });
      let reqBody = {
        attributes: body,
        code: dataObj.store_code,
      };
      if (
        dateValidation(
          setAllBody.attributes[0].start_time,
          setAllBody.attributes[0].end_time
        )
      ) {
        throw Error("Date is not correct");
      }
      if (dataObj.store_code) {
        const updateResp = await createNewProduct("store", reqBody)();
        const successMsg = (updateResp.data?.status || updateResp.data?.show_message) ? updateResp?.data?.message : "Store Data Updated Successfully";

        if (Object.keys(newSetAllData).length > 0)
          await setStatusData("store", setAllBody)();
        displaySnackMessages(successMsg, "success");
        // onFilter();
        return true;
      } else {
        displaySnackMessages("Please enter Store Id", "error");
      }
      setloader(false);
    } catch (err) {
      props.handleErrorMessage(err)
      setloader(false);
    }
  };

  const handleConfirmBox = () => {
    tableInstance.current.api?.refreshServerSideStore({ purge: false });
    tableInstance.current.api?.deselectAll(true);
    updateSetAllData([]);
    setFlag_edit(false);
    showConfirmBox(false);
  };

  const createStoreFormFields = () => {
    let formData = filterData
      .filter((item) => item.column_name !== "status")
      .map((item) => {
        if (item.column_name === "special_classification") {
          return {
            label: item.label,
            field_type: "list",
            filter_type: item.type,
            options: item.initialData,
            required: false,
            accessor: item.column_name,
          };
        } else {
          return {
            label: item.label,
            field_type: "list",
            filter_type: item.type,
            options: item.initialData,
            required: true,
            accessor: item.column_name,
          };
        }
      });
    let Additionalfields = [
      {
        label: "Store ID",
        field_type: "TextField",
        required: true,
        accessor: "store_code",
      },
      {
        label: "Store Name",
        field_type: "TextField",
        required: true,
        accessor: "store_name",
      },
    ];
    return [...formData, ...Additionalfields];
  };

  const onSelectionChanged = (event) => {
    // fetch all selected rows
    let selections = event.api.getSelectedRows().map((item) => {
      return {
        store_code: item.store_code,
      };
    });
    setSelectedRowsIDs(selections);
  };

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  // function is called on delete action in table
  const onDeleteClick = (event) => {
    const statusId = event.data.time_attr_id;
    const parentRowNode = event.node.parent;
    // removing deleted status
    const updated_status_obj = parentRowNode.data.status_obj.filter(
      (item) => item.time_attr_id != statusId
    );
    // updating parent row sub rows data
    const updated_data = {
      ...parentRowNode.data,
      status_obj: isEmpty(updated_status_obj) ? null : updated_status_obj,
    };
    parentRowNode.setData(updated_data);
    conflictResolutionCheck(parentRowNode);
    const setAllObject = formatAttribute(
      parentRowNode.id,
      event,
      "status",
      "delete"
    );
    setDeleteActionObj(setAllObject);
    setFlag_edit(true);
    // table actions
    // tableInstance.current.api.collapseAll();
    parentRowNode.setExpanded(false);
    tableInstance.current.api.flashCells({ rowNodes: [parentRowNode] });
    if (updated_data.status_obj) parentRowNode.setExpanded(true);
  };

  /**
   *
   * @param {Object} parentRowNode
   * @param {Object} params
   * @returns
   */
  const conflictResolutionCheck = (parentRowNode, params) => {
    const currentDateRangeConflict = parentRowNode.data.hasConflict;
    const statusObj = cloneDeep(parentRowNode.data.status_obj);
    if (statusObj) {
      if (
        (!params || !moment.isMoment(params.newValue)) &&
        !currentDateRangeConflict
      ) {
        return;
      }
      // check if date validation is passing. from date should be lesser than to date
      const hasConflict = hasConflicts(
        currentDateRangeConflict,
        statusObj,
        params
      );
      parentRowNode.setData({
        ...parentRowNode.data,
        hasConflict: hasConflict,
      });
    } else {
      parentRowNode.setData({ ...parentRowNode.data, hasConflict: false });
    }
  };

  /**
   * @func
   * @desc Check for different conflict cases withtin the date range.
   * @param {Boolean} currentDateRangeConflict
   * @param {Object} statusObj
   * @param {Object} params
   * @return {Boolean}
   */
  const hasConflicts = (currentDateRangeConflict, statusObj, params) => {
    const isNewDateValid = isDateFieldChangeValid(params);
    const newDateRangeConflict = checkConflictInAttributeType(
      statusObj,
      "status"
    );
    const hasDateRangeInValid = checkDateValidationInAttributeType(
      statusObj,
      "status"
    );
    const isValidDate = isValidDates(statusObj, "status");
    let hasConflict =
      !isNewDateValid || Boolean(!isValidDate || hasDateRangeInValid);
    if (hasConflict && isNewDateValid && isValidDate) {
      displaySnackMessages("To date must be greater than from date", "error");
    }
    // check if date validation is passing for current row change
    if (
      currentDateRangeConflict &&
      !newDateRangeConflict &&
      (!hasConflict || !hasDateRangeInValid)
    ) {
      displaySnackMessages(
        "Successfully resolved overlapping date ranges and conflicts",
        "success"
      );
      return false;
    } else if (newDateRangeConflict && !hasDateRangeInValid) {
      // check if date validation is passing and no overlaps for current row change
      displaySnackMessages(
        "Please resolve overlapping date ranges or To date must be greater than from date",
        "error"
      );
      return true;
    }
    return hasConflict;
  };

  // function is called on edit action in table
  const onCellValueChanged = (params) => {
    const parentRowNode = isMultipleStatus ? params.node.parent : params.node;
    let isInputValueSame = false;

    if (moment.isMoment(params.newValue)) {
      isInputValueSame = moment(params.newValue).isSame(params.oldValue);
    } else {
      isInputValueSame = isEqual(params.oldValue, params.newValue);
    }

    if (!isInputValueSame) {
      isMultipleStatus && conflictResolutionCheck(parentRowNode, params);
      const setAllObject = formatAttribute(
        parentRowNode.id,
        params,
        "status",
        "edit"
      );
      setEditActionObj(setAllObject);
      // table actions
      tableInstance.current.api.refreshCells({
        force: true,
        suppressFlash: false,
        rowNodes: [parentRowNode],
      });
      setFlag_edit(true);
      tableInstance.current.api.flashCells({ rowNodes: [parentRowNode] });
    }
  };

  // row highlighting based on conflict present in status
  const getRowStyle = (params) => {
    if (params.node.level === 0 && params.node.data) {
      if (params.node.data.hasConflict) return { background: colours.wispPink };
    }
    return null;
  };

  const canTakeActionOnModules = (subModuleName, action) => {
    return isActionAllowedOnSubModule(
      props?.inventorysmartModulesPermission,
      props?.module,
      subModuleName,
      action
    );
  };

  const getCustomDependencyFilter = (initialDependency) => {
    return addCustomStatusDependency(initialDependency, "store");
  };

  /**
   * @function
   * @description Prepare payload and request table data download which will be updated via notification
   */
  const downloadData = async () => {
    const origin = window.location.origin;
    try {
      const primaryColsMap = cloneDeep(
        tableInstance.current.columnApi.columnModel.primaryColumnsMap
      );
      const filterBody = tableInstance.current.api.gridOptionsWrapper
        .gridOptions.filterBody || { search: [], range: [], sort: [] };
      // Function to flatten columns and extract subheaders
      const flattenColumns = (columns) => {
        const flattened = [];
        columns.forEach((item) => {
          if (item.sub_headers && item.sub_headers.length > 0) {
            // If column has subheaders, add only the subheaders (children)
            item.sub_headers.forEach((subHeader) => {
              if (
                subHeader.column_name &&
                primaryColsMap[subHeader.column_name]?.visible
              ) {
                flattened.push({
                  label: subHeader.label,
                  column_name: subHeader.column_name,
                });
              }
            });
          } else {
            // If no subheaders, add the column itself
            if (
              item.column_name &&
              primaryColsMap[item.column_name]?.visible
            ) {
              flattened.push({
                label: item.label,
                column_name: item.column_name,
              });
            }
          }
        });
        return flattened;
      };

      const table_columns = flattenColumns(columns || []);
      const body = {
        table_payload: {
          total_count: Number(totalRowsCount),
          columns: table_columns,
          filters: onFilterDependency.current,
          meta: {
            ...filterBody,
            limit: { limit: -1, page: 0 },
          },
          headers: [],
          selection: {
            data: tableInstance?.current?.api?.checkConfiguration,
            unique_columns: ["store_code"],
          },
        },
        table_api: `${origin}/api/v2/master/dimension-table/store`,
      };
      let response = await downloadTableData(body);
      if (response.data.status) {
        displaySnackMessages(
          "Please wait for download notification to be received shortly.",
          "success"
        );
      } else throw response.data.status;
    } catch (error) {
      props.handleErrorMessage(error);
      displaySnackMessages("Something went wrong.", "error");
    }
  };

  const renderContent = () => {
    return (
      <div style={{marginTop:IS_OVERRIDEN_CORE_BUTTON_PLACEMENT}}>
      <CoreComponentScreen
        // pageLabel={"Store Status"}
        IscoreButtonWidth = {IS_OVERRIDEN_CORE_BUTTON_WIDTH}
        showPageRoute={props.hideBreadCrumbs ? false : true}
        showPageHeader={false}
        // Filter dashboard props
        showFilterDashboard={true}
        filterConfigKey={"storeStatusFilterConfiguration"}
        onApplyFilter={onFilterDashboardClick}
        contained={true}
        customDependencyValue={getCustomDependencyFilter}
        screenName={"store status"}
        autoHideFilterButton={true}
      >
        <div data-testid="filterContainer">
          <Prompt when={flag_edit} message={""} />
          {confirmBox && (
            <ConfirmBox
              onClose={() => {
                showConfirmBox(false);
              }}
              onConfirm={() => handleConfirmBox()}
            />
          )}
          <IaPrompt
            isOpen={showModal}
            title="Confirm Changes"
            children="Are you sure to save all your changes?"
            infoList={[]}
            primaryButtonLabel="Update"
            secondaryButtonLabel="Close"
            onPrimaryButtonClick={() => {
              onConfirm(setAllData);
              setShowModal(false);
            }}
            onSecondaryButtonClick={() => {
              setShowModal(false);
            }}
          />
          {createStore && (
            <CreateStoreModal
              fields={createStoreFormFields()}
              onApply={createNewStoreFunc}
              toggleError={(errMsg) => {
                displaySnackMessages(errMsg, "error");
              }}
              handleModalClose={() => showCreateStore(false)}
            ></CreateStoreModal>
          )}
          <Loader loader={showloader}>
            <div data-testid="resultContainer">
              {setAll && (
                <SetAllMultiRow
                  updateDefaultValue={false}
                  setDefaultDateFieldValues={true}
                  onApply={setAllChanges}
                  handleModalClose={() => toggleSetAll(false)}
                  formatMultiRowData={formatSetAllData}
                  fieldList={editableFieldsList}
                  additionalContainer={
                    isMultipleStatus && (
                      <ConflictResolutionModal
                        resolutionType={resolutionType}
                        setResolutionType={setResolutionType}
                      />
                    )
                  }
                  isMultipleStatus={isMultipleStatus}
                  size = "large"
                  alignFields = "end"
                />
              )}
              {columns.length > 0 && (
                //SERVER SIDE
                <AgGridComponent
                  columns={columns}
                  tableHeader={"Filtered Store"}
                  selectAllHeaderComponent={hasEditPermissions}
                  onSelectionChanged={onSelectionChanged}
                  sizeColumnsToFitFlag
                  onGridChanged
                  manualCallBack={(body, pageIndex, params) =>
                    storeStatusManualCallBack(body, pageIndex, params)
                  }
                  topRightOptions={
                    <>
                      {selectedRowsIDs?.length > 0 && hasEditPermissions && (
                        <Button
                          variant="tertiary"
                          size = "large"
                          id="storeSetAllBtn"
                          onClick={async () => {
                            if (setAllData.length) {
                              showConfirmBox(true);
                            } else if (selectedRowsIDs.length > 0) {
                              toggleSetAll(true);
                            } else {
                              displaySnackMessages(
                                "Please select atleast one Store",
                                "error"
                              );
                            }
                          }}
                          disabled={
                            !props.isSuperUser ||
                            !canTakeActionOnModules(
                              INVENTORY_SUBMODULES_NAMES.INVENTORY_STORE_STATUS,
                              "edit"
                            )
                          }
                        >
                          Set All
                        </Button>
                      )}
                      {hasEditPermissions && <Button
                        variant="tertiary"
                        id="storeCancelBtn"
                        onClick={() => {
                          if (setAllData.length) {
                            showConfirmBox(true);
                          } else {
                            tableInstance.current?.api?.deselectAll(true);
                            displaySnackMessages("No changes are made", "warning");
                          }
                        }}
                      >
                        Cancel
                      </Button>}
                      {hasEditPermissions && <Button
                        variant="contained"
                        color="primary"
                        id="storeSaveBtn"
                        onClick={() => {
                          saveRequest();
                        }}
                        disabled={
                          !canTakeActionOnModules(
                            INVENTORY_SUBMODULES_NAMES.INVENTORY_STORE_STATUS,
                            "edit"
                          )
                        }
                      >
                        Save
                      </Button>}
                    </>
                  }
                  showDownloadButton = {showDownloadBtn && totalRowsCount}
                  onDownloadButtonClick = {() => downloadData()}
                  rowModelType="serverSide"
                  serverSideStoreType="partial"
                  cacheBlockSize={props.pageSize || 10} 
                  paginationPageSize={props.pageSize}
                  uniqueRowId={"store_code"}
                  childKey={"status_obj"}
                  hideChildSelection={hasEditPermissions}
                  loadTableInstance={setNewTableInstance}
                  showSetAll={false}
                  purgeClosedRowNodes={true}
                  suppressAggFuncInHeader={true}
                  //disabledRowCheckbox={!props.isSuperUser}
                  suppressClickEdit={true}
                  onCellValueChanged={onCellValueChanged}
                  getRowStyle={getRowStyle}
                  groupDisplayType={"custom"}
                  treeData={true}
                  onRowSelected
                  tableName={TABLE_NAME}
                  requestUrl={"master/dimension-table/store"}
                  appliedFilters={onFilterDependency.current}
                  isChatEnabled={isThreadFeatureEnabled}
                  enableCellComment={false}
                />
              )}
            </div>
          </Loader>
        </div>
      </CoreComponentScreen>
      </div>
    );
  };

  return <React.Fragment>{renderContent()}</React.Fragment>;
}
const mapStateToProps = (state) => {
  return {
    selectedFilters: state.filterReducer.selectedFilters["StoreStatus"],
    isSuperUser: true,
    userAccessList:
      state.tenantUserRoleMgmtReducer.userRoleManagementReducer.userAccessList,
    filterDashboardConfiguration:
      state.filterReducer.filterDashboardConfiguration[
        "storeStatusFilterConfiguration"
      ],
    inventorysmartModulesPermission:
      state.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartModulesPermission,
    savedFilterSelection: state.filterReducer.savedFilterSelection,
    pageSize: state.inventorysmartReducer?.inventorySmartCommonService?.inventorysmartScreenConfig?.inventorysmart_page_count,
    inventorysmartScreenConfig:
      state.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig,
    commentingConfig: state?.tenantConfigReducer?.commentingConfig,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    setProductStatusData: (data) => dispatch(setProductStatusData(data)),
    addSnack: (snack) => dispatch(addSnack(snack)),
    getTenantConfigApplicationLevel: (dynamicRoute, queryParam) =>
      dispatch(getTenantConfigApplicationLevel(dynamicRoute, queryParam)),
    setFilterConfiguration: (filterConfiguration) =>
      dispatch(setFilterConfiguration(filterConfiguration)),
    resetTableRecentChanges: () => dispatch(resetTableRecentChanges()),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(StoreFilter);
