import AddIcon from "@mui/icons-material/Add";
import Delete from "@mui/icons-material/Delete";
import { IconButton } from "@mui/material";
import { Button, Prompt as IaPrompt, Tooltip, useTranslation } from "impact-ui-v3";
import makeStyles from "@mui/styles/makeStyles";
import colours from "core/Styles/colours";
import globalStyles from "core/Styles/globalStyles";
import AgGridComponent from "core/Utils/agGrid";
import CellRenderers from "core/Utils/agGrid/cellRenderer";
import SetAllMultiRow from "core/Utils/agGrid/setall-multirow-form";
import {
  formatDateRangeLabel,
  validateStatusDateRanges,
} from "core/Utils/functions/helpers/validation-helpers";
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
import Loader from "core/Utils/Loader/loader";
import ConfirmBox from "core/Utils/confirmPrompt/confirmPopup";
import {
  createNewProduct,
  getProductStatusData,
  getStatusData,
  setProductStatusData,
  setStatusData,
  setUpdateStatusData,
  downloadTableData,
} from "modules/inventorysmart/services-inventorysmart/Product-Store-Status/productStoreStatusActions";
import { getPSMItineraryConfig } from "core/actions/tenantConfigActions";
import {
  getColumnsAg,
  resetTableRecentChanges,
} from "core/actions/tableColumnActions";
import { END_DATE, SKU_STORE_STATUS_START_DATE } from "config/constants";
import { alignStoreCodeColumnRight } from "modules/inventorysmart/utils-inventorysmart/utilityFunctions";
import ConflictResolutionModal from "./components/conflict-resolution-modal";
import CreateStoreModal from "./components/create-store";
import ExcludeDateRangePanel from "../Common/components/date-range/exclude-date-range-panel";
import StatusSetAllPanel from "../Common/components/date-range/status-set-all-panel";
import "./index.scss";
import "../Common/styles/storeCodeColumn.scss";
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
import {
  IS_OVERRIDEN_CORE_BUTTON_WIDTH,
  IS_OVERRIDEN_CORE_BUTTON_PLACEMENT,
} from "core/constants";

const useStyles = makeStyles((theme) => ({
  actionButton: {
    padding: "0px",
  },
}));

const TABLE_NAME = "store_status";

/**
 * Status columns replaced by the single Date range column. They are hidden
 * rather than removed so the existing in-table edit, conflict-resolution and
 * delete pipeline keyed on them keeps working unchanged.
 */
const DATE_RANGE_SOURCE_COLUMNS = [
  "status",
  "status_start_time",
  "status_end_time",
];

// Set All only creates active periods; the ranges themselves carry the meaning.
const SET_ALL_STATUS_VALUE = "active";

// Height an expanded child row needs so the inline date pickers are not cropped.
const EXPANDED_ROW_HEIGHT = 60;

