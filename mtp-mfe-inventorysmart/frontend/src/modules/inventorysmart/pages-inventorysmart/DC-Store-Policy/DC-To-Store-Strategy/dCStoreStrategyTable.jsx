import PropTypes from "prop-types";
import React, { useEffect, useState, useRef } from "react";
import AgGridComponent from "core/Utils/agGrid";
import { getColumnsAg } from "core/actions/tableColumnActions";
import { connect } from "react-redux";
import moment from "moment";
import IconButton from "@mui/material/IconButton";
import Loader from "core/Utils/Loader/loader";
import AddIcon from "@mui/icons-material/Add";
import DownloadIcon from "@mui/icons-material/Download";
import {
  getStoreDcPolicyRulesList,
  setDcStorePolicyData,
  setDcStorePolicyDataLoader,
  saveDcStoreData,
  saveRuleName,
  setSavedEditedRules,
  deleteRulesDc,
  saveNetworkRuleName,
  deleteNetworkRulesDc,
  getStoreList,
} from "modules/inventorysmart/services-inventorysmart/DC-Store-Policy/dc-store-strategy";
import { cloneDeep, isEmpty, isNull, isUndefined, isEqual } from "lodash";
import ProductRulePopUp from "./ProductRulePopUp";
import { displaySnackMessages } from "../../inventorysmart-utility";
import {
  ERROR_MESSAGE,
  INVENTORY_SUBMODULES_NAMES,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { Grid } from "@mui/material";
import { Button, Modal, Tooltip } from "impact-ui-v3";
import DeleteTrashIcon from "assets/IS_icons/IS_deleteTrash.svg";
import DeleteActionButton from "modules/inventorysmart/components/ui-actions/DeleteActionButton";
import { ACTION_ADD_BUTTON_SX } from "./utils";
import { useExceptionStyles } from "../../Exceptions-stores/exceptionStyles";
import { EDIT_RULES } from "modules/inventorysmart/constants-inventorysmart/routesConstants";
import { addSnack } from "core/actions/snackbarActions";
import CellRenderers from "core/Utils/agGrid/cellRenderer";
import { isDateRangeConflict } from "core/Utils/functions/helpers/validation-helpers";
import { saveRcl } from "modules/inventorysmart/services-inventorysmart/Rules-Contraints/rules-contraints-services";
import { isActionAllowedOnSubModule } from "../../inventorysmart-utility";
import SetAllModalComponent from "./Set-All-Modal-Component";
import { DC_Table_Response } from "./mockData";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import { useStyles } from "modules/inventorysmart/styles/inventorySmartUseStyles";
import { getStoreDcPolicyNetworkRulesList } from "modules/inventorysmart/services-inventorysmart/DC-Store-Network/dc-store-network";
import { getDropDownOptions } from "modules/inventorysmart/services-inventorysmart/Network-Route/network-route";

export const handleErrorMessage = (e, props) => {
  const errObj = e?.response?.data;
  if (errObj?.show_message)
    displaySnackMessages(errObj?.message, "error", props);
  else displaySnackMessages(ERROR_MESSAGE, "error", props);
};

const DCStoreStrategytListTable = (props) => {
  // Helper function to sort store_details by start_date in ascending order
  const sortStoreDetailsByStartDate = (storeDetails) => {
    if (!storeDetails || storeDetails.length === 0) return storeDetails;
    return [...storeDetails].sort((a, b) => {
      if (!a.start_date) return 1;
      if (!b.start_date) return -1;
      return moment(a.start_date).diff(moment(b.start_date));
    });
  };

  const canTakeActionOnModules = (subModuleName, action) => {
    return isActionAllowedOnSubModule(
      props.inventorysmartModulesPermission,
      props?.module,
      subModuleName,
      action
    );
  };

  const hasEditAccess = () => {
    let editEnabled = canTakeActionOnModules(
      INVENTORY_SUBMODULES_NAMES.INVENTORY_DC_STORE_POLICY_STRATEGY,
      "edit"
    );
    return editEnabled;
  };
  const isManageRclFlow = props?.isManageRclFlow;
  // selectedDependencyValue -- > Selected Filters
  const setDynamicRenderer = (cellProps, extraProps, item) => {
    if (cellProps.node.level > 0) {
      return (
        <CellRenderers
          cellData={cellProps}
          column={item}
          extraProps={extraProps}
        ></CellRenderers>
      );
    }
    return "";
  };

  const classes = useStyles();
  const [dcStorePolicyColumns, setDcPolicyColumns] = useState([]);
  const filterDependencies = useRef({});
  const agGridInstance = useRef(null);
  const agGridStoreListTableInstance = useRef(null);
  const [clickedRowData, setClickedRowData] = useState("");
  const [parentNode, setParentNode] = useState(null);
  const [popUpColumnData, setPopUpColumnData] = useState([]);
  const [parentData, setParentData] = useState([]);
  const [showPopUp, setShowPopUp] = useState(false);
  const [selectedRules, setSelectedRules] = useState([]);
  const [deSelectedRules, setDeselectedRules] = useState([]);
  const [networkOption, setNetworkOption] = useState([]);
  const [isSetAllModalVisible, setAllModalVisibility] = useState(false);
  const [clickedStoreListRowData, setStoreListRowData] = useState([]);
  const [clickedStoreListRowNode, setClickedStoreListRowNode] = useState([]);
  const [storeListColDefs, setStoreListColdefs] = useState([]);
  const [openStoreListPopUp, setStoreListPopUpOpen] = useState(false);
  const [rulesListPayload,setRulesListPayload] = useState({});
  const pageSize =
    props?.inventorysmartScreenConfig?.inventorysmart_page_count || 10;
  useEffect(() => {
    const getColumns = async () => {
      let tableName = props.redirectedFromNetworkTab
        ? "rcl_supply_network"
        : "rcl_dc_store_policy";
      if (isManageRclFlow) {
        tableName = props.history?.location?.state?.redirectedFromNetworkTab
          ? "rcl_creation_supply_network"
          : "rcl_dc_store_policy";
      }
      let dcStoresColDef = await getColumnsAg(`table_name=${tableName}`)();
      let requestBodyForAllNetwork = {
        table_name: "supply_network",
        column_names: ["network_id", "network_name"],
      };
      let data;
      let networkOptions = [];
      if (
        props.redirectedFromNetworkTab ||
        props.history?.location?.state?.redirectedFromNetworkTab
      ) {
        data = await props.getDropDownOptions(requestBodyForAllNetwork);
        networkOptions = data.data.data.map((item) => {
          return { label: item.network_name, value: item.network_id };
        });
      }
      dcStoresColDef = dcStoresColDef.map((item) => {
        if (item.column_name === "c_rule_code") {
          item.cellRenderer = "agGroupCellRenderer";
          item.rowGroup = true;
        }
        if (item.column_name === "supply_network_name") {
          item.type = "list";
          item.options = networkOptions;
          item.cellRenderer = (cellProps, extraProps) => {
            if (cellProps.node.level === 0) return null;
            return (
              <CellRenderers
                cellData={cellProps}
                column={item}
                extraProps={extraProps}
              ></CellRenderers>
            );
          };
        }
        if (item?.column_name === "rule_name") {
          item.cellClass = `cell-renderer ${item?.cellClass}`;
          item.is_editable = true;
          item.disabled = !hasEditAccess();
          item.cellRenderer = (cellProps, extraProps) => {
            if (cellProps.node.level > 0) return null;
            if (cellProps?.node?.data?.is_default) {
              return (
                <div>
                  {cellProps?.value}
                </div>
              );
            }
            return (
              <CellRenderers
                cellData={cellProps}
                column={item}
                extraProps={extraProps}
              ></CellRenderers>
            );
          };
        }
        if (item.type === "link") {
          item.is_aggregated = false;
          item.is_editable = true;
          item.cellRenderer = (cellProps, extraProps) => {
            if (!cellProps?.node?.group) {
              let is_parent_default = cellProps?.node?.parent?.data?.is_default;
              // Group undefined means child !
              if (is_parent_default) {
                return (
                  <div className={classes.nonEditableCell}>
                    {cellProps?.value}
                  </div>
                );
              }
            }
            return (
              <CellRenderers
                cellData={cellProps}
                column={item}
                extraProps={extraProps}
              ></CellRenderers>
            );
          };
          item.onClick = async (tableInfo) => {
            setClickedRowData(tableInfo.cellData.data);
            setPopUpColumnData(tableInfo?.cellData?.colDef || {});
            setParentData(tableInfo?.cellData?.node?.parent?.data);
            setParentNode(tableInfo?.cellData?.node?.parent);
            if (
              tableInfo?.column.accessor ===
              "auto_allocation_schedular_store_level_name"
            ) {
              // Fetching Store List - Scheduler Pop up table columns
              let columns = await getColumnsAg(
                `table_name=${"store_list_scheduler_table"}`
              )();
              columns = columns.map((item) => {
                if (item.type === "link") {
                  item.is_aggregated = false;
                  item.is_editable = true;
                  item.cellRenderer = (cellProps, extraProps) => {
                    return (
                      <CellRenderers
                        cellData={cellProps}
                        column={item}
                        extraProps={extraProps}
                      ></CellRenderers>
                    );
                  };
                  item.onClick = async (tableInfo) => {
                    setStoreListRowData(tableInfo.cellData.data);
                    setClickedStoreListRowNode(tableInfo.cellData.node);
                    setShowPopUp(true);
                  };
                }
                return item;
              });
              setStoreListColdefs(columns);
              setStoreListPopUpOpen(true);
            } else {
              setShowPopUp(true);
            }
          };
        }
        if (item.column_name === "start_date" || item.column_name === "end_date") {
          // For start_date and end_date columns we dynamically show date field only for child nodes
          item.cellRenderer = (cellProps, extraProps) => {
            if (!cellProps?.node?.group) {
              // Group undefined means child !
              let is_parent_default = cellProps?.node?.parent?.data?.is_default;
              if (is_parent_default) {
                return (
                  <div className={classes.nonEditableCell}>
                    {moment(cellProps?.value).format(
                      localStorage.getItem("tenantDateFormat") || "MM-DD-YYYY"
                    )}
                  </div>
                );
              }
            }
            return setDynamicRenderer(cellProps, extraProps, item);
          };
        }

        return item;
      });
      dcStoresColDef.push({
        headerName: "",
        disableSortBy: true,
        isFixed: true,
        minWidth: 56,
        width: 56,
        sticky: "right",
        isFrozen: true,
        pinned: "right",
        cellStyle: { display: "flex", alignItems: "center", justifyContent: "center" },
        cellRenderer: (params, extraProps) => {
          if (!isEmpty(params.node.group)) {
            return (
                <Button
                  icon={<AddIcon fontSize="small" />}
                  variant="url"
                  sx={ACTION_ADD_BUTTON_SX}
                  onClick={() => onAddRow(params)}
                  disabled={
                    params?.data?.is_default ||
                    params?.data?.store_details?.length > 2
                  }
                  title="Add"
                  size="large"
                />
            );
          }
          return (
            <div>
              <Tooltip title="Delete" orientation="top" variant="tertiary">
                <Button
                  icon={<DeleteTrashIcon />}
                  variant="secondary"
                  type="destructive"
                  onClick={() => onDeleteRow(params)}
                  disabled={
                    params?.node?.parent?.data?.store_details?.length === 1
                  }
                  size="large"
                />
              </Tooltip>
            </div>
          );
        },
        suppressMenu: true,
      });
      setNetworkOption(networkOptions);
      setDcPolicyColumns(dcStoresColDef);
    };
    getColumns();
    props?.setSavedEditedRules([]);
  }, []);

  useEffect(() => {
    if (!isEmpty(props.selectedDependencyValue)) {
      filterDependencies.current = props.selectedDependencyValue;
      agGridInstance.current?.api?.refreshServerSideStore({ purge: true });
      setDeselectedRules([]);
    } else {
      // setting ref to empty
      filterDependencies.current = {};
    }
  }, [props.selectedDependencyValue]);

  const onAddRow = (event) => {
    let isAllDatePresent = true;
    const parentRowNode = event.node;
    parentRowNode.data.store_details?.forEach((thisStore) => {
      if (!thisStore.start_date || !thisStore.end_date) {
        isAllDatePresent = false;
      }
    });
    if (!isAllDatePresent) {
      displaySnackMessages(
        "Please provide start date and end date before adding new",
        "error",
        props
      );
      return;
    }
    let newNode = {
      l5_name: "",
      l4_name: "",
      class: "",
      subclass: "",
      collection: "",
      style: "",
      size: "",
      sku: "",
      brand: "",
      color: "",
      active: true,
      article: "",
      end_date: null,
      start_date: null,

      auto_approve_dc_store: "",
      id: parentRowNode.data.store_details
        ? parentRowNode.data.store_details.length
        : 0,
      is_newly_added: true,
      // Names
      store_store_groups_mapped: "0/0",
      product_profile: "-",
      dc_store_rule_name: "-",
      auto_allocation_rule_name: "-",
      auto_allocation_schedular_name: "-",
      // IDs
      default_store_groups: [],
      default_product_profile: null,
      dc_store_rule: null,
      auto_allocation_rule: null,
      auto_allocation_schedular: null,
    };
    // if (!isManageRclFlow) {
    // Setting Default Selections for Newly added Rows.
    const {
      _default_auto_allocation_rule_code,
      _default_auto_allocation_rule_name,
      _default_auto_allocation_scheduler_code,
      _default_auto_allocation_scheduler_name,
      _default_dc_store_rule_rule_code,
      _default_dc_store_rule_rule_name,
      _default_store_groups_mapped,
      _store_groups_names,
      _store_group_ids,
      _default_product_profile_name,
      _default_product_profile_code,
    } = parentRowNode.data;
    newNode = {
      // Names
      ...newNode,
      store_store_groups_mapped: _default_store_groups_mapped,
      store_groups_names: _store_groups_names,
      product_profile: _default_product_profile_name,
      dc_store_rule_name: _default_dc_store_rule_rule_name,
      auto_allocation_rule_name: _default_auto_allocation_rule_name,
      auto_allocation_schedular_name: _default_auto_allocation_scheduler_name,
      // IDs
      default_store_groups: _store_group_ids,
      default_product_profile: _default_product_profile_code,
      dc_store_rule: _default_dc_store_rule_rule_code,
      auto_allocation_rule: _default_auto_allocation_rule_code,
      auto_allocation_schedular: _default_auto_allocation_scheduler_code,
    };
    // }
    let updated_status_obj = [newNode];
    if (parentRowNode.data.store_details) {
      updated_status_obj = [
        ...parentRowNode.data.store_details,
        ...updated_status_obj,
      ];
    }
    // Sort store_details by start_date
    updated_status_obj = sortStoreDetailsByStartDate(updated_status_obj);
    const updated_data = {
      ...parentRowNode.data,
      store_details: isEmpty(updated_status_obj) ? null : updated_status_obj,
      isEdited: true,
    };
    parentRowNode.setData(updated_data);
    parentRowNode.group = updated_data;
    parentRowNode.setExpanded(false);
    //flashing is being removed wrt new design
    // agGridInstance.current.api.flashCells({ rowNodes: [parentRowNode] });
    if (updated_data.store_details) parentRowNode.setExpanded(true);
  };
  const onDeleteRow = (event) => {
    // Api to be integrated later.
    const deletedId = event.data.id;
    const parentRowNode = event.node.parent;

    const updated_store_details = parentRowNode.data.store_details.filter(
      (item) => item.id != deletedId
    );
    // updating parent row sub rows data
    const updated_data = {
      ...parentRowNode.data,
      store_details: isEmpty(updated_store_details)
        ? null
        : updated_store_details,
      isEdited: true,
    };
    parentRowNode.setData(updated_data);
    parentRowNode.group = updated_data;
    parentRowNode.setExpanded(false);
    //flashing is being removed wrt new design
    // agGridInstance.current.api.flashCells({ rowNodes: [parentRowNode] });
    if (updated_data.store_details) parentRowNode.setExpanded(true);
  };
  const onDeleteRule = async () => {
    let defaultRuleSelected = false;
    let selectedRows = agGridInstance.current.api.getSelectedRows();
    selectedRows.map((row) => {
      if (row.is_default) {
        defaultRuleSelected = true;
      }
    });
    if (defaultRuleSelected) {
      displaySnackMessages("Default Rules cannot be deleted", "info", props);
      return;
    }
    props.setDcStorePolicyDataLoader(true);
    let row_delete = selectedRules.map((thisRule) => {
      return {
        rule_code: thisRule.c_rule_code,
      };
    });
    let isAllRowsSelected = agGridInstance.current.api.isSelectAllRecords;

    let defaultRuleCodesOnLoadedPages = [];

    let unCheckedRows = [];

  if (isAllRowsSelected) {
    agGridInstance.current.api.forEachNode((node) => {
      if (!node.selected) {
        if (
          node?.data?.c_rule_code !== undefined &&
          node?.data?.c_rule_code !== null
        ) {
          unCheckedRows.push({
            rule_code: node.data.c_rule_code,
          });
        }
      }
    });

    // Remove duplicate rule codes
    unCheckedRows = [
      ...new Map(
        unCheckedRows.map((item) => [
          item.rule_code,
          item,
        ])
      ).values(),
    ];
  }

    let deletePayload = {
      meta: {
        search: [],
        sort: [],
        range: [],
        limit: {
          limit: 10,
          page: 1,
        },
      },
      filters: isEmpty(filterDependencies.current)
        ? []
        : filterDependencies?.current?.filters,
      row_delete: isAllRowsSelected ? [] : row_delete,
      checkAll: isAllRowsSelected,
      unCheckedRows,
    };
    try {
      let response = null;
      if (
        props.history?.location?.state?.redirectedFromNetworkTab ||
        props.redirectedFromNetworkTab
      ) {
        let payload = { rule_codes: row_delete.map((item) => item.rule_code) };
        response = await props?.deleteNetworkRulesDc(payload);
      } else {
        response = await props?.deleteRulesDc(deletePayload);
      }
      if (response?.message) {
        displaySnackMessages(response?.message, "success", props);
        agGridInstance.current?.api?.refreshServerSideStore({ purge: true });
        props.setDcStorePolicyDataLoader(false);
      }
    } catch (e) {
      props.setDcStorePolicyDataLoader(false);
      handleErrorMessage(e, props);
    }
  };
  const manualCallFetchRulesList = async (manualbody, pageIndex, params) => {
    const is_po_strategy_flow = JSON.parse(sessionStorage.getItem('is_po_strategy_flow')) || false;
    props.setDcStorePolicyDataLoader(true);
    setDeselectedRules([]);
    let body = {
      meta: {
        ...manualbody,
        limit: { limit: pageSize, page: isNull(pageIndex) ? 1 : pageIndex + 1 },
      },
      filters: isEmpty(filterDependencies.current)
        ? []
        : filterDependencies?.current?.filters,
        is_po_strategy_flow: is_po_strategy_flow,
    };
    setRulesListPayload(body);
    try {
      // let response = DC_Table_Response
      let response = props.redirectedFromNetworkTab
        ? await getStoreDcPolicyNetworkRulesList(body)
        : await getStoreDcPolicyRulesList(body);
      if (response?.data?.show_message) {
        displaySnackMessages(response?.data?.message, "success", props);
      }
      let formattedResponse = [];
      response?.data?.data &&
        response.data.data.forEach((thisData) => {
          let storeDetailsWithId = thisData.store_details.map((thisDetails, id) => {
            thisDetails.supply_network_name = `${thisDetails.supply_network_id}`;
            return {
              ...thisDetails,
              id,
            };
          });
          // Sort store_details by start_date
          let sortedStoreDetails = sortStoreDetailsByStartDate(storeDetailsWithId);
          let thisObj = {
            ...thisData,
            ...thisData.rcl_dimension,
            store_details: sortedStoreDetails,
          };
          delete thisObj["rcl_dimension"];
          formattedResponse.push(thisObj);
        });
      let formattedData;
      if (pageIndex) {
        formattedData = agGridRowFormatter(
          formattedResponse,
          params?.api?.checkConfiguration,
          "c_rule_code"
        );
      } else {
        params.api.setCheckConfiguration([]);
        formattedData = formattedResponse;
      }
      props.setDcStorePolicyData(cloneDeep(formattedData));

      props.setDcStorePolicyDataLoader(false);
      if (!response.data?.data?.length) {
        return {
          data: [],
          totalCount: 0,
        };
      } else {
        props.downloadButtonStateChange(false);
        return {
          data: formattedData,
          totalCount: response?.data?.total,
        };
      }
    } catch (e) {
      props.setDcStorePolicyDataLoader(false);
      handleErrorMessage(e, props);
      return {
        data: 0,
        totalCount: 0,
      };
    }
  };

  const onCellValueChanged = (params) => {
    const parentRowNode = params.node.parent;
    let isInputValueSame = false;
    if (moment.isMoment(params.newValue)) {
      isInputValueSame = moment(params.newValue).isSame(params.oldValue);
    } else {
      isInputValueSame = isEqual(params.oldValue, params.newValue);
    }

    if (params.colDef.accessor === "supply_network_name") {
      parentRowNode.data.supply_network_name = params.data.supply_network_name;
      setParentNodeData(parentRowNode, false, agGridInstance);
      return;
    } else {
      if (!isInputValueSame) {
        let start_date = params.node.data.start_date;
        let end_date = params.node.data.end_date;
        let hasConflict = false;
        if (start_date && end_date) {
          if (moment(end_date).isBefore(moment(start_date))) {
            displaySnackMessages(
              "To date should be after From Date",
              "error",
              props
            );
            hasConflict = true;
            setParentNodeData(parentRowNode, hasConflict, agGridInstance);
            return;
          }
          // Check Date range conflicts in the store_detaisl
          let start_end_list = parentRowNode.data?.store_details.map((item) => {
            return {
              start_time: item[`start_date`],
              end_time: item[`end_date`],
            };
          });
          if (isDateRangeConflict(start_end_list, "YYYY-MM-DD", "[]")) {
            // Conflict Exists
            hasConflict = true;
            displaySnackMessages("Conflicting Dates", "error", props);
            setParentNodeData(parentRowNode, hasConflict, agGridInstance);
            return;
          }
          let smallerToDateCheck = false;
          start_end_list.forEach((thisDate) => {
            if (
              moment(thisDate.end_time).isBefore(moment(thisDate.start_time))
            ) {
              smallerToDateCheck = true;
            }
          });
          if (smallerToDateCheck) {
            hasConflict = true;
            displaySnackMessages(
              "To date should be after From Date",
              "error",
              props
            );
            setParentNodeData(parentRowNode, hasConflict, agGridInstance);
            return;
          }
        }
        hasConflict = false;
        // Sort store_details by start_date after date changes
        if (parentRowNode.data.store_details) {
          parentRowNode.data.store_details = sortStoreDetailsByStartDate(
            parentRowNode.data.store_details
          );
        }
        setParentNodeData(parentRowNode, hasConflict, agGridInstance);
      }
    }
  };

  const setParentNodeData = (parentRowNode, hasConflict, agGridInstance) => {
    const updated_data = {
      ...parentRowNode.data,
      isEdited: true,
      hasConflict: hasConflict,
    };
    parentRowNode.setData(updated_data);
    agGridInstance.current.api.refreshCells({
      force: true,
      suppressFlash: false,
      rowNodes: [parentRowNode],
    });
    //flashing is being removed wrt new design
    // agGridInstance.current.api.flashCells({ rowNodes: [parentRowNode] });
  };

  const loadTableInstance = (params) => {
    agGridInstance.current = params;
  };
  const loadTablePopUpInstance = (params) => {
    agGridStoreListTableInstance.current = params;
  };

  const saveDataOnApply = async () => {
    // Save on Apply
    // Only individually edited rows to be saved for both normal and Manage RCL flows.
    let allBodies = [];
    let allData = [];
    let allDatesPresent = true;
    let hasConflicts = false;
    agGridInstance?.current?.api?.forEachNode((node) => {
      if (node.data?.isEdited) {
        allData.push(node?.data);
      }
      if (node?.parent?.data?.hasConflict) {
        hasConflicts = true;
      }
    });
    if (hasConflicts) {
      displaySnackMessages(
        "Invalid Start and end dates or Conflicting Date ranges in a Rule",
        "error",
        props
      );
      return;
    }
    if (allData.length === 0 && props?.savedEditedRules?.length >= 1) {
      // Manage RCL flow without inline edits to be saved
      // When we have set all data updated but not saved.
      if (isManageRclFlow) {
        props.setDcStorePolicyDataLoader(true);
        try {
          let payload = {
            table_name: props?.rclRulesTableName,
            filters: [...props?.selectedDependencyValue],
          };
          if (
            props.history?.location?.state?.redirectedFromNetworkTab ||
            props.redirectedFromNetworkTab
          ) {
            payload.meta = {
              search: [],
              sort: [],
              range: [],
              limit: {
                limit: 10,
                page: 1,
              },
            };
          }
          if(props.enable_validation_on_save){
            payload = {
              ...payload,
              validation_enabled: true
            }
          }
          let savedResponse = await saveRcl(
            payload,
            false,
            null,
            props.history?.location?.state?.redirectedFromNetworkTab ||
              props.redirectedFromNetworkTab,
            props.history?.location?.state?.is_po_strategy_flow ||
              props.is_po_strategy_flow
          );
          displaySnackMessages(savedResponse?.data?.message, "success", props);
          props?.setSavedEditedRules([]);
          props.setDcStorePolicyDataLoader(false);
          setTimeout(() => {
            props?.history?.push({
              pathname: EDIT_RULES,
              state: {
                redirectedFromNetworkTab: props.history?.location?.state
                  ?.redirectedFromNetworkTab
                  ? props.history?.location?.state?.redirectedFromNetworkTab
                  : false,
              },
            });
          }, 1000);
        } catch (error) {
          props.setDcStorePolicyDataLoader(false);
          handleErrorMessage(error, props);
        }
      }
      return;
    }
    if (allData.length < 1) {
      displaySnackMessages("No change to save", "error", props);
      return;
    }
    allData.forEach((thisData) => {
      let configuration = [];
      let row_update = [];
      row_update.push({
        rule_code: thisData.c_rule_code,
      });
      if (isEmpty(thisData.store_details)) {
        configuration.push([]);
      } else {
        thisData.store_details.forEach((thisStore) => {
          if (!thisStore.start_date || !thisStore.end_date) {
            allDatesPresent = false;
          }
          let row = [];
          let keys = [
            "auto_allocation_rule",
            "dc_store_rule",
            "default_product_profile",
            "default_store_groups",
            "start_date",
            "end_date",
            "auto_allocation_schedular",
            "auto_allocation_schedular_store_level",
          ];
          if (
            props.history?.location?.state?.redirectedFromNetworkTab ||
            props.redirectedFromNetworkTab
          ) {
            keys = ["supply_network_name", "start_date", "end_date"];
          }
          keys.forEach((thisKey) => {
            if (thisKey === "start_date" || thisKey === "end_date") {
              row.push({
                attribute_name: thisKey,
                attribute_value: moment(thisStore[thisKey]).format(
                  "YYYY-MM-DD"
                ),
              });
            } else {
              if (
                thisStore?.store_scheduler_mapping &&
                thisKey === "auto_allocation_schedular"
              ) {
                // This is to make sure that auto_allocation_schedular is not added in payload
                // when store_scheduler_mapping as in vs-intl
                return;
              }
              if (thisKey === "auto_allocation_schedular_store_level") {
                // Only for Vs-Intl
                if (thisStore?.store_scheduler_mapping) {
                  row.push({
                    attribute_name: thisKey,
                    attribute_value: thisStore?.store_scheduler_mapping,
                  });
                }
              } else {
                row.push({
                  attribute_name:
                    thisKey === "supply_network_name"
                      ? "supply_network_id"
                      : thisKey,
                  attribute_value: !isUndefined(thisStore[thisKey])
                    ? thisStore[thisKey]
                    : null,
                });
              }
            }
          });
          configuration.push(row);
        });
      }
      // For set All API
      let body = {
        configuration,
        row_update,
        filters: [],
        meta: {
          search: [],
          sort: [],
          range: [],
          limit: {
            limit: 10,
            page: 1,
          },
        },
        table_name: isManageRclFlow ? props.rclRulesTableName : undefined,
      };
      if (!isManageRclFlow) {
        body = { ...body, excluded_rows: [], is_all_records_selected: false };
      }
      if (
        props.history?.location?.state?.redirectedFromNetworkTab ||
        props.redirectedFromNetworkTab
      ) {
        body.network = configuration;
        delete body.configuration;
        delete body.excluded_rows;
        delete body.is_all_records_selected;
        body.table_name = isManageRclFlow ? props.rclRulesTableName : "";
      }
      allBodies.push(body);
    });

    if (!allDatesPresent) {
      displaySnackMessages(
        "Please provide start date and end date to save",
        "error",
        props
      );
      return;
    }
    props.setDcStorePolicyDataLoader(true);

    const promises = allBodies.map(
      async (editedRule) =>
        await props.saveDcStoreData(
          editedRule,
          isManageRclFlow,
          props.history?.location?.state?.redirectedFromNetworkTab ||
            props.redirectedFromNetworkTab,
          props.is_po_strategy_flow
        )
    );
    Promise.all(promises)
      .then(async (results) => {
        let tempResult = results.map((result, index) => {
          return result?.status;
        });
        if (tempResult.includes(false)) {
          handleErrorMessage({}, props);
        } else {
          // When Appyly for individual edits in Manage Rcl flow
          if (isManageRclFlow) {
            let payload = {
              table_name: props?.rclRulesTableName,
              filters: [...props?.selectedDependencyValue],
            };
            if (
              props.history?.location?.state?.redirectedFromNetworkTab ||
              props.redirectedFromNetworkTab
            ) {
              payload.meta = {
                search: [],
                sort: [],
                range: [],
                limit: {
                  limit: 10,
                  page: 1,
                },
              };
            }
           if(props.enable_validation_on_save){
            payload = {
              ...payload,
              validation_enabled: true
            }
            }
            let savedResponse = await saveRcl(
              payload,
              false,
              null,
              props.history?.location?.state?.redirectedFromNetworkTab ||
                props.redirectedFromNetworkTab,
              props.history?.location?.state?.is_po_strategy_flow ||
                props.is_po_strategy_flow
            );
            displaySnackMessages(
              savedResponse?.data?.message,
              "success",
              props
            );
            setTimeout(() => {
              props?.history?.push({
                pathname: EDIT_RULES,
                state: {
                  redirectedFromNetworkTab: props.history?.location?.state
                    ?.redirectedFromNetworkTab
                    ? props.history?.location?.state?.redirectedFromNetworkTab
                    : false,
                },
              });
            }, 1000);
          } else {
            displaySnackMessages(
              "RCL Rule Updated Successfully",
              "success",
              props
            );
          }
          props?.setSavedEditedRules([]);
          agGridInstance?.current?.api.refreshServerSideStore({ purge: true });
        }
        props.setDcStorePolicyDataLoader(false);
      })
      .catch((error) => {
        handleErrorMessage(error, props);
        props.setDcStorePolicyDataLoader(false);
      });
  };

  const onBlurHander = async (
    e,
    data,
    column,
    isChanged,
    val, // previous value
    initialVal, // old Value
    cellData,
    initVal, // New value
    previousValue
  ) => {
    if (column?.colId === "rule_name" && isChanged) {
      const { rule_name, c_rule_code } = data;
      try {
        let reqBody = {
          rule_name: rule_name || "",
          rule_code: c_rule_code,
          table_name: isManageRclFlow ? props.rclRulesTableName : undefined,
        };
        const response = props.history?.location?.state
          ?.redirectedFromNetworkTab
          ? await props.saveNetworkRuleName(reqBody)
          : await props.saveRuleName(reqBody);
        if (response?.status && response?.message) {
          displaySnackMessages(response?.message, "success", props);
          agGridInstance.current.api.refreshServerSideStore({ purge: true });
        }
      } catch (e) {
        handleErrorMessage(e, props);
      }
    }
  };

  const onCancel = () => {
    agGridInstance.current.api?.refreshServerSideStore({ purge: true });
    agGridInstance.current.api?.deselectAll(true);
  };

  const onSelectionChanged = (data) => {
    let selectedRows = [];
    agGridInstance?.current?.api?.forEachNode((node) => {
      if (node?.level === 0)
        node.selected &&
          selectedRows.push({
            ...node.data,
          });
    });
    setSelectedRules(selectedRows);
    //get the deselected nodes
    let deSelections = agGridInstance?.current?.api
      ?.getRenderedNodes()
      ?.filter((node) => !node.selected && node.data?.c_rule_code)
      ?.map((rowNode) => {
        return {
          rule_code: rowNode.data.c_rule_code,
        };
      });
    setDeselectedRules(deSelections);
  };
  const getTopRightOptions = () => {
    let options = [];
    if(selectedRules?.length > 0){
      options.push(
        <Button
          id="set-all-exception"
          variant="primary"
          size="large"
          onClick={() => {
            //Check if the selected rows contain any rules at default level. if any rule at default rule is present, display snackmessage else open the set all modal.
            let defaultRuleSelected = false;
            let selectedRows = agGridInstance.current.api.getSelectedRows();
            selectedRows.map((row) => {
              if (row.is_default) {
                defaultRuleSelected = true;
              }
            });
            if (defaultRuleSelected) {
              displaySnackMessages(
                "One or more selected rules cannot be edited as they are system defaults. Please change the selection",
                "info",
                props
              );
            } else {
              setAllModalVisibility(true);
            }
          }}
          disabled={
            !hasEditAccess() ||
            isUndefined(selectedRules) ||
            selectedRules.length === 0
          }
        >
          Set All
        </Button>
      );
      if(!isManageRclFlow){
        options.push(
          <DeleteActionButton
            id="delete-rules"
            size="large"
            onClick={onDeleteRule}
            title={"Delete Rules"}
            disabled={
              !hasEditAccess() ||
              isUndefined(selectedRules) ||
              selectedRules.length === 0
            }
          />
        );
      }
    }
    options.push(
      <Button
        id="create-product-profile"
        onClick={() => onCancel()}
        variant="tertiary"
        size="large"
      >
        Cancel
      </Button>
    );
    options.push(
      <Button
        id="create-product-profile"
        onClick={() => saveDataOnApply()}
        variant="primary"
        size="large"
        disabled={!hasEditAccess()}
      >
        Apply
      </Button>
    );
    return options;
  };
  const fetchStoreListData = async (manualbody, pageIndex) => {
    let body = {
      meta: {
        ...manualbody,
        limit: { limit: 10, page: isNull(pageIndex) ? 1 : pageIndex + 1 },
      },
    };
    let response = {};
    try {
      body = {
        ...body,
        rule_code: parentData?.c_rule_code,
        table_name: props?.rclRulesTableName,
      };
      // This gives the list of stores for selected RCL code
      response = await props.getStoreList(body);
      if (response?.show_message) {
        displaySnackMessages(response?.message, "success");
      }
      if (!response.data?.length) {
        return {
          data: [],
          totalCount: 0,
        };
      }

      let result = cloneDeep(response.data);
      return {
        data: result,
        totalCount: response?.total,
      };
    } catch (e) {
      handleErrorMessage(e, props);
      return {
        data: [],
        totalCount: 0,
      };
    }
  };
  const updateStoreSchedulerMappings = () => {
    let updated_store_details = cloneDeep(parentNode.data.store_details);
    let auto_allocation_schedular_name = [];
    let auto_allocation_schedular = [];
    let store_scheduler_mapping = [];
    agGridStoreListTableInstance?.current?.api.forEachNode((node) => {
      if (!isNull(node?.data?.auto_allocation_schedular)) {
        auto_allocation_schedular_name = [
          ...auto_allocation_schedular_name,
          node?.data?.auto_allocation_schedular_name,
        ];
        auto_allocation_schedular = [
          ...auto_allocation_schedular,
          node?.data?.auto_allocation_schedular,
        ];
        store_scheduler_mapping = [
          ...store_scheduler_mapping,
          {
            store_code: node?.data?.store_code,
            auto_allocation_schedular: node?.data?.auto_allocation_schedular,
          },
        ];
      }
    });
    const clickedRowId = clickedRowData?.id;
    updated_store_details.forEach((thisStore) => {
      if (thisStore.id === clickedRowId) {
        thisStore[
          "auto_allocation_schedular_store_level_name"
        ] = auto_allocation_schedular_name;
        thisStore["auto_allocation_schedular"] = auto_allocation_schedular;
        thisStore["store_scheduler_mapping"] = store_scheduler_mapping;
      }
    });
    const updated_data = {
      ...parentNode.data,
      store_details: isEmpty(updated_store_details)
        ? null
        : updated_store_details,
      isEdited: true,
    };
    parentNode.setData(updated_data);
    parentNode.group = updated_data;
    parentNode.setExpanded(false);
    // If it is not set all (Normal flow) we update the main table with pop up values.
    //flashing is being removed wrt new design
    // agGridInstance.current.api.flashCells({ rowNodes: [parentNode] });
    parentNode.setExpanded(true);
    setStoreListPopUpOpen(false);
  };
  return (
    <Grid>
      {showPopUp && (
        <ProductRulePopUp
          active={showPopUp}
          openModal={() => setShowPopUp(true)}
          closeModal={() => setShowPopUp(false)}
          filterDependencies={filterDependencies} // Filter dependencies being passed to Pop up to get filters !
          popUpColumnData={popUpColumnData}
          parentData={parentData}
          clickedRowData={clickedRowData}
          agGridInstance={
            openStoreListPopUp ? agGridStoreListTableInstance : agGridInstance
          } // instance of the table to update the mappings.
          parentNode={parentNode}
          isManageRclFlow={isManageRclFlow}
          table_name={props?.rclRulesTableName}
          is_intermediary_flow={openStoreListPopUp}
          clickedStoreListRowData={clickedStoreListRowData}
          clickedStoreListRowNode={clickedStoreListRowNode}
        />
      )}
      {openStoreListPopUp && (
        <Modal
          title={"Mapped Stores"}
          id="mapped-stores-pop-up"
          open={openStoreListPopUp}
          size="medium"
          onClose={(_event, reason) => {
            if (reason === "backdropClick") {
              return;
            }
            setStoreListPopUpOpen(false);
          }}
          primaryButtonLabel={"Update Mappings"}
          onPrimaryButtonClick={() => {
            updateStoreSchedulerMappings();
          }}
          secondaryButtonLabel={"Cancel"}
          onSecondaryButtonClick={() => setStoreListPopUpOpen(false)}
        >
          <AgGridComponent
            loadTableInstance={loadTablePopUpInstance}
            manualCallBack={(body, pageIndex) =>
              fetchStoreListData(body, pageIndex)
            }
            rowModelType="serverSide"
            serverSideStoreType="partial"
            cacheBlockSize={10}
            columns={storeListColDefs}
            uniqueRowId={"store_code"}
            selectAllHeaderComponent={false}
            rowSelection={"single"}
            sizeColumnsToFitFlag={true}
            hideHeaderCheckboxComponent={true}
            wrapCellText
            autoCellHeight
            showDownloadButton={
              props.showDownload && !isManageRclFlow && !props?.downloadDisabled
            }
            onDownloadButtonClick={props?.downloadDcStoreStrategy}
          />
        </Modal>
      )}

      <SetAllModalComponent
        resetSelectedRules={setSelectedRules}
        isSetAllModalVisible={isSetAllModalVisible}
        setAllModalVisibility={setAllModalVisibility}
        filterDependencies={filterDependencies}
        filtersWithSearch = {props.filtersWithSearch || rulesListPayload}
        selectedRules={selectedRules}
        redirectedFromNetworkTab={
          props.redirectedFromNetworkTab ||
          props.history?.location?.state?.redirectedFromNetworkTab
        }
        networkOptions={networkOption}
        agGridInstance={agGridInstance} // instance of the table. To refresh the table when we save in set all.
        isManageRclFlow={isManageRclFlow}
        rclRulesTableName={props?.rclRulesTableName}
        selectedDependencyValue={props?.selectedDependencyValue}
        history={props?.history}
        deSelectedRules={deSelectedRules}
        setDeselectedRows={setDeselectedRules}
        excludeDeselections={isManageRclFlow ? false : true}
      />

      {!isManageRclFlow && dcStorePolicyColumns?.length > 0 && (
        <Loader loader={props.dcStorePolicyTableDataLoader} minHeight={"350px"}>
          <AgGridComponent
            topRightOptions={getTopRightOptions()}
            childKey={"store_details"}
            hideSelectAllRecords={false}
            rowModelType="serverSide"
            serverSideStoreType="partial"
            selectAllHeaderComponent={hasEditAccess()}
            treeData={true}
            cacheBlockSize={pageSize}
            loadTableInstance={loadTableInstance}
            manualCallBack={(body, pageIndex, params) =>
              manualCallFetchRulesList(body, pageIndex, params)
            }
            onCellValueChanged={(params) => {
              onCellValueChanged(params);
            }}
            columns={dcStorePolicyColumns}
            skipAutoSizeColumn={false}
            groupDisplayType={"custom"}
            onGridChanged
            onRowSelected
            uniqueRowId={"c_rule_code"}
            hideChildSelection={true}
            purgeClosedRowNodes={true}
            suppressAggFuncInHeader={true}
            suppressClickEdit={true}
            onBlur={onBlurHander}
            onSelectionChanged={(data) => onSelectionChanged(data)}
            paginationPageSize={pageSize}
            wrapCellText
            autoCellHeight
            wrapHeaderText
            autoHeaderHeight
            showDownloadButton={
              props.showDownload && !isManageRclFlow && !props?.downloadDisabled
            }
            onDownloadButtonClick={props?.downloadDcStoreStrategy}
            disablePaginationForSinglePage
          />
        </Loader>
      )}
      {isManageRclFlow && props.rclRulesTableName && (
        <Loader loader={props.dcStorePolicyTableDataLoader} minHeight={"350px"}>
          <AgGridComponent
            topRightOptions={getTopRightOptions()}
            loadTableInstance={loadTableInstance}
            hideSelectAllRecords={false}
            manualCallBack={props.fetchTableDataRCLTable}
            rowModelType="serverSide"
            serverSideStoreType="partial"
            uniqueRowId={"c_rule_code"}
            columns={dcStorePolicyColumns}
            selectAllHeaderComponent={hasEditAccess()}
            onCellValueChanged={(params) => {
              onCellValueChanged(params);
            }}
            cacheBlockSize={pageSize}
            skipAutoSizeColumn={false}
            childKey={"store_details"}
            treeData={true}
            purgeClosedRowNodes={true}
            hideChildSelection={true}
            groupDisplayType={"custom"}
            onGridChanged
            onRowSelected
            suppressAggFuncInHeader={true}
            suppressClickEdit={true}
            onSelectionChanged={(data) => onSelectionChanged(data)}
            paginationPageSize={pageSize}
            onBlur={onBlurHander}
            wrapCellText
            autoCellHeight
            wrapHeaderText
            autoHeaderHeight
            disablePaginationForSinglePage
          />
        </Loader>
      )}
    </Grid>
  );
};

DCStoreStrategytListTable.propTypes = {
  editedRulesSave: PropTypes.func,
  getStoreDcPolicyRulesList: PropTypes.func,
  selectedDependencyValue: PropTypes.shape({
    meta: PropTypes.any,
  }),
  getStoreDcPolicyNetworkRulesList: PropTypes.func,
  setDcStorePolicyData: PropTypes.func,
  setDcStorePolicyDataLoader: PropTypes.func,
  is_po_strategy_flow: PropTypes.bool,
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer } = store;
  return {
    dcStorePolicyTableData:
      inventorysmartReducer?.dcStoreStrategyReducer?.dcStorePolicyTableData,
    dcStorePolicyTableDataLoader:
      inventorysmartReducer?.dcStoreStrategyReducer
        ?.dcStorePolicyTableDataLoader,
    inventorysmartScreenConfig:
      inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
    inventorysmartModulesPermission:
      inventorysmartReducer.inventorySmartCommonService
        ?.inventorysmartModulesPermission,
    savedEditedRules:
      inventorysmartReducer?.dcStoreStrategyReducer?.savedEditedRules,
    enable_validation_on_save:
      inventorysmartReducer?.inventorySmartConstraints?.constraintsConfigs?.enable_validation_on_save,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (payload) => dispatch(addSnack(payload)),
    getDropDownOptions: (payload) => dispatch(getDropDownOptions(payload)),
    getStoreDcPolicyRulesList: (body) =>
      dispatch(getStoreDcPolicyRulesList(body)),
    getStoreDcPolicyNetworkRulesList: (body) =>
      dispatch(getStoreDcPolicyNetworkRulesList(body)),
    setDcStorePolicyData: (body) => dispatch(setDcStorePolicyData(body)),
    setDcStorePolicyDataLoader: (body) =>
      dispatch(setDcStorePolicyDataLoader(body)),
    saveDcStoreData: (body, isManageRclFlow, isDCNetworkFlow) =>
      dispatch(saveDcStoreData(body, isManageRclFlow, isDCNetworkFlow)),
    saveRuleName: (body) => dispatch(saveRuleName(body)),
    saveNetworkRuleName: (body) => dispatch(saveNetworkRuleName(body)),
    setSavedEditedRules: (body) => dispatch(setSavedEditedRules(body)),
    deleteRulesDc: (body) => dispatch(deleteRulesDc(body)),
    deleteNetworkRulesDc: (body) => dispatch(deleteNetworkRulesDc(body)),
    getStoreList: (data) => dispatch(getStoreList(data)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(DCStoreStrategytListTable);
