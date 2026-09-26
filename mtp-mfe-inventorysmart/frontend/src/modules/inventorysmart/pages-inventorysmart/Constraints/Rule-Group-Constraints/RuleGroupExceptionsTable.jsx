import React, { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import { cloneDeep, isNull, isUndefined } from "lodash";
import moment from "moment";
import { Button, Tooltip } from "impact-ui-v3";
import AddActionButton from "modules/inventorysmart/components/ui-actions/AddActionButton";
import DeleteActionButton from "modules/inventorysmart/components/ui-actions/DeleteActionButton";
import ConfirmBox from "core/Utils/confirmPrompt/confirmPopup";
import AgGridComponent from "core/Utils/agGrid";
import Loader from "core/Utils/Loader/loader";
import { getColumnsAg } from "core/actions/tableColumnActions";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import CellRenderers from "core/Utils/agGrid/cellRenderer";
import { formattedDate } from "core/Utils/formatter";
import {
  renderParentDash,
  wrapColumnsWithEmptyCell,
  isConstraintColumn,
  isConstraintChildRow,
  injectStatusColumn,
  applyActionColumnLayout,
  formatActionColumn,
  useConstraintsActionColumnStyles,
  renderReadOnlyConstraintValue,
} from "../landing-screen/constraintsCommonUtils";
import EmptyImage from "assets/IS_icons/doggy.svg";
import { setDynamicRenderer } from "modules/inventorysmart/pages-inventorysmart/Product-Mapping/components/common-functions";
import { addSnack } from "core/actions/snackbarActions";
import SetAllModalComponent from "modules/inventorysmart/pages-inventorysmart/Common/components/Set-All-Modal-Component";
import {
  collectConstraintGridSelection,
  getExceptionStoreParentRowFields,
  isParentRowByLevel,
} from "modules/inventorysmart/pages-inventorysmart/Common/components/constraintSelectionUtils";
import { useExceptionStyles } from "modules/inventorysmart/pages-inventorysmart/Exceptions-stores/exceptionStyles";
import {
  displaySnackMessages,
  isActionAllowedOnSubModule,
} from "modules/inventorysmart/pages-inventorysmart/inventorysmart-utility";
import { handleErrorMessage } from "modules/inventorysmart/pages-inventorysmart/Constraints/Rules-Constraints/add-rcl-component";
import {
  ERROR_MESSAGE,
  UPDATED_MESSAGE,
  INVENTORY_SUBMODULES_NAMES,
  tableConfigurationMetaData,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
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
  validateConstraintFields,
  getSizeBasedonRowHeight,
} from "modules/inventorysmart/utils-inventorysmart/utilityFunctions";
import {
  deleteExceptions,
  downloadExceptionConstraints,
  saveEditedExceptions,
  saveExceptionRuleName,
  saveSetAllModalData,
  saveStateAfterExceptionUpdate,
  setAllModalData,
  setAllModalVisibility,
  setExceptionConfigs,
  setExceptionTableData,
  setExceptionTableLoader,
  setSelectedExceptionList,
} from "modules/inventorysmart/services-inventorysmart/Exception-Constriants/exception-constraint-services";
import { setConstraintsConfigs } from "modules/inventorysmart/services-inventorysmart/Constraints/constraints-services";
import { getModuleBasedTenantConfig } from "modules/inventorysmart/services-inventorysmart/common/inventory-smart-common-services";
import { getRuleGroupExceptionList } from "../../../services-inventorysmart/Rule-Group-Constraints/rule-group-services";
import { statusBadgeCellRenderer, getDetailGridHeight, transformMinDistribution } from "./ruleGroupUtils";
import NewMinDistributionModal from "../create-new-rule-flow/min-distribution/NewMinDistributionModal";
import UpViewIcon from "assets/up_view.svg";
import { hasNestedStyleSizeMinDistribution } from "../create-new-rule-flow/createNewRuleConstraintsUtils";
import { useStyles as useInventorySmartStyles } from "modules/inventorysmart/styles/inventorySmartUseStyles";

const tenantDateFormat = localStorage.getItem("tenantDateFormat");

const RuleGroupExceptionsTable = (props) => {
  const { topLeftOptions } = props;
  const useStyles = useExceptionStyles();
  const inventorySmartClasses = useInventorySmartStyles();
  const actionColumnClasses = useConstraintsActionColumnStyles();
  const isOMSConstraintsFlow =
    sessionStorage.getItem("isOMSConstraintsFlow") === "true";

  const [exceptionListColumns, setExceptionColumns] = useState([]);
  const [filtersOfExceptions, setFiltersOfException] = useState({});
  const [minDistributionModalStatus, setMinDistributionModalStatus] = useState(false);
  const [minDistributionRowData, setMinDistributionRowData] = useState({});
  const [deSelectedRows, setDeselectedRows] = useState([]);
  const [selectedParentAndChildRows, setSelectedParentAndChildRows] = useState([]);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  // Fit the server-side grid to its rows instead of the fixed ~350px body.
  const [innerTableHeight, setInnerTableHeight] = useState("140px");
  const [dataAvaiable, setDataAvailable] = useState(true);
  const agGridInstance = useRef(null);
  const filterDependencies = useRef({ filters: [] });
  // Full dataset fetched once from the rule-group exception API; paginated in-memory.
  const fullDataRef = useRef(null);
  const savedEditedDataRef = useRef(props.savedEditedExceptions || []);

  const canTakeActionOnModules = (subModuleName, action) =>
    isActionAllowedOnSubModule(
      props.inventorysmartModulesPermission,
      props.module,
      subModuleName,
      action
    );

  const enableEdit = () =>
    canTakeActionOnModules(
      INVENTORY_SUBMODULES_NAMES.INVENTORY_EXCEPTION_CONSTRAINTS,
      "edit"
    );

  const isColumnEditable = (column, omsFlow, isEditEnabled) => {
    if (omsFlow) {
      return column?.is_editable && isEditEnabled;
    }
    return isEditEnabled;
  };

  const purgeStore = () => {
    fullDataRef.current = null;
    agGridInstance?.current?.api?.refreshServerSideStore({ purge: true });
  };

  useEffect(() => {
    const initTableConfig = async () => {
      try {
        // Fetch tenant configs and column definitions together so columns are
        // built only once (avoids redundant table-config network calls that
        // happened when the build effect re-ran on each config prop update).
        const [
          exceptionConfigsData,
          constraintsConfigsData,
          exception_columns,
        ] = await Promise.all([
          getModuleBasedTenantConfig({ module_name: "exception_configs" })(),
          getModuleBasedTenantConfig({
            module_name: "inventorysmart_constraints_configs",
          })(),
          getColumnsAg("table_name=exception_stores_table")(),
        ]);
        props.setExceptionConfigs(exceptionConfigsData);
        props.setConstraintsConfigs(constraintsConfigsData);

        const isEditEnabled = enableEdit();
        const editableChildCols =
          exceptionConfigsData?.editableChildRowInNewExceptionFlow || [
            "wos",
            "min_stock",
            "max_stock",
            "start_date",
            "end_date",
          ];
        const columnsWithStatus = injectStatusColumn(exception_columns);
        columnsWithStatus.map((data) => {
          if (!constraintsConfigsData?.showSingleMergedRows) {
            data.is_editable = data?.is_editable && isEditEnabled;
            data?.sub_headers?.map((subData) => {
              subData.is_editable = subData.is_editable && isEditEnabled;
              if (
                exceptionConfigsData?.isRedirectionFromCreateRclEnabled &&
                (editableChildCols.indexOf(subData.column_name) > -1 ||
                  subData.extra?.isEditableConstraint)
              ) {
                const isDateColumn = ["start_date", "end_date"].includes(
                  subData.column_name
                );
                const renderValue = (cellProps) => (
                  <div>
                    {isDateColumn
                      ? formattedDate(
                          cellProps?.value,
                          subData?.extra?.dateFormat
                        )
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
              data.editable = false;
              const isColumnEditEnabled = isColumnEditable(
                data,
                isOMSConstraintsFlow,
                isEditEnabled
              );
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
            if (isConstraintColumn(data)) {
              const dateColumns = ["start_date", "end_date"];
              data.cellRenderer = (cellProps, extraProps) => {
                if (cellProps.node.level === 0) return renderParentDash(data);
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
          if (data?.column_name === "action") {
            applyActionColumnLayout(data);
            return (data.cellRenderer = (params) => {
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
          if (data?.column_name === "status") {
            data.cellRenderer = statusBadgeCellRenderer;
          }
          if (data?.column_name === "min_distribution") {
            data.is_aggregated = false;
            data.width = 470;
            data.minWidth = 470;
            data.extra = { ...data.extra, width: 470 };
            data.cellRenderer = (cellProps, extraProps) => {
              if (cellProps.node.level === 0) return renderParentDash(data);
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
        return data;
        });
        wrapColumnsWithEmptyCell(columnsWithStatus);
        setExceptionColumns(formatActionColumn(columnsWithStatus));
      } catch (e) {
        handleErrorMessage(e, props);
      }
    };
    initTableConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    savedEditedDataRef.current = props.savedEditedExceptions || [];
  }, [props.savedEditedExceptions]);

  useEffect(() => {
    filterDependencies.current = {
      ...filterDependencies.current,
      filters: props.filters || [],
    };
    fullDataRef.current = null;
    props.saveModifiedData([]);
    savedEditedDataRef.current = [];
    props?.setSelectedExceptionList([]);
    setDeselectedRows([]);
    agGridInstance?.current?.api?.refreshServerSideStore({ purge: true });
    agGridInstance?.current?.api?.deselectAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.ruleList, props.filters]);

  useEffect(() => {
    if (props?.stateAfterExceptionUpdate) {
      purgeStore();
      agGridInstance?.current?.api?.deselectAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props?.stateAfterExceptionUpdate]);

  const loadTableInstance = (params) => {
    agGridInstance.current = params;
  };

  const handleInnerModelUpdated = (params) => {
    setInnerTableHeight(getDetailGridHeight(params));
  };

  // Server-side row model, but the data source fetches the FULL dataset once
  // (by rule_list) and applies search/sort/pagination in-memory.
  const manualCallFetchExceptions = async (manualbody, pageIndex, params) => {
    try {
      props.setExceptionTableLoader(true);
      const pageSize = props.pageSize || 100;
      const body = {
        rule_list: props.ruleList || [],
        meta: {
          ...manualbody,
          limit: {
            limit: pageSize,
            page: isNull(pageIndex) ? 1 : pageIndex + 1,
          },
        },
      };
      const response = await getRuleGroupExceptionList(body);
      if (response?.data?.show_message) {
        displaySnackMessages(response?.data?.message, "success", props);
      }
      setFiltersOfException({ ...manualbody, rule_list: props.ruleList || [] });

      const allData = response?.data?.data || [];
      const total = response?.data?.total || allData.length;

      if (!allData.length) {
        setDataAvailable(false);
        return { data: [], totalCount: total };
      }
      // Sort child rows by start_date for each parent row
      let sortedData = allData.map(row => ({
        ...row,
        data: row.data ? sortChildRowsByStartDate(row.data) : row.data
      }));

      // Transform min_distribution for human-readable display (style + size)
      sortedData = transformMinDistribution(sortedData, {
        isNewConstraintsFlow: props?.exceptionConfigs?.isRedirectionFromCreateRclEnabled || props.showNewConstraintFlow,
      });
      
      let result = props?.constraintsConfigs?.showSingleMergedRows
        ? cloneDeep(flattenJSON(sortedData))
        : addUniqueKeyToSubrows(cloneDeep(sortedData));

      props.setExceptionTableData(sortedData);
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
      return { data: formattedData, totalCount: total };
    } catch (e) {
      handleErrorMessage(e, props);
      return { data: [], totalCount: 0 };
    } finally {
      props.setExceptionTableLoader(false);
    }
  };

  const onSelectionChanged = (event) => {
    const { selectedRows, deSelections, nestedSelection } =
      collectConstraintGridSelection({
        api: agGridInstance?.current?.api,
        event,
        isParentRow: isParentRowByLevel,
        getParentRowFields: getExceptionStoreParentRowFields,
        deselectionFields: ["rule_code", "psa_code", "store_code"],
      });

    props?.setSelectedExceptionList(selectedRows);
    setDeselectedRows(deSelections);
    setSelectedParentAndChildRows(nestedSelection);
  };

  const onDelete = async () => {
    let payloadToDelete = {
      filters: isUndefined(filterDependencies?.current?.filters)
        ? []
        : filterDependencies?.current?.filters,
      meta: {
        limit: { limit: props.pageSize || 100, page: 1 },
        ...(isUndefined(filterDependencies?.current?.meta)
          ? tableConfigurationMetaData.meta
          : filterDependencies?.current?.meta),
      },
      row_delete: props?.selectedPlan,
    };
    props?.setExceptionTableLoader(true);
    try {
      let response = await deleteExceptions(payloadToDelete);
      props?.setExceptionTableLoader(false);
      props?.setSelectedExceptionList([]);
      displaySnackMessages(response?.data?.message, "success", props);
      agGridInstance?.current?.api?.deselectAll();
      purgeStore();
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
          return params?.node?.setDataValue("end_date", params?.data?.start_date);
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
    let childNodes = params.node.parent.data.data.filter(
      (item) => item.key !== params.data.key
    );
    params.node.parent.data.data
      .filter((item) => item.key === params.data.key)
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
        purgeStore();
      } catch (error) {
        handleErrorMessage(error, props);
      } finally {
        props.setExceptionTableLoader(false);
      }
    }
  };

  const handleDownload = async () => {
    let payload = cloneDeep(filtersOfExceptions);
    delete payload?.meta?.limit;
    try {
      let response = await props.downloadExceptionConstraints(payload);
      displaySnackMessages(response?.data?.data?.message, "success", props);
    } catch (err) {
      handleErrorMessage(err, props);
    }
  };

  const saveDataOnApply = () => {
    const updateBackedRules = async () => {
      const freshEdits = savedEditedDataRef.current || [];
      if (!freshEdits.length) return;
      const constraintValidationChecks = validateConstraintFields(
        cloneDeep(freshEdits)
      );
      if (constraintValidationChecks?.inValidDate?.length > 0) {
        displaySnackMessages(
          `Invalid Date found in ${constraintValidationChecks.inValidDate}`,
          "error",
          props
        );
        return;
      }
      if (constraintValidationChecks?.nullValues?.length > 0) {
        displaySnackMessages(
          `Null values found in ${constraintValidationChecks.nullValues}`,
          "error",
          props
        );
        return;
      } else {
        const promises = freshEdits.map(
          async (editedRos) => await saveSetAllModalData(editedRos)
        );
        props?.setExceptionTableLoader(true);
        props?.saveStateAfterExceptionUpdate(false);
        Promise.all(promises)
          .then((results) => {
            let tempResult = results.map((result) => result.data.status);
            if (tempResult.includes(false)) {
              displaySnackMessages(ERROR_MESSAGE, "error", props);
            } else {
              props?.saveStateAfterExceptionUpdate(true);
              displaySnackMessages(UPDATED_MESSAGE, "success", props);
            }
            props?.setExceptionTableLoader(false);
            props?.saveEditedExceptions([]);
            props?.setSelectedExceptionList([]);
          })
          .catch((error) => {
            props?.setExceptionTableLoader(false);
            handleErrorMessage(error, props);
            props?.saveEditedExceptions([]);
          });
      }
    };
    updateBackedRules();
  };

  const handleCancelEdits = () => {
    props.saveEditedExceptions([]);
    agGridInstance?.current?.api?.refreshServerSideStore?.({ purge: true });
    setShowCancelConfirm(false);
  };

  const handleSaveSetAllModalData = async (...args) => {
    const response = await saveSetAllModalData(...args);
    props.saveEditedExceptions([]);
    return response;
  };

  const renderTopRightOptions = () => {
    const hasSelectedRows =
      props?.selectedPlan?.length > 0 ||
      agGridInstance?.current?.api?.isSelectAllRecords;
    const hasPendingEdits = props?.savedEditedExceptions?.length > 0;

    if (!hasSelectedRows && !hasPendingEdits) return null;

    return (
      <>
        {hasSelectedRows && (
          <Button
            id="set-all-rule-group-exception-btn"
            variant="primary"
            onClick={() => props?.setAllModalVisibility(true)}
            size="large"
          >
            Set All
          </Button>
        )}
        {!hasSelectedRows && hasPendingEdits && (
          <>
            <Button
              id="cancel-rule-group-exception-btn"
              variant="tertiary"
              size="large"
              onClick={() => setShowCancelConfirm(true)}
            >
              Cancel
            </Button>
            <Button
              id="apply-rule-group-exception-btn"
              onClick={() => saveDataOnApply()}
              variant="primary"
              size="large"
            >
              Apply
            </Button>
          </>
        )}
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
      <SetAllModalComponent
        showSetAllModal={props?.isSetAllModalVisible}
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
          purgeStore();
        }}
        excludeDeselections={true}
        deSelectedRows={deSelectedRows}
        setDeselectedRows={setDeselectedRows}
        filtersWithSearch={filtersOfExceptions}
        flow="exceptions"
        showExceptionRuleName={true}
        relativeWosMessage={[
          "In Relative change, values will be added to/subtracted from current WOS.",
        ]}
        disableRelativeWos={
          props?.constraintsConfigs?.isRelativeWOSdisabled || false
        }
      />
      {(props?.exceptionConfigs?.isRedirectionFromCreateRclEnabled || props.showNewConstraintFlow) && (
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
      <Loader loader={props?.exceptionLoader} minHeight={innerTableHeight}>
        {!dataAvaiable ? (
          <div className="rule-group-exception-empty-state">
            <div className="rule-group-exception-header">
              {topLeftOptions}
            </div>
            <div className="rule-group-content">
              <EmptyImage />
              <div className="empty-msg">No Exception Found</div>
            </div>
          </div>
        ) : (
          <AgGridComponent
            customClass={actionColumnClasses.grid}
            columns={exceptionListColumns}
            selectAllHeaderComponent={enableEdit()}
            uniqueRowId={"key"}
            loadTableInstance={loadTableInstance}
            manualCallBack={(body, pageIndex, params) =>
              manualCallFetchExceptions(body, pageIndex, params)
            }
            rowModelType="serverSide"
            serverSideStoreType="partial"
            height={innerTableHeight}
            callOnModelUpdated={handleInnerModelUpdated}
            adjustTableHeightServerSide={true}
            cacheBlockSize={props.pageSize || 100}
            disablePaginationForSinglePage={true}
            enableChildRowSelection={props.showNewConstraintFlow}
            syncChildAndParentSelection={props.showNewConstraintFlow}
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
            topLeftOptions={topLeftOptions}
            cardContainer={false}
            // showDownloadButton={true}
            // onDownloadButtonClick={handleDownload}
            topRightOptions={renderTopRightOptions()}
          />
            )}
      </Loader>
    </div>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer } = store;
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
    savedEditedExceptions:
      inventorysmartReducer?.exceptionConstraintsReducer?.savedEditedExceptions,
    stateAfterExceptionUpdate:
      inventorysmartReducer?.exceptionConstraintsReducer
        ?.stateAfterExceptionUpdate,
    inventorysmartModulesPermission:
      inventorysmartReducer.inventorySmartCommonService
        .inventorysmartModulesPermission,
    pageSize:
      inventorysmartReducer.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.inventorysmart_page_count,
    exceptionConfigs:
      inventorysmartReducer?.exceptionConstraintsReducer?.exceptionConfigs,
    exceptionLoader:
      inventorysmartReducer?.exceptionConstraintsReducer?.exceptionLoader,
    showNewConstraintFlow:
      inventorysmartReducer?.inventorySmartConstraints?.showNewConstraintFlow,
  };
};

const mapDispatchToProps = (dispatch) => ({
  addSnack: (body) => dispatch(addSnack(body)),
  setExceptionTableLoader: (body) => dispatch(setExceptionTableLoader(body)),
  setExceptionTableData: (body) => dispatch(setExceptionTableData(body)),
  setAllModalVisibility: (body) => dispatch(setAllModalVisibility(body)),
  setAllModalData: (data) => dispatch(setAllModalData(data)),
  setSelectedExceptionList: (data) => dispatch(setSelectedExceptionList(data)),
  saveModifiedData: (data) => dispatch(saveEditedExceptions(data)),
  saveEditedExceptions: (data) => dispatch(saveEditedExceptions(data)),
  saveStateAfterExceptionUpdate: (data) =>
    dispatch(saveStateAfterExceptionUpdate(data)),
  downloadExceptionConstraints: (data) =>
    dispatch(downloadExceptionConstraints(data)),
  setExceptionConfigs: (body) => dispatch(setExceptionConfigs(body)),
  setConstraintsConfigs: (payload) => dispatch(setConstraintsConfigs(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(RuleGroupExceptionsTable);