function StoreFilter(props) {
  const { t } = useTranslation();
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
  const [excludeRangeNode, setExcludeRangeNode] = useState(null);
  const onFilterDependency = useRef(null);
  const tableInstance = useRef({});
  const classes = useStyles();
  const globalClasses = globalStyles();

  const isThreadFeatureEnabled = Boolean(
    props?.commentingConfig?.inventory_smart_comment_and_thread
      ?.isThreadFeatureEnabled
  );

  // Feature flag for the new date range column with exclusions
  const isStatusDateRangeEnabled = Boolean(
    props?.inventorysmartScreenConfig?.status_date_range_enabled
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
        getPSMItineraryConfig()
          .then((config) => {
            setPsmItineraryConfig(config || {});
          })
          .catch((error) => {
            console.error("Error fetching PSM Itinerary Config:", error);
          });

        let cols = await getColumnsAg(
          `table_name=${TABLE_NAME}`,
          {},
          {},
          false,
          false,
          true,
          isThreadFeatureEnabled
        )();
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
          // Only hide date columns when status_date_range_enabled is true
          if (isStatusDateRangeEnabled && DATE_RANGE_SOURCE_COLUMNS.includes(item.column_name)) {
            // is_hidden is the flag the grid honours - hideHiddenCols() copies it
            // over `hide` on every render, so setting `hide` alone is discarded.
            item.is_hidden = true;
            item.hide = true;
            item.suppressColumnsToolPanel = true;
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

        // Single status date range column: summarises the periods on collapsed
        // rows and exposes the from/to pickers on the expanded child rows.
        if (isStatusDateRangeEnabled) {
          const statusDateRangeColumn = {
            headerName: "Date range",
            column_name: "status_date_range",
            colId: "status_date_range",
            type: "status_date_range",
            // Figma editable cell width: two 135px+ fields, gaps and the Exclude link
            minWidth: 425,
            editable: false,
            suppressMenu: true,
            is_hidden: false,
            extra: {
              rangeKey: "status_obj",
              rangeStartKey: "status_start_time",
              rangeEndKey: "status_end_time",
            },
          };
          statusDateRangeColumn.cellRenderer = (params, extraProps) => (
            <CellRenderers
              cellData={params}
              column={statusDateRangeColumn}
              extraProps={extraProps}
              actions={null}
            ></CellRenderers>
          );
          // Slot it where the status columns used to sit, otherwise it is appended
          // past the right edge of the table and needs horizontal scrolling.
          const firstStatusColumnIndex = cols.findIndex((item) =>
            DATE_RANGE_SOURCE_COLUMNS.includes(item.column_name)
          );
          cols.splice(
            firstStatusColumnIndex === -1 ? cols.length : firstStatusColumnIndex,
            0,
            statusDateRangeColumn
          );
        }

        // pushing a column for add/delete actions
        if (areStatusGrouped) {
          if (isStatusDateRangeEnabled) {
            // New flow: Actions column with Add (parent) and Delete (child) buttons
            cols.push({
              headerName: "Actions",
              minWidth: 100,
              cellRenderer: (params, extraProps) => {
                const isParentRow = params.node.level === 0;
                const hasStatusObj = params.data?.status_obj && params.data.status_obj.length > 0;
                
                // Parent row - show Add button
                if (isParentRow && hasStatusObj) {
                  return (
                    <div>
                      <Tooltip title="Add Date Range" orientation="top">
                        <IconButton
                          onClick={() => onAddClick(params)}
                          disabled={
                            params?.data?.checkbox_disabled ||
                            !canTakeActionOnModules(
                              INVENTORY_SUBMODULES_NAMES.INVENTORY_STORE_STATUS,
                              "edit"
                            )
                          }
                          size="small"
                          className={classes.actionButton}
                        >
                          <AddIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </div>
                  );
                }
                // Child row - show Delete button
                if (!isParentRow || params.data.status) {
                  return (
                    <div>
                      <Tooltip title="Delete Date Range" orientation="top">
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
                          size="large"
                        >
                          <Delete />
                        </IconButton>
                      </Tooltip>
                    </div>
                  );
                }
                return null;
              },
              editable: false,
              colId: "action",
              suppressMenu: true,
              lockPosition: "right",
            });
          } else {
            // Old flow: Delete Status column (only for child rows)
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
                        title={t("inventorysmart.delete")}
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
          }
        }

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

        setColumns(cols.map(alignStoreCodeColumnRight));
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
    if (checkConflictInAttributeType(inputList)) {
      displaySnackMessages("Date ranges are conflicting", "error");
      throw Error("Date ranges are conflicting");
    }
    return setAllOutput;
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

  const saveRequest = () => {
    if (!setAllData.length) {
      displaySnackMessages(
        t("inventorysmart.thereIsNoChangeToSave"),
        "warning"
      );
      return;
    }

    // Blocks the save before the confirmation prompt is shown
    const validationError = getDateRangeValidationError();
    if (validationError) {
      displaySnackMessages(validationError, "error");
      return;
    }

    setShowModal(true);
  };

  const displayConflictError = () => {
    displaySnackMessages(
      t("inventorysmart.pleaseResolveOverlappingDateRangesOrConflicts"),
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
      const useItineraryValue =
        psmItineraryConfig?.[0]?.attribute_value?.use_itinerary;
      const isShipMode = useItineraryValue === true;
      let alertMsg = isShipMode
        ? t("inventorysmart.shipUpdationRequestQueuedSuccessfully")
        : t("inventorysmart.storeUpdationRequestQueuedSuccessfully");
      setShowModal(false);
      // set all patch api call
      isSetAllAction && (await setStatusData("store", payloadData)());
      // edit/delete patch api call
      if (!isSetAllAction) {
        // check if conflicts present in data
        isDateRangeConflictInData();
        await setUpdateStatusData("store", "store", { body: payloadData })();

        alertMsg = isShipMode
          ? t("inventorysmart.shipUpdatedSuccessfully")
          : t("inventorysmart.storeUpdatedSuccessfully");
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
        : t("inventorysmart.unsuccessfulAtUpdatingStoreStatusAttributes");
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
        const successMsg =
          updateResp.data?.status || updateResp.data?.show_message
            ? updateResp?.data?.message
            : "Store Data Updated Successfully";

        if (Object.keys(newSetAllData).length > 0)
          await setStatusData("store", setAllBody)();
        displaySnackMessages(successMsg, "success");
        // onFilter();
        return true;
      } else {
        displaySnackMessages(t("inventorysmart.pleaseEnterStoreId"), "error");
      }
      setloader(false);
    } catch (err) {
      props.handleErrorMessage(err);
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

  // function is called on add action in table to add a new status row
  const onAddClick = (params) => {
    const parentRowNode = params.node;
    const attributeType = "status";

    // Validate that all existing rows have dates before adding new
    const existingStatusObj = parentRowNode.data?.status_obj || [];
    const hasIncompleteRows = existingStatusObj.some(
      (item) => !item.status_start_time || !item.status_end_time
    );

    if (hasIncompleteRows) {
      displaySnackMessages(
        "Please provide start date and end date before adding new",
        "error"
      );
      return;
    }

    // Find the latest end date from existing ranges to calculate non-overlapping start date
    let newStartDate = moment().format("YYYY-MM-DD");
    if (existingStatusObj.length > 0) {
      const latestEndDate = existingStatusObj.reduce((latest, item) => {
        const endDate = moment(item.status_end_time);
        return endDate.isAfter(latest) ? endDate : latest;
      }, moment("1900-01-01"));
      
      // Start the new range one day after the latest end date
      newStartDate = latestEndDate.add(1, "day").format("YYYY-MM-DD");
    }

    // Create a new status row with non-overlapping dates
    const newStatusRow = {
      status: "active",
      status_start_time: newStartDate,
      status_end_time: END_DATE,
      time_attr_id: `new_${Date.now()}`, // temporary ID for new rows
      is_newly_added: true,
    };

    // Add the new row to status_obj
    const updated_status_obj = [...existingStatusObj, newStatusRow];

    // Update parent row data
    const updated_data = {
      ...parentRowNode.data,
      [`${attributeType}_obj`]: updated_status_obj,
      hasConflict: false, // Reset conflict flag since we're adding non-overlapping dates
    };

    parentRowNode.setData(updated_data);

    // Track the new row for saving - don't include time_attr_id for new rows
    // The backend will generate a new ID when creating the record
    // Note: Backend only accepts "edit" or "delete" actions, not "add"
    const setAllObject = {
      attributes: [
        {
          attribute_name: attributeType,
          attribute_value: newStatusRow.status,
          start_time: newStatusRow.status_start_time,
          end_time: newStatusRow.status_end_time,
          action: "edit",
        },
      ],
      code: parentRowNode.id,
    };
    setEditActionObj(setAllObject);

    // Check for conflicts after adding the new row
    conflictResolutionCheck(parentRowNode);

    // Expand the row to show the new child
    parentRowNode.setExpanded(true);

    // Refresh the grid to show the new row
    tableInstance.current.api.refreshCells({
      force: true,
      suppressFlash: false,
      rowNodes: [parentRowNode],
    });

    setFlag_edit(true);
    tableInstance.current.api.flashCells({ rowNodes: [parentRowNode] });
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
    
    // Rebuild status_obj from child nodes to get the latest edited values
    let statusObj = cloneDeep(parentRowNode.data.status_obj);
    if (parentRowNode.childrenAfterGroup && parentRowNode.childrenAfterGroup.length > 0) {
      statusObj = parentRowNode.childrenAfterGroup.map((childNode) => ({
        status: childNode.data?.status,
        status_start_time: childNode.data?.status_start_time,
        status_end_time: childNode.data?.status_end_time,
        time_attr_id: childNode.data?.time_attr_id,
        exclusions: childNode.data?.exclusions,
      }));
      // Update parent's status_obj with the latest child data
      parentRowNode.setData({
        ...parentRowNode.data,
        status_obj: statusObj,
      });
    }
    
    if (statusObj) {
      // check if date validation is passing. from date should be lesser than to date
      const hasConflict = hasConflicts(
        currentDateRangeConflict,
        statusObj,
        params
      );
      parentRowNode.setData({
        ...parentRowNode.data,
        status_obj: statusObj,
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
    const isNewDateValid = params ? isDateFieldChangeValid(params) : true;
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
      !isNewDateValid || Boolean(!isValidDate || hasDateRangeInValid) || newDateRangeConflict;
    
    // When status_date_range_enabled is false, show snackbar messages (old behavior)
    if (!isStatusDateRangeEnabled) {
      if (hasConflict && isNewDateValid && isValidDate) {
        displaySnackMessages(
          t("inventorysmart.toDateMustBeGreaterThanFromDate"),
          "error"
        );
      }
      if (
        currentDateRangeConflict &&
        !newDateRangeConflict &&
        (!hasConflict || !hasDateRangeInValid)
      ) {
        displaySnackMessages(
          t("inventorysmart.successfullyResolvedOverlappingDateRangesAndConflicts"),
          "success"
        );
        return false;
      } else if (newDateRangeConflict && !hasDateRangeInValid) {
        displaySnackMessages(
          t("inventorysmart.pleaseResolveOverlappingDateRangesOrToDateMustBeGreaterThanFromDate"),
          "error"
        );
        return true;
      }
      return hasConflict;
    }
    
    // When status_date_range_enabled is true, no snackbar messages during inline editing
    // Visual feedback (row highlighting) will indicate conflicts
    // Error messages will be shown only when user tries to save
    if (
      currentDateRangeConflict &&
      !newDateRangeConflict &&
      (!hasConflict || !hasDateRangeInValid)
    ) {
      return false;
    } else if (newDateRangeConflict && !hasDateRangeInValid) {
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
      // Sync child row data back to parent's status_obj to persist changes on collapse/expand
      if (isMultipleStatus && parentRowNode && params.node.level !== 0) {
        const childTimeAttrId = params.data?.time_attr_id;
        if (childTimeAttrId && parentRowNode.data?.status_obj) {
          const updatedStatusObj = parentRowNode.data.status_obj.map((item) => {
            if (item.time_attr_id === childTimeAttrId) {
              return {
                ...item,
                ...params.data,
              };
            }
            return item;
          });
          parentRowNode.setData({
            ...parentRowNode.data,
            status_obj: updatedStatusObj,
          });
        }
      }
      
      isMultipleStatus && conflictResolutionCheck(parentRowNode, params);
      
      // Check if this is a newly added row (has temporary time_attr_id starting with "new_")
      const isNewlyAddedRow = params.data?.time_attr_id?.toString().startsWith("new_") || params.data?.is_newly_added;
      
      // Note: Backend only accepts "edit" or "delete" actions, not "add"
      const setAllObject = formatAttribute(
        parentRowNode.id,
        params,
        "status",
        "edit"
      );
      
      // For newly added rows, don't send the temporary time_attr_id
      if (isNewlyAddedRow && setAllObject.attributes?.[0]) {
        delete setAllObject.attributes[0].time_attr_id;
      }
      
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

  const onDateRangeChange = (node, field, value) => {
    node?.setDataValue(field, value);
  };

  const onExclusionsClick = (node) => setExcludeRangeNode(node);

  /**
   * Child rows host the date pickers and need more vertical room than the
   * content density allows, so they are sized individually on expand.
   */
  const onRowGroupOpened = (params) => {
    const api = params?.api || tableInstance.current?.api;
    if (!api) {
      return;
    }
    let hasResizedRow = false;
    api.forEachNode((node) => {
      if (node.level !== 0 && node.rowHeight !== EXPANDED_ROW_HEIGHT) {
        node.setRowHeight(EXPANDED_ROW_HEIGHT);
        hasResizedRow = true;
      }
    });
    if (hasResizedRow) {
      api.onRowHeightChanged();
    }
  };

  /**
   * Exclusions are carried on the range they belong to, so they are written onto
   * the child row and sent alongside that range's edit payload.
   */
  const onExclusionsApply = (updatedExclusions) => {
    const node = excludeRangeNode;
    if (!node) {
      return;
    }
    const updatedData = { ...node.data, exclusions: updatedExclusions };
    node.setData(updatedData);

    const parentRowNode = isMultipleStatus ? node.parent : node;
    const setAllObject = formatAttribute(
      parentRowNode?.id,
      { data: updatedData },
      "status",
      "edit"
    );
    setEditActionObj(setAllObject);
    setFlag_edit(true);
    tableInstance.current?.api?.refreshCells({
      force: true,
      suppressFlash: false,
      rowNodes: [node, parentRowNode].filter(Boolean),
    });
    setExcludeRangeNode(null);
  };

  /**
   * Applies the date ranges entered in Set All to every selected store. The
   * overlap and containment checks have already run inside the panel, so this
   * only maps each card onto a status attribute.
   */
  const onSetAllRangesApply = async (ranges) => {
    const attributes = (ranges || []).map((range) => ({
      attribute_name: "status",
      attribute_value: SET_ALL_STATUS_VALUE,
      start_time: range.start_time,
      end_time: range.end_time,
      exclusions: range.exclusions,
    }));

    await setAllChanges(attributes);
  };

  /**
   * Runs the three date range checks over every record in the grid, so an edit
   * made in one row is checked against that store's other periods.
   *
   * @returns {String|null} the message to show, or null when everything is valid
   */
  const getDateRangeValidationError = () => {
    if (!tableInstance.current?.api) {
      return null;
    }

    const rowsByRecord = new Map();

    tableInstance.current.api.forEachNode((node) => {
      const data = node?.data;
      // Rows without a complete range are left to the existing field checks
      if (!data?.status_start_time || !data?.status_end_time) {
        return;
      }
      const key = data.store_code;
      if (!rowsByRecord.has(key)) {
        rowsByRecord.set(key, []);
      }
      rowsByRecord.get(key).push(data);
    });

    for (const rows of rowsByRecord.values()) {
      const asRange = (row) => ({
        start_time: row.status_start_time,
        end_time: row.status_end_time,
      });

      for (let index = 0; index < rows.length; index++) {
        const row = rows[index];
        const failure = validateStatusDateRanges({
          range: asRange(row),
          exclusions: row.exclusions || [],
          otherRanges: rows
            .filter((_, position) => position !== index)
            .map(asRange),
        });

        if (!failure) {
          continue;
        }

        const failed = formatDateRangeLabel(
          failure.range,
          props.tenantDateFormat
        );
        const conflicting = formatDateRangeLabel(
          failure.conflict,
          props.tenantDateFormat
        );

        if (failure.type === "rangeOverlap") {
          return `Date range ${failed} overlaps the date range ${conflicting}.`;
        }
        if (failure.type === "excludeOverlap") {
          return `Exclude date range ${failed} overlaps the exclude date range ${conflicting}.`;
        }
        return `Exclude date range ${failed} must stay within the date range ${conflicting}.`;
      }
    }

    return null;
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
            if (item.column_name && primaryColsMap[item.column_name]?.visible) {
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
          t("inventorysmart.pleaseWaitForDownloadNotification"),
          "success"
        );
      } else throw response.data.status;
    } catch (error) {
      props.handleErrorMessage(error);
      displaySnackMessages(t("inventorysmart.somethingWentWrong"), "error");
    }
  };

  const renderContent = () => {
    return (
      <div style={{ marginTop: IS_OVERRIDEN_CORE_BUTTON_PLACEMENT }}>
        <CoreComponentScreen
          // pageLabel={"Store Status"}
          IscoreButtonWidth={IS_OVERRIDEN_CORE_BUTTON_WIDTH}
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
              title={t("inventorysmart.confirmChanges")}
              children={t("inventorysmart.areYouSureToSaveAllYourChanges")}
              infoList={[]}
              primaryButtonLabel={t("inventorysmart.update")}
              secondaryButtonLabel={t("inventorysmart.close")}
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
            {isStatusDateRangeEnabled && excludeRangeNode && (
              <ExcludeDateRangePanel
                open={Boolean(excludeRangeNode)}
                onClose={() => setExcludeRangeNode(null)}
                baseRange={{
                  start: excludeRangeNode.data?.status_start_time,
                  end: excludeRangeNode.data?.status_end_time,
                }}
                exclusions={excludeRangeNode.data?.exclusions}
                tenantDateFormat={props.tenantDateFormat}
                onApply={onExclusionsApply}
                onError={(message) => displaySnackMessages(message, "error")}
              />
            )}
            <Loader loader={showloader}>
              <div data-testid="resultContainer">
                {isStatusDateRangeEnabled && setAll && (
                  <StatusSetAllPanel
                    open={setAll}
                    onClose={() => toggleSetAll(false)}
                    onApply={onSetAllRangesApply}
                    onError={(message) =>
                      displaySnackMessages(message, "warning")
                    }
                    title="Store status"
                    tenantDateFormat={props.tenantDateFormat}
                  />
                )}
                {!isStatusDateRangeEnabled && setAll && (
                  <SetAllMultiRow
                    containerType="panel"
                    panelWidth={900}
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
                    size="large"
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
                            variant="primary"
                            size="large"
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
                        {hasEditPermissions && (
                          <Button
                            variant="secondary"
                            id="storeCancelBtn"
                            onClick={() => {
                              if (setAllData.length) {
                                showConfirmBox(true);
                              } else {
                                tableInstance.current?.api?.deselectAll(true);
                                displaySnackMessages(
                                  "No changes are made",
                                  "warning"
                                );
                              }
                            }}
                          >
                            Cancel
                          </Button>
                        )}
                        {hasEditPermissions && (
                          <Button
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
                          </Button>
                        )}
                      </>
                    }
                    showDownloadButton={showDownloadBtn && totalRowsCount}
                    onDownloadButtonClick={() => downloadData()}
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
                    {...(isStatusDateRangeEnabled && {
                      onDateRangeChange,
                      onExclusionsClick,
                    })}
                    onRowGroupOpened={onRowGroupOpened}
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
    tenantDateFormat:
      state.tenantUserRoleMgmtReducer.userRoleManagementReducer
        .tenantDateFormat,
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
    pageSize:
      state.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.inventorysmart_page_count,
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
