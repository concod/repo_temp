import { useEffect, useState, useRef } from "react";
import AgGridComponent from "core/Utils/agGrid";
import AddActionButton from "modules/inventorysmart/components/ui-actions/AddActionButton";
import SetAllModalComponent from "../Common/components/Set-All-Modal-Component";
import {
  collectConstraintGridSelection,
  getExceptionStoreParentRowFields,
  isParentRowByLevel,
} from "../Common/components/constraintSelectionUtils";
import { connect } from "react-redux";
import {
  deleteExceptions,
  getExceptionListData,
  getExceptionListOnClick,
  saveEditedExceptions,
  saveSetAllModalData,
  setAllModalData,
  setAllModalVisibility,
  setExceptionTableData,
  setExceptionTableLoader,
  setSelectedExceptionList,
  saveExceptionRuleName,
  downloadExceptionConstraints
} from "modules/inventorysmart/services-inventorysmart/Exception-Constriants/exception-constraint-services";
import {
  displaySnackMessages,
  isActionAllowedOnSubModule,
} from "../inventorysmart-utility";
import {
  ERROR_MESSAGE,
  INVENTORY_SUBMODULES_NAMES,
  tableConfigurationMetaData,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { cloneDeep, isEmpty, isNull, isUndefined } from "lodash";
import DeleteActionButton from "modules/inventorysmart/components/ui-actions/DeleteActionButton";
import { addSnack } from "core/actions/snackbarActions";
import {
  addDataToEditableState,
  addUniqueKeyToSubrows,
  checkRedundantDate,
  childNewRowData,
  childNewRowDataWithMinDistribution,
  flattenJSON,
  getPropsWithFreshEditedData,
  sortChildRowsByStartDate,
  validateForNullValues,
  transformConstraintsToAttributeFormat,
  getSizeBasedonRowHeight,
} from "modules/inventorysmart/utils-inventorysmart/utilityFunctions";
import { setDynamicRenderer } from "modules/inventorysmart/pages-inventorysmart/Product-Mapping/components/common-functions";
import { IconButton } from "@mui/material";
import { getColumnsAg } from "core/actions/tableColumnActions";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import moment from "moment";
import { handleErrorMessage } from "../Constraints/Rules-Constraints/add-rcl-component";
import { Button, Tooltip } from "impact-ui-v3";
import ConfirmBox from "core/Utils/confirmPrompt/confirmPopup";
import { useStyles as useInventorySmartStyles } from "modules/inventorysmart/styles/inventorySmartUseStyles";
import { useExceptionStyles } from "./exceptionStyles";
import { formattedDate } from "core/Utils/formatter";
import CellRenderers from "core/Utils/agGrid/cellRenderer";
import {
  renderParentDash,
  injectStatusColumn,
  wrapColumnsWithEmptyCell,
  applyActionColumnLayout,
  formatActionColumn,
  useConstraintsActionColumnStyles,
  renderReadOnlyConstraintValue,
} from "../Constraints/landing-screen/constraintsCommonUtils";
import { statusBadgeCellRenderer, transformMinDistribution } from "../Constraints/Rule-Group-Constraints/ruleGroupUtils";
import NewMinDistributionModal from "../Constraints/create-new-rule-flow/min-distribution/NewMinDistributionModal";
import UpViewIcon from "assets/up_view.svg";
import { hasNestedStyleSizeMinDistribution } from "../Constraints/create-new-rule-flow/createNewRuleConstraintsUtils";

const tenantDateFormat = localStorage.getItem("tenantDateFormat");

const ExceptionStoresListTable = (props) => {
  const isOMSConstraintsFlow =
    sessionStorage.getItem("isOMSConstraintsFlow") === "true";
  const inventorySmartClasses = useInventorySmartStyles();
  const actionColumnClasses = useConstraintsActionColumnStyles();
  const useStyles = useExceptionStyles();
  const [exceptionListColumns, setExceptionColumns] = useState([]);
  const [filtersOfExceptions, setFiltersOfException] = useState({});
  const filterDependencies = useRef({});
  const agGridInstance = useRef(null);
  const savedEditedDataRef = useRef(props.savedEditedData || []);
  const [minDistributionModalStatus, setMinDistributionModalStatus] = useState(
    false
  );
  const [minDistributionRowData, setMinDistributionRowData] = useState({});
  const [deSelectedRows, setDeselectedRows] = useState([]);
  const [selectedParentAndChildRows, setSelectedParentAndChildRows] = useState([]);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const hasSelectedRows =
    props?.selectedPlan?.length > 0 ||
    agGridInstance?.current?.api?.isSelectAllRecords;
  const showPendingApply =
    !hasSelectedRows && props?.savedEditedData?.length > 0
  const showCancelApply = showPendingApply && props.onApply;


  const isColumnEditable = (column, isOMSConstraintsFlow, isEditEnabled) => {
    if (isOMSConstraintsFlow) {
      return column?.is_editable && isEditEnabled;
    }
    return isEditEnabled;
  };

  const editableChildColumns = props?.exceptionConfigs?.editableChildRowInNewExceptionFlow || [
    "wos",
    "min_stock",
    "max_stock",
    "start_date",
    "end_date",
  ];
  
  // to prevent stale closure of when save button is called after grid edit
  useEffect(() => {
    savedEditedDataRef.current = props.savedEditedData || [];
  }, [props.savedEditedData]);

  useEffect(() => {
    const onLoad = async () => {
      let exception_columns = await getColumnsAg(
        "table_name=exception_stores_table"
      )();
      if (props?.exceptionConfigs?.isRedirectionFromCreateRclEnabled) {
        exception_columns = injectStatusColumn(exception_columns);
      }
      let isEditEnabled = enableEdit();
      exception_columns.map((data) => {
        if (!props?.constraintsConfigs?.showSingleMergedRows) {
          data.is_editable = data?.is_editable && isEditEnabled;
          data?.sub_headers?.map((subData) => {
            subData.is_editable = subData.is_editable && isEditEnabled;
            //for the new RCL flow, we need to make these columns editable on child level only 
            if (props?.exceptionConfigs?.isRedirectionFromCreateRclEnabled && (
              editableChildColumns.indexOf(subData.column_name) > -1 ||
              subData.extra?.isEditableConstraint
            )) {
              const isDateColumn = ["start_date", "end_date"].includes(subData.column_name);
              const renderValue = (cellProps) => (
                <div>
                  {isDateColumn
                    ? formattedDate(cellProps?.value, subData?.extra?.dateFormat)
                    : cellProps?.value || ""}
                </div>
              );
              subData.cellRenderer = (cellProps, extraProps) => {
                if (cellProps.node.level === 0) {
                  return renderParentDash(subData);
                }
                return isEditEnabled
                  ? setDynamicRenderer(cellProps, extraProps, subData)
                  : renderValue(cellProps);
              };
            }
            return subData;
          });
          if (data?.column_name === "rule_code") {
            data.cellRenderer = "agGroupCellRenderer";
            data.rowGroup = true;
          }
          if (data?.column_name === "exception_rule_name") {
            const isColumnEditEnabled = isColumnEditable(
              data,
              isOMSConstraintsFlow,
              isEditEnabled
            );
            if (isColumnEditEnabled) {
              data.editable = (params) => params?.node?.level === 0;
            }
            return (data.cellRenderer = (cellProps, extraProps) => {
              if (cellProps.node.level !== 0) return <></>;
              else
                return isColumnEditEnabled ? (
                  <CellRenderers
                    cellData={cellProps}
                    column={data}
                    extraProps={extraProps}
                  ></CellRenderers>
                ) : (
                  <div>{cellProps?.value || ""}</div>
                );
            });
          }
          if (
            [
              "wos",
              "st",
              "min_stock",
              "max_stock",
              "category_minimum",
              "category_maximum",
              "start_date",
              "end_date",
            ].indexOf(data.column_name) > -1 ||
            data.extra?.isEditableConstraint
          ) {
            const dateColumns = ["start_date", "end_date"];
            data.cellRenderer = (cellProps, extraProps) => {
              // New RCL flow only: parent rows show "-" (same as RuleGroupExceptionsTable).
              if (
                props?.exceptionConfigs?.isRedirectionFromCreateRclEnabled &&
                cellProps.node.level === 0
              ) {
                return renderParentDash(data);
              }
              return isEditEnabled ? (
                setDynamicRenderer(cellProps, extraProps, data)
              ) : (
                <div>
                  {dateColumns.includes(data.column_name)
                    ? formattedDate(cellProps?.value, tenantDateFormat)
                    : cellProps?.value || ""}
                </div>
              );
            };
          }
        }
        if (data?.column_name === "end_date") {
          data.disablePast = true;
        }
        if (data?.column_name === "status") {
          data.cellRenderer = statusBadgeCellRenderer;
        }
        if (data?.column_name === "min_distribution") {
          data.is_aggregated = false;
          data.width = 470;
          data.minWidth = 470;
          data.extra = { ...data.extra, width: 470 };
          data.cellRenderer = (cellProps, extraProps) => {
            // Parent rows show dash
            if (cellProps.node.level === 0) {
              return renderParentDash(data);
            }
            const isEditEnabled = enableEdit();
            if (isEditEnabled && !cellProps?.node?.parent?.data?.is_default) {
              const hasDetails = hasNestedStyleSizeMinDistribution(cellProps?.data);
              return (
                <div className={inventorySmartClasses.minDistributionCell}>
                <div className={inventorySmartClasses.minDistributionCellContent}>
                  <CellRenderers
                    cellData={cellProps}
                    column={data}
                    extraProps={extraProps}
                  />
                </div>
                {hasDetails && (
                  <span
                    role="button"
                    onClick={() => {
                      setMinDistributionRowData(cellProps?.data);
                      setMinDistributionModalStatus(true);
                    }}
                    className={inventorySmartClasses.minDistributionIconBtn}
                    aria-label="View style and size details"
                  >
                    <UpViewIcon className={inventorySmartClasses.minDistributionIcon} />
                  </span>
                )}
              </div>
              );
            }
            return renderReadOnlyConstraintValue
              ? renderReadOnlyConstraintValue(cellProps, data)
              : (cellProps?.value || "-");
          };
          data.onClick = (tableInfo) => {
            setMinDistributionRowData(tableInfo.cellData);
            setMinDistributionModalStatus(true);
          };
        }
        if (data?.column_name === "action") {
          applyActionColumnLayout(data);
          return (data.cellRenderer = (params, extraProps) => {
            if (params.node.level !== 0) {
              return (
                <div>
                  <DeleteActionButton
                    iconOnly
                    plainHover
                    onClick={() => {
                      onDeleteClick(params);
                    }}
                    disabled={
                      !isEditEnabled ||
                      params?.node?.parent?.data?.data?.length === 1 ||
                      params?.node?.parent?.data?.is_default
                    }
                    size={getSizeBasedonRowHeight(params)}
                  />
                </div>
              );
            } else {
              return (
                <div>
                  <AddActionButton
                    iconOnly
                    plainHover
                    onClick={() => {
                      addChildRow(params);
                    }}
                    disabled={
                      !isEditEnabled ||
                      params?.node?.data?.data?.length > 4 ||
                      params?.node?.data?.is_default
                    }
                  />
                </div>
              );
            }
          });
        }
        return data;
      });
      if (props?.exceptionConfigs?.isRedirectionFromCreateRclEnabled) {
        wrapColumnsWithEmptyCell(exception_columns);
        exception_columns = formatActionColumn(exception_columns);
      }
      setExceptionColumns(exception_columns);
    };
    onLoad();
  }, []);

  useEffect(() => {
    if (!isEmpty(props.selectedDependencyValue)) {
      filterDependencies.current = props.selectedDependencyValue;
      agGridInstance.current?.api?.refreshServerSideStore({ purge: true });
    } else {
      // setting ref to empty
      filterDependencies.current = {};
    }
    props?.setSelectedExceptionList([]);
    setDeselectedRows([]);
    // New filter/status context reloads the grid; pending cell edits no longer apply.
    props.saveModifiedData([]);
    savedEditedDataRef.current = [];
    agGridInstance?.current?.api?.deselectAll();
  }, [props.selectedDependencyValue]);

  useEffect(() => {
    if (props?.stateAfterExceptionUpdate) {
      agGridInstance?.current?.api.refreshServerSideStore({ purge: true });
      agGridInstance?.current?.api?.deselectAll();
    }
  }, [props?.stateAfterExceptionUpdate]);

  const loadTableInstance = (params) => {
    agGridInstance.current = params;
  };

  const manualCallFetchExceptionList = async (
    manualbody,
    pageIndex,
    params
  ) => {
    let body;
    let apiCall;
   //two different flow one is when in bottomsheet of new all rules flow and other native flow when clicked on exception tab
    if (props.ruleData) {
      body = {
        rule_code: props.ruleData?.rule_code,
        psa_code: props.ruleData?.psa_code,
        meta: {
          ...manualbody,
          limit: {
            limit: props.pageSize || 100,
            page: isNull(pageIndex) ? 1 : pageIndex + 1,
          },
        },
      };
      apiCall = getExceptionListOnClick;
    } else {
      body = {
        meta: {
          ...manualbody,
          limit: { limit: props.pageSize || 10, page: pageIndex + 1 },
        },
        filters: isEmpty(filterDependencies.current)
          ? []
          : filterDependencies?.current?.filters,
        selection: {
          data: [
            ...agGridInstance?.current?.api?.checkConfiguration,
            {
              checkedRows: agGridInstance?.current?.api
                .getSelectedRows()
                .map((item) => item.key),
            },
          ],
          unique_columns: ["key"],
        },
        ...(filterDependencies?.current?.status && {
          status: filterDependencies.current.status,
        }),
      };
      apiCall = getExceptionListData;
      setFiltersOfException(body);
    }

    try {
      props.setExceptionTableLoader(true);
      let response = await apiCall(body);
      props.setExceptionTableLoader(false);
      if (response?.data?.show_message) {
        displaySnackMessages(response?.data?.message, "success", props);
      }
      if (!response.data?.data?.length) {
        return {
          data: [],
          totalCount: 0,
        };
      }
      // Sort child rows by start_date for each parent row
      let sortedResponseData = response.data.data.map(row => ({
        ...row,
        data: row.data ? sortChildRowsByStartDate(row.data) : row.data
      }));
      
      // Apply min_distribution transform so display value is human-readable
      sortedResponseData = transformMinDistribution(sortedResponseData, {
        isNewConstraintsFlow:
          props?.exceptionConfigs?.isRedirectionFromCreateRclEnabled ||
          props.showNewConstraintFlow,
      });
      
      let result = props?.constraintsConfigs?.showSingleMergedRows
        ? cloneDeep(flattenJSON(sortedResponseData))
        : addUniqueKeyToSubrows(cloneDeep(sortedResponseData));

      props.setExceptionTableData(sortedResponseData);
      let formattedData;
      if (pageIndex) {
        formattedData = agGridRowFormatter(
          result,
          params?.api?.checkConfiguration,
          props.uniqueKey
        );
      } else {
        params.api.setCheckConfiguration([]);
        formattedData = result;
      }

      return {
        data: formattedData,
        totalCount: response.data.total,
      };
    } catch (e) {
      props.setExceptionTableLoader(false);
      handleErrorMessage(e, props);
      return {
        data: [],
        totalCount: 0,
      };
    }
  };

  const onSelectionChanged = (event) => {
    const { selectedRows, deSelections, nestedSelection } =
      collectConstraintGridSelection({
        api: agGridInstance?.current?.api,
        event,
        isParentRow: isParentRowByLevel,
        getParentRowFields: getExceptionStoreParentRowFields,
        deselectionFields: ["rule_code", "store_code"],
      });

    props?.setSelectedExceptionList(selectedRows);
    setDeselectedRows(deSelections);
    setSelectedParentAndChildRows(nestedSelection);
  };

  const onDelete = async () => {
    // When child rows are involved, split parents into two groups:
    // - parents that still have selected children (constraints.length > 0) -> update via set-all API
    // - parents with no selected children left (constraints.length === 0) -> delete via delete API
    if (selectedParentAndChildRows?.length > 0) {
      const sharedFilters = isUndefined(filterDependencies?.current?.filters)
        ? []
        : filterDependencies?.current?.filters;
      const sharedMeta = {
        limit: { limit: props.pageSize || 10, page: 1 },
        ...(isUndefined(filterDependencies?.current?.meta)
          ? tableConfigurationMetaData.meta
          : filterDependencies?.current?.meta),
      };

      const parentsWithConstraints = selectedParentAndChildRows.filter(
        (parent) => parent?.constraint?.length > 0
      );
      const parentsWithoutConstraints = selectedParentAndChildRows.filter(
        (parent) => !(parent?.constraint?.length > 0)
      );
      const rowsToDelete = parentsWithoutConstraints;

      props?.setExceptionTableLoader(true);
      try {
        if (rowsToDelete.length > 0) {
          const payloadToDelete = {
            filters: sharedFilters,
            meta: sharedMeta,
            row_delete: rowsToDelete,
          };
          const deleteResponse = await deleteExceptions(payloadToDelete);
          if (deleteResponse?.data?.show_message || deleteResponse?.status) {
            displaySnackMessages(
              deleteResponse?.data?.message,
              "success",
              props
            );
          }
        }
        if (parentsWithConstraints.length > 0) {
          // Transform constraints to the required attribute format
          const transformedUpdates = parentsWithConstraints.map((parent) => ({
            ...parent,
            constraint: transformConstraintsToAttributeFormat(parent.constraint)
          }));
          
          const updatesPayload = {
            filters: sharedFilters,
            updates: transformedUpdates,
            meta: sharedMeta,
            excluded_rows: [],
            is_all_records_selected: false,
            is_new_row: false,
          };
          const setAllResponse = await saveSetAllModalData(
            updatesPayload,
            false
          );
          if (setAllResponse?.data?.show_message || setAllResponse?.status) {
            displaySnackMessages(
              setAllResponse?.data?.message,
              "success",
              props
            );
          }
        }
        agGridInstance.current.api.refreshServerSideStore({ purge: true });
      } catch (error) {
        handleErrorMessage(error, props);
      } finally {
        props?.setExceptionTableLoader(false);
        props?.setSelectedExceptionList([]);
        setDeselectedRows([]);
        setSelectedParentAndChildRows([]);
        agGridInstance?.current?.api?.deselectAll();
      }
      return;
    }

    let isAllRowsSelected = agGridInstance?.current?.api?.isSelectAllRecords;
    let unCheckedRows = [];
    if (isAllRowsSelected) {
      agGridInstance.current.api.forEachNode((node) => {
        if (
            isParentRowByLevel(node) &&
            node?.data?.rule_code &&
            !node.selected
            ) {
            unCheckedRows.push({
            rule_code: node.data?.rule_code,
            });
            }
      });
      // Remove duplicate rule codes
    unCheckedRows = [
      ...new Map(
        unCheckedRows?.map((item) => [
          item.rule_code,
          item,
        ])
      ).values(),
    ];
    }
    let payloadToDelete = {
      filters: isUndefined(filterDependencies?.current?.filters)
        ? []
        : filterDependencies?.current?.filters,
      meta: {
        limit: { limit: props.pageSize || 10, page: 1 },
        ...(isUndefined(filterDependencies?.current?.meta)
          ? tableConfigurationMetaData.meta
          : filterDependencies?.current?.meta),
      },
      row_delete: isAllRowsSelected ? [] : props?.selectedPlan,
      checkAll: isAllRowsSelected,
      unCheckedRows,
    };
    props?.setExceptionTableLoader(true);
    try {
      let response = await deleteExceptions(payloadToDelete);
      props?.setExceptionTableLoader(false);
      props?.setSelectedExceptionList([]);
      displaySnackMessages(response?.data?.message, "success", props);
      agGridInstance?.current?.api?.deselectAll();
      agGridInstance.current.api.refreshServerSideStore({ purge: true });
    } catch (error) {
      props?.setExceptionTableLoader(false);
      handleErrorMessage(error, props);
    } finally {
      setDeselectedRows([]);
    }
  };

  const saveTheEditedExceptions = (params) => {
    if (params.column.colId === "exception_rule_name") {
      return;
    }
    let { oldValue, newValue, data } = params;
    if (oldValue !== newValue && !isNull(newValue) && newValue !== "") {
      let tempDateValidation = false;
      params?.node?.setDataValue(params?.colDef?.id, newValue);
      const parentNode = params.node.parent;
      if (parentNode && parentNode?.data) {
        const parentData = { ...parentNode.data };
        const childIndex = parentData.data.findIndex(
          (row) => row.key === params.node.data.key
        );
        if (childIndex !== -1) {
          parentData.data[childIndex] = { ...params.node.data };
          parentNode.setData(parentData);
        }
      }
      if (params?.colDef?.type === "datetime") {
        if (!moment(newValue).isValid()) {
          displaySnackMessages(
            `Please enter a valid date in ${tenantDateFormat} format`,
            "error",
            props
          );
          params?.node?.setDataValue(params?.colDef?.id, null);
          return;
        }
        let end_date = new Date(params?.data?.end_date);
        let start_date = new Date(params?.data?.start_date);
        if (!isNull(params?.data?.end_date) && end_date < start_date) {
          displaySnackMessages(
            `End date cannot be less than start date`,
            "error",
            props
          );
          return params?.node?.setDataValue(
            "end_date",
            params?.data?.start_date
          );
        }
        tempDateValidation = checkRedundantDate(
          params?.node?.parent?.data?.data,
          newValue,
          params?.colDef?.id,
          data
        );
        if (tempDateValidation) {
          displaySnackMessages(
            `Please choose dates that are not in the same range for ${params?.colDef?.label}.`,
            "error",
            props
          );
          return params?.node?.setDataValue(params?.colDef?.id, null);
        } else
          addDataToEditableState(
            getPropsWithFreshEditedData(props, savedEditedDataRef),
            params,
            data,
            agGridInstance,
            filterDependencies,
            deSelectedRows
          );
      } else {
        addDataToEditableState(
          getPropsWithFreshEditedData(props, savedEditedDataRef),
          params,
          data,
          agGridInstance,
          filterDependencies,
          deSelectedRows
        );
      }
    } else if (isNull(newValue) || newValue === "") {
      displaySnackMessages(
        `Cannot have null values in ${params?.colDef?.label}`,
        "error",
        props
      );
      return params?.node?.setDataValue(params?.colDef?.id, 0);
    }
  };

  const handleMinDistributionSave = (params, newData) => {
    const node = params?.node;
    const nextChild = { ...(node?.data || params?.data || {}), ...newData };
    const parentNode = node?.parent;
    const parentChildren = parentNode?.data?.data;
    const nextChildren = Array.isArray(parentChildren)
      ? parentChildren.map((row) =>
          String(row.key) === String(nextChild.key) ? nextChild : row
        )
      : null;

    // Patch parent.data.data in place to avoid setTimeout races
    if (parentNode?.data && nextChildren) {
      parentNode.data.data = nextChildren;
    }
    if (node) {
      node.setData(nextChild);
    }

    addDataToEditableState(
      getPropsWithFreshEditedData(props, savedEditedDataRef),
      { ...params, data: nextChild, node },
      nextChild,
      agGridInstance,
      filterDependencies,
      deSelectedRows
    );
  };

  const addChildRow = (params) => {
    let tempValidation = validateForNullValues(
      params?.data?.data,
      agGridInstance,
      displaySnackMessages,
      props
    );
    if (tempValidation?.length <= 0) {
      let newRowData = props.showNewConstraintFlow
        ? childNewRowDataWithMinDistribution(params)
        : childNewRowData(params);
      let newRowAdded = Object.assign(params.data, {
        data: [...params.data?.data, newRowData],
      });
      addDataToEditableState(
        getPropsWithFreshEditedData(props, savedEditedDataRef),
        params,
        newRowData,
        agGridInstance,
        filterDependencies,
        deSelectedRows
      );
      params.node.setExpanded(false);
      params.node.setData(newRowAdded);
      params.node.setExpanded(true);
    }
  };

  const onDeleteClick = (params) => {
    let parentNode = params.node.parent;
    let childNodes = params.node.parent.data.data.filter((item) => {
      return item.key !== params.data.key;
    });
    let deletedNode = params.node.parent.data.data
      .filter((item) => {
        return item.key === params.data.key;
      })
      .map((item) => {
        item.action = "delete";
        item.key = `${item.key}_delete`;
        return item;
      });
    childNodes = childNodes.map((item, index) => {
      item.key = index;
      return item;
    });
    parentNode.setExpanded(false);
    let updated_data = { ...params.node.parent.data };
    updated_data.data = childNodes;
    parentNode.setData(updated_data);
    addDataToEditableState(
      getPropsWithFreshEditedData(props, savedEditedDataRef),
      params,
      updated_data,
      agGridInstance,
      filterDependencies,
      deSelectedRows
    );
    parentNode.setExpanded(true);
  };

  const canTakeActionOnModules = (subModuleName, action) => {
    return isActionAllowedOnSubModule(
      props.inventorysmartModulesPermission,
      props.module,
      subModuleName,
      action
    );
  };

  const enableEdit = () => {
    let editEnabled = canTakeActionOnModules(
      INVENTORY_SUBMODULES_NAMES.INVENTORY_EXCEPTION_CONSTRAINTS,
      "edit"
    );
    return editEnabled;
  };

  const saveRuleNameOnBlur = async (
    params,
    row,
    column,
    isChanged,
    value,
    initialValue
  ) => {
    if (
      column.colId === "exception_rule_name" &&
      isChanged &&
      value !== initialValue
    ) {
      let payload = {
        exception_rule_name: params?.target?.value,
        rule_code: row?.rule_code,
        store_code: row?.store_code,
      };
      props.setExceptionTableLoader(true);
      try {
        let response = await saveExceptionRuleName(payload);
        if (response?.data?.message)
          displaySnackMessages(response?.data?.message, "success", props);
        agGridInstance.current.api.refreshServerSideStore({ purge: true });
      } catch (error) {
        handleErrorMessage(error, props);
      } finally {
        props.setExceptionTableLoader(false);
      }
    }
  };

  const handleDownload = async() => {
    let payload = cloneDeep(filtersOfExceptions);
    delete payload?.meta?.limit;
    try {
      let response = await props.downloadExceptionConstraints(payload);
      displaySnackMessages(response?.data?.data?.message, "success", props);
    } catch (err) {
      handleErrorMessage(err, props);
    }
  }

  const handleCancelEdits = () => {
    props.saveModifiedData([]);
    agGridInstance?.current?.api?.refreshServerSideStore?.({ purge: true });
    setShowCancelConfirm(false);
  };

  const handleSaveSetAllModalData = async (...args) => {
    const response = await saveSetAllModalData(...args);
    props.saveModifiedData([]);
    return response;
  };

  const renderTopRightOptions = () => {

    const showDelete = enableEdit() && hasSelectedRows;
    const showSetAll = !props.hideSetAll && props?.selectedPlan?.length > 0;
    const showLegacyApply = !props.onApply && props?.applyButton;

    // Return null when empty — a truthy empty fragment makes AgGrid show
    // a divider before the download button.
    if (!showDelete && !showSetAll && (!showCancelApply || props.showActionButtonsInFooter) && !showLegacyApply) {
      return null;
    }
    return (
      <>
        {showDelete && (
          <DeleteActionButton
            onClick={() => onDelete()}
            disabled={!enableEdit()}
          />
        )}
        {showDelete && showSetAll && !props.showActionButtonsInFooter && (
          <div
            key="selection-actions-separator"
            className={inventorySmartClasses.dividerLine}
          />
        )}
        {showSetAll && (
          <Button
            id="set-all-exception"
            variant={"primary"}
            onClick={() => props?.setAllModalVisibility(true)}
            disabled={!enableEdit() || isUndefined(props?.selectedPlan)}
          >
            Set All
          </Button>
        )}
        {showCancelApply && !props.showActionButtonsInFooter && (
          <>
            <Button
              id="cancel-exception-btn"
              variant="tertiary"
              size="large"
              onClick={() => setShowCancelConfirm(true)}
            >
              Cancel
            </Button>
            <Button
              id="apply-exception-btn"
              onClick={props.onApply}
              variant="primary"
              size="large"
            >
              Apply
            </Button>
          </>
        )}
        {showLegacyApply}
      </>
    );
  };

  return (
    <div>
      {showCancelConfirm && (
        <ConfirmBox
          onClose={() => setShowCancelConfirm(false)}
          onConfirm={handleCancelEdits}
        />
      )}
      <div className={useStyles.exceptionTableContainer}>
        <div className={props.isSetAllModalVisible ? useStyles.exceptionTableGridWrapperWithModal : useStyles.exceptionTableGridWrapper}>
          { (props?.exceptionConfigs?.isRedirectionFromCreateRclEnabled || props.showNewConstraintFlow) && (
            <NewMinDistributionModal
              isModalOpen={minDistributionModalStatus}
              setIsModalOpen={setMinDistributionModalStatus}
              rowData={minDistributionRowData}
              filters={filterDependencies?.current?.filters}
              addDataToEditableState={addDataToEditableState}
              handleMinDistributionSave={handleMinDistributionSave}
              flow={"exceptions"}
            />
          )}
          <AgGridComponent
            customClass={actionColumnClasses.grid}
            columns={exceptionListColumns}
            selectAllHeaderComponent={enableEdit()}
            uniqueRowId={"key"}
            loadTableInstance={loadTableInstance}
            manualCallBack={(body, pageIndex, params) =>
              manualCallFetchExceptionList(body, pageIndex, params)
            }
            rowModelType="serverSide"
            serverSideStoreType="partial"
            cacheBlockSize={props.pageSize || 10}
            disablePaginationForSinglePage={true}
            enableChildRowSelection={props.showNewConstraintFlow}
            syncChildAndParentSelection={props.showNewConstraintFlow}
            tableHeader={props.showNewConstraintFlow ? "Details" : ""}
            onSelectionChanged={(event) => onSelectionChanged(event)}
            skipAutoSizeColumn={true}
            onCellValueChanged={(params) => {
              saveTheEditedExceptions(params);
            }}
            onBlur={(params, row, column, isChanged, value, initialValue) =>
              saveRuleNameOnBlur(
                params,
                row,
                column,
                isChanged,
                value,
                initialValue
              )
            }
            groupDisplayType={"custom"}
            suppressAggFuncInHeader={true}
            childKey={"data"}
            treeData={true}
            purgeClosedRowNodes={true}
            hideChildSelection={true}
            paginationPageSize={props.pageSize}
            topLeftOptions={props?.topLeftOptions}
            cardContainer={props?.cardContainer}
            showDownloadButton={!props.ruleData}
            onDownloadButtonClick={handleDownload}
            topRightOptions={renderTopRightOptions ? renderTopRightOptions() : null}
          />
        </div>
        <div>
          <SetAllModalComponent
            showSetAllModal={props?.isSetAllModalVisible}
            showSetAllInBottomSheet={props.showSetAllInBottomSheet}
            setAllModalVisible={props?.setAllModalVisibility}
            filterDependencies={filterDependencies}
            savedSetAllModalData={props?.savedSetAllModalData}
            setAllModalData={props?.setAllModalData}
            saveSetAllModalData={handleSaveSetAllModalData}
            selectedPlan={props?.selectedPlan}
            selectedParentAndChildRows={selectedParentAndChildRows}
            agGridInstance={agGridInstance}
            resetSelectedPlan={() => {
              props?.setSelectedExceptionList([]);
              if (agGridInstance?.current?.api)
                agGridInstance?.current?.api?.refreshServerSideStore({
                  purge: true,
                });
            }}
            excludeDeselections={true}
            deSelectedRows={deSelectedRows}
            setDeselectedRows={setDeselectedRows}
            filtersWithSearch={filtersOfExceptions}
            flow="exceptions"
            relativeWosMessage={[
              "In Relative change, values will be added to/subtracted from current WOS.",
            ]}
            disableRelativeWos={
              props?.constraintsConfigs?.isRelativeWOSdisabled || false
            }
            showExceptionRuleName={true}
          />
        </div>
      </div>
    </div>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer, filterReducer } = store;
  return {
    inventorysmartScreenConfig:
      inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
    constraintsConfigs:
      inventorysmartReducer.inventorySmartConstraints.constraintsConfigs,
    isSetAllModalVisible:
      inventorysmartReducer?.exceptionConstraintsReducer?.isSetAllModalVisible,
    savedSetAllModalData:
      inventorysmartReducer?.exceptionConstraintsReducer
        ?.exceptionSetAllModalData,
    selectedPlan:
      inventorysmartReducer?.exceptionConstraintsReducer.selectedExceptionList,
    savedEditedData:
      inventorysmartReducer?.exceptionConstraintsReducer?.savedEditedExceptions,
    stateAfterExceptionUpdate:
      inventorysmartReducer?.exceptionConstraintsReducer
        ?.stateAfterExceptionUpdate,
    inventorysmartModulesPermission:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartModulesPermission,
    pageSize:
      store.inventorysmartReducer.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.inventorysmart_page_count,
    exceptionConfigs:
      inventorysmartReducer?.exceptionConstraintsReducer?.exceptionConfigs,
    showNewConstraintFlow:
      inventorysmartReducer?.inventorySmartConstraints?.showNewConstraintFlow,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (body) => dispatch(addSnack(body)),
    setExceptionTableLoader: (body) => dispatch(setExceptionTableLoader(body)),
    getExceptionListData: (body) => dispatch(getExceptionListData(body)),
    setExceptionTableData: (body) => dispatch(setExceptionTableData(body)),
    setAllModalVisibility: (body) => dispatch(setAllModalVisibility(body)),
    setAllModalData: (data) => dispatch(setAllModalData(data)),
    saveSetAllModalData: (data) => dispatch(saveSetAllModalData(data)),
    setSelectedExceptionList: (data) =>
      dispatch(setSelectedExceptionList(data)),
    saveModifiedData: (data) => dispatch(saveEditedExceptions(data)),
    saveExceptionRuleName: (data) => dispatch(saveExceptionRuleName(data)),
    downloadExceptionConstraints:(data) => dispatch(downloadExceptionConstraints(data))
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ExceptionStoresListTable);
