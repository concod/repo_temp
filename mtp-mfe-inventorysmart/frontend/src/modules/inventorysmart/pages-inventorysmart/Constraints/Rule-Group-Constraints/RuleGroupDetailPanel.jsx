import React, { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import { Chips, Button, Tooltip } from "impact-ui-v3";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import { getColumnsAg } from "actions/tableColumnActions";
import Loader from "core/Utils/Loader/loader";
import EmptyImage from "assets/IS_icons/doggy.svg";
import { addSnack } from "core/actions/snackbarActions";
import AddActionButton from "modules/inventorysmart/components/ui-actions/AddActionButton";
import DeleteActionButton from "modules/inventorysmart/components/ui-actions/DeleteActionButton";
import SetAllModalComponent from "../../Common/components/Set-All-Modal-Component";
import {
  collectConstraintGridSelection,
  getRulesParentRowFields,
} from "../../Common/components/constraintSelectionUtils";
import RuleGroupExceptionsTable from "./RuleGroupExceptionsTable";
import {
  getRuleGroupRules,
  setManageConstraintsPreSelectedKeys,
  saveEditedRuleGroupRules,
} from "../../../services-inventorysmart/Rule-Group-Constraints/rule-group-services";
import {
  addUniqueKeyToSubrows,
  addChildRow,
  onDeleteClick,
  addDataToEditableState,
  checkRedundantDate,
  getPropsWithFreshEditedData,
  sortChildRowsByStartDate,
  getSizeBasedonRowHeight,
} from "modules/inventorysmart/utils-inventorysmart/utilityFunctions";
import {
  transformMinDistribution,
  statusBadgeCellRenderer,
  getDetailGridHeight,
} from "./ruleGroupUtils";
import { displaySnackMessages } from "../../inventorysmart-utility";
import { handleErrorMessage } from "../Rules-Constraints/add-rcl-component";
import {
  saveRuleName,
  saveSetAllModalData,
  setAllModalVisibility,
  setAllModalData,
  setSelectedRulesList,
} from "modules/inventorysmart/services-inventorysmart/Rules-Contraints/rules-contraints-services";
import {
  saveEditedExceptions,
  setSelectedExceptionList,
  setAllModalVisibility as setExceptionSetAllModalVisibility,
} from "modules/inventorysmart/services-inventorysmart/Exception-Constriants/exception-constraint-services";
import { cloneDeep, isNull } from "lodash";
import CellRenderers from "core/Utils/agGrid/cellRenderer";
import moment from "moment";
import {
  renderParentDash,
  wrapColumnsWithEmptyCell,
  isConstraintColumn,
  isConstraintChildRow,
  applyActionColumnLayout,
  formatActionColumn,
  renderReadOnlyConstraintValue,
  useConstraintsActionColumnStyles,
} from "../landing-screen/constraintsCommonUtils";
import NewMinDistributionModal from "../create-new-rule-flow/min-distribution/NewMinDistributionModal";
import { useRuleGroupStyles, cellStyles } from "./ruleGroupStyles";
import InfoBanner from "../../Exceptions-stores/InfoBanner";
import ConfirmBox from "core/Utils/confirmPrompt/confirmPopup";
import UpViewIcon from "assets/up_view.svg";
import { hasNestedStyleSizeMinDistribution } from "../create-new-rule-flow/createNewRuleConstraintsUtils";
import { useStyles as useInventorySmartStyles } from "modules/inventorysmart/styles/inventorySmartUseStyles";

const DETAIL_OPTIONS = [
  { label: "Constraints", value: "constraints" },
  { label: "Exceptions", value: "exceptions" },
];

const CONSTRAINTS_TABLE_NAME = "rules_constraint_table";

const isConstraintParentRow = (cellProps) => {
  const node = cellProps?.node;
  if (!node) return false;
  return Array.isArray(node.data?.data) && !isConstraintChildRow(cellProps);
};

// Renders a constraint cell: plain text for default-parent / non-child rows,
// otherwise the inline editor (CellRenderers) for editable child rows.
const renderConstraintCell = (cellProps, extraProps, column) => {
  if (
    cellProps?.node?.parent?.data?.is_default &&
    column.column_name.includes("date")
  ) {
    return (
      <div style={cellStyles.constraintDateCell}>
        {cellProps?.value
          ? moment(cellProps.value).format(
              localStorage.getItem("tenantDateFormat") || "MM-DD-YYYY"
            )
          : ""}
      </div>
    );
  }
  if (!isConstraintChildRow(cellProps)) return renderParentDash(column);
  if (cellProps?.node?.parent?.data?.is_default) {
    return <div>{cellProps?.value || ""}</div>;
  }
  return (
    <CellRenderers cellData={cellProps} column={column} extraProps={extraProps} />
  );
};

const RuleGroupDetailPanel = (props) => {
  const { data } = props;
  const classes = useRuleGroupStyles();
  const actionColumnClasses = useConstraintsActionColumnStyles();
  const groupId = data?.group_id;
  const filterDependencies = useRef(props.selectedDependencyValue || {});

  const [activeTab, setActiveTab] = useState("constraints");
  const [constraintsColumns, setConstraintsColumns] = useState([]);
  const [constraintsLoading, setConstraintsLoading] = useState(false);
  const [innerTableHeight, setInnerTableHeight] = useState("62px");
  const [mounted, setMounted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deSelectedRows, setDeselectedRows] = useState([]);
  const [selectedParentAndChildRows, setSelectedParentAndChildRows] = useState([]);
  const [showModifiedBanner, setShowModifiedBanner] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [dataAvaiable, setDataAvailable] = useState(true);
  const [minDistributionModalStatus, setMinDistributionModalStatus] = useState(
    false
  );
  const [minDistributionRowData, setMinDistributionRowData] = useState({});
  const inventorySmartClasses = useInventorySmartStyles();

  // Show info banner when the group was modified by someone else
  const createdBy = data?.created_by;
  const updatedBy = data?.updated_by;
  const isModifiedByOthers =
    createdBy != null &&
    updatedBy!= null && (Number(createdBy) !== Number(updatedBy));

  const agGridInstance = useRef(null);
  const columnsFetchedRef = useRef(false);
  const savedEditedDataRef = useRef(props.savedEditedData || []);

  useEffect(() => {
    savedEditedDataRef.current = props.savedEditedData || [];
  }, [props.savedEditedData]);

  useEffect(() => {
    filterDependencies.current = props.selectedDependencyValue || {};
    props.saveModifiedData([]);
    props.clearExceptionEdits([]);
    savedEditedDataRef.current = [];
    props.setSelectedRulesList([]);
    setDeselectedRows([]);
    const gridApi = agGridInstance.current?.api;
    if (!gridApi) {
      return undefined;
    }
    const timeoutId = setTimeout(() => {
      gridApi.refreshServerSideStore({ purge: true });
      gridApi.deselectAll();
    }, 0);
    return () => clearTimeout(timeoutId);
  }, [props.selectedDependencyValue]);

  const handleOptionChange = (value) => {
    // Reset constraints tab shared Redux states
    props.saveModifiedData([]);
    props.setSelectedRulesList([]);
    props.setAllModalVisibility(false);
    // Reset exceptions tab shared Redux states
    props.clearExceptionEdits([]);
    props.clearExceptionSelection([]);
    props.setExceptionSetAllModalVisibility(false);
    setSelectedParentAndChildRows([]);
    setDeselectedRows([]);
    setActiveTab(value);
  };

  // Pre-formatter pass on RAW columns: set flags the column-formatter consumes.
  const applyPreFormatter = (col) => {
    if (!col) return;
    const nested = col?.sub_headers?.length ? col.sub_headers : col?.children;
    if (col.column_name === "end_date") col.disablePast = true;
    if (col.column_name === "min_distribution") col.is_aggregated = false;
    if (nested?.length) nested.forEach(applyPreFormatter);
  };

  // Post-formatter pass: node-based cell renderers for the server-side tree.
  const applyPostFormatter = (col) => {
    if (!col) return;
    if (col.children?.length) {
      col.children.forEach(applyPostFormatter);
      return;
    }
    const colName = col.column_name || col.field;
    if (colName === "rule_code") {
      col.cellRenderer = "agGroupCellRenderer";
      col.rowGroup = true;
    }
    if (colName === "rule_name") {
      col.editable = false;
      col.cellRenderer = (cellProps, extraProps) => {
        if (cellProps.node.level !== 0) return <></>;
        if (cellProps?.node?.data?.is_default) {
          return <div>{cellProps?.value || ""}</div>;
        }
        return (
          <CellRenderers
            cellData={cellProps}
            column={col}
            extraProps={extraProps}
          />
        );
      };
    }
    if (isConstraintColumn(col)) {
      // Disable AG Grid's native cell editing so the inline CellRenderers own
      // the editing UX (date picker / steppers) and commit via
      // node.setDataValue -> onCellValueChanged. `is_editable` stays truthy so
      // the column is still included in the save payload.
      col.editable = false;
      col.cellRenderer = (cellProps, extraProps) =>
        renderConstraintCell(cellProps, extraProps, col);
    }
    if (colName === "status") {
      col.cellRenderer = statusBadgeCellRenderer;
    }
    if (colName === "min_distribution") {
      col.is_aggregated = false;
      col.width = 470;
      col.minWidth = 470;
      col.extra = { ...col.extra, width: 470 };
      col.cellRenderer = (cellProps, extraProps) => {
        if (!isConstraintChildRow(cellProps)) {
          return renderParentDash(col);
        }
        if (
          !cellProps?.node?.parent?.data?.is_default
        ) {
          const hasDetails = hasNestedStyleSizeMinDistribution(cellProps?.data);
          return (
            <div className={inventorySmartClasses.minDistributionCell}>
              <div className={inventorySmartClasses.minDistributionCellContent}>
                <CellRenderers
                  cellData={cellProps}
                  column={col}
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
        return cellProps.node.level !== 0 ? (
          renderReadOnlyConstraintValue(cellProps, col)
        ) : (
          "-"
        );
      };
      col.onClick = (tableInfo) => {
        setMinDistributionRowData(tableInfo.cellData);
        setMinDistributionModalStatus(true);
      };
    }
    if (colName === "action") {
      applyActionColumnLayout(col);
      col.cellRenderer = (params) => {
        if (params.node.level !== 0) {
          return (
            <div>
              <DeleteActionButton
                iconOnly
                plainHover
                onClick={() =>
                  onDeleteClick(getPropsWithFreshEditedData(props, savedEditedDataRef), params, agGridInstance, filterDependencies, deSelectedRows)
                }
                disabled={
                  params?.node?.parent?.data?.data?.length === 1 ||
                  params?.node?.parent?.data?.is_default
                }
                size={getSizeBasedonRowHeight(params)}
              />
            </div>
          );
        }
        return (
          <div>
            <AddActionButton
              iconOnly
              plainHover
              onClick={() =>
                addChildRow(
                  getPropsWithFreshEditedData(props, savedEditedDataRef),
                  params,
                  agGridInstance,
                  filterDependencies,
                  deSelectedRows,
                  {
                    useNestedMinDistribution: Boolean(
                      props.showNewConstraintFlow
                    ),
                  }
                )
              }
              disabled={
                params?.node?.data?.data?.length > 4 ||
                params?.node?.data?.is_default
              }
            />
          </div>
        );
      };
    }
  };

  const fetchColumns = async () => {
    if (columnsFetchedRef.current) return;
    columnsFetchedRef.current = true;
    try {
      const rawColumns = await getColumnsAg(
        `table_name=${CONSTRAINTS_TABLE_NAME}`
      )();
      rawColumns?.forEach(applyPreFormatter);
      const formattedColumns = agGridColumnFormatter(rawColumns);
      formattedColumns?.forEach(applyPostFormatter);
      wrapColumnsWithEmptyCell(formattedColumns);
      setConstraintsColumns(formatActionColumn(formattedColumns) || []);
    } catch (e) {
      handleErrorMessage(e, props);
    }
  };

  // Server-side data source. getRuleGroupRules returns the group's full rule
  // set; AG Grid handles the tree natively via childKey="data".
  const manualCallBack = async (manualbody, pageIndex, params) => {
    setConstraintsLoading(true);
    try {
      const ruleList = data?.rule_list || [];
      const body = {
        rule_list: ruleList,
        meta: {
          ...manualbody,
          limit: {
            limit: props.pageSize || 100,
            page: isNull(pageIndex) ? 1 : pageIndex + 1,
          },
        },
      };
      const response = await getRuleGroupRules(body);
      setConstraintsLoading(false);
      if (!response?.data?.data?.length) {
        setDataAvailable(false);
        return { data: [], totalCount: 0 };
      }
      // Sort child rows by start_date for each parent row
      response.data.data = response.data.data.map(row => ({
        ...row,
        data: row.data ? sortChildRowsByStartDate(row.data) : row.data
      }));
      // Preselect this group's rules for the Manage Constraints flow.
      const keys = response.data.data.map((row) => row.key).filter(Boolean);
      props.setManageConstraintsPreSelectedKeys(keys);

      response.data.data = transformMinDistribution(response.data.data);
      const result = addUniqueKeyToSubrows(cloneDeep(response.data.data));

      let formattedData;
      if (pageIndex) {
        formattedData = agGridRowFormatter(
          result,
          params?.api?.checkConfiguration,
          "key"
        );
      } else {
        params.api.setCheckConfiguration([]);
        formattedData = result;
      }
      return {
        data: formattedData,
        totalCount: response.data.total || result.length,
      };
    } catch (e) {
      setConstraintsLoading(false);
      handleErrorMessage(e, props);
      return { data: [], totalCount: 0 };
    }
  };

  const loadTableInstance = (params) => {
    agGridInstance.current = params;
  };

  const handleInnerModelUpdated = (params) => {
    setInnerTableHeight(getDetailGridHeight(params));
  };

  useEffect(() => {
    // Defer inner grid mounting until the outer grid has finished its current
    // row-drawing/layout pass. With detailRowAutoHeight, the outer grid renders
    // this detail synchronously to measure height; mounting an inner AG Grid in
    // that stage triggers "cannot get grid to draw rows when it is in the middle
    // of drawing rows". A double rAF guarantees we run after the outer grid's
    // render + layout completes.
    let rafId1;
    let rafId2;
    rafId1 = window.requestAnimationFrame(() => {
      rafId2 = window.requestAnimationFrame(() => setMounted(true));
    });
    fetchColumns();

    return () => {
      if (rafId1) window.cancelAnimationFrame(rafId1);
      if (rafId2) window.cancelAnimationFrame(rafId2);
    };
  }, []);

  const onSelectionChanged = (event) => {
    const { selectedRows, deSelections, nestedSelection } =
      collectConstraintGridSelection({
        api: agGridInstance?.current?.api,
        event,
        isParentRow: (node) => isConstraintParentRow({ node }),
        getParentRowFields: getRulesParentRowFields,
        deselectionFields: ["rule_code", "psa_code"],
      });

    props?.setSelectedRulesList(selectedRows);
    setDeselectedRows(deSelections);
    setSelectedParentAndChildRows(nestedSelection);
  };

  const handleSaveSetAllModalData = async (...args) => {
    const response = await saveSetAllModalData(...args);
    props.saveModifiedData([]);
    return response;
  };

  // Commit an inline edit to a child (constraint) row and build the save
  // payload via the shared addDataToEditableState (same logic AllRulesTable
  // uses). Parent rows aren't editable here, so rule_name is skipped.
  const saveTheEditedRules = (params) => {
    if (params.column.colId === "rule_name") return;
    const { oldValue, newValue, data: rowData } = params;
    const fieldId = params?.colDef?.id;
    const label = params?.colDef?.label || fieldId;
    const tenantDateFormat =
      localStorage.getItem("tenantDateFormat") || "MM-DD-YYYY";

    if (oldValue !== newValue && !isNull(newValue) && newValue !== "") {
      params?.node?.setDataValue(fieldId, newValue);
      // Keep the parent node's nested `data` array in sync with the edited child
      // so add/delete/save read the latest values.
      const parentNode = params.node.parent;
      if (parentNode && parentNode?.data) {
        const parentData = { ...parentNode.data };
        const childIndex = parentData?.data?.findIndex(
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
          return params?.node?.setDataValue(fieldId, null);
        }
        const endDate = new Date(params?.data?.end_date);
        const startDate = new Date(params?.data?.start_date);
        if (!isNull(params?.data?.end_date) && endDate < startDate) {
          displaySnackMessages(
            `End date cannot be less than start date`,
            "error",
            props
          );
          return params?.node?.setDataValue("end_date", params?.data?.start_date);
        }
        const isRedundant = checkRedundantDate(
          params?.node?.parent?.data?.data,
          newValue,
          fieldId,
          rowData
        );
        if (isRedundant) {
          displaySnackMessages(
            `Please choose dates that are not in the same range for ${label}.`,
            "error",
            props
          );
          return params?.node?.setDataValue(fieldId, null);
        }
        addDataToEditableState(
          getPropsWithFreshEditedData(props, savedEditedDataRef),
          params,
          rowData,
          agGridInstance,
          filterDependencies,
          deSelectedRows
        );
      } else if (fieldId === "min_stock" || fieldId === "max_stock") {
        const min = Number(fieldId === "min_stock" ? newValue : rowData.min_stock);
        const max = Number(fieldId === "max_stock" ? newValue : rowData.max_stock);
        if (!isNaN(min) && !isNaN(max) && min > max) {
          displaySnackMessages(
            `Min stock cannot be greater than Max stock`,
            "error",
            props
          );
          return params?.node?.setDataValue(
            fieldId,
            isNull(oldValue) ? null : oldValue
          );
        }
        addDataToEditableState(
          getPropsWithFreshEditedData(props, savedEditedDataRef),
          params,
          rowData,
          agGridInstance,
          filterDependencies,
          deSelectedRows
        );
      } else {
        addDataToEditableState(
          getPropsWithFreshEditedData(props, savedEditedDataRef),
          params,
          rowData,
          agGridInstance,
          filterDependencies,
          deSelectedRows
        );
      }
    } else if (oldValue !== newValue && newValue === "") {
      displaySnackMessages(
        `Cannot have null values in ${label}`,
        "error",
        props
      );
      return params?.node?.setDataValue(
        fieldId,
        isNull(oldValue) ? null : oldValue
      );
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

  // Persist all inline edits captured in redux (savedEditedData) via the same
  // save API that was already integrated. Each entry is a ready-to-send payload
  // built by addDataToEditableState.
  const handleApplyEdits = async () => {
    const payloads = savedEditedDataRef.current || [];
    if (!payloads.length) return;
    setSaving(true);
    setConstraintsLoading(true);
    try {
      const results = await Promise.all(
        payloads.map((p) => saveSetAllModalData({
          ...p,
          is_all_records_selected: p.is_all_records_selected ?? false,
          excluded_rows: p.excluded_rows ?? [],
        }))
      );
      const allSuccess = results.every((r) => r?.data?.status);
      if (allSuccess) {
        displaySnackMessages("Changes saved successfully", "success", props);
        props.saveModifiedData([]);
        agGridInstance.current?.api?.refreshServerSideStore({ purge: true });
      } else {
        displaySnackMessages("Failed to save changes", "error", props);
      }
    } catch (e) {
      displaySnackMessages("Failed to save changes", "error", props);
    } finally {
      setSaving(false);
      setConstraintsLoading(false);
    }
  };

  const saveRuleNameOnBlur = async (
    params,
    row,
    column,
    isChanged,
    value,
    initialValue
  ) => {
    if (column.colId === "rule_name" && isChanged && value !== initialValue) {
      const payload = {
        rule_name: params?.target?.value,
        rule_code: row?.rule_code,
      };
      setConstraintsLoading(true);
      try {
        const response = await saveRuleName(payload);
        if (response?.data?.message) {
          displaySnackMessages(response?.data?.message, "success", props);
        }
        agGridInstance.current?.api?.refreshServerSideStore({ purge: true });
      } catch (e) {
        displaySnackMessages("Failed to save rule name", "error", props);
      } finally {
        setConstraintsLoading(false);
      }
    }
  };

  useEffect(() => {
    if (isModifiedByOthers) setShowModifiedBanner(true);
  }, [isModifiedByOthers]);

  const getTopCenterOptions = () => {
    if (!showModifiedBanner) return null;
    return (
      <InfoBanner
        message="Some Rules in this group have been modified by others."
        variant="info"
        onClose={() => setShowModifiedBanner(false)}
      />
    );
  };

  const handleCancelEdits = () => {
    props.saveModifiedData([]);
    agGridInstance.current?.api?.refreshServerSideStore?.({ purge: true });
    setShowCancelConfirm(false);
  };

  const getConstraintsTopRightOptions = () => {
    const hasSelectedRows =
      props.selectedPlan?.length > 0 ||
      agGridInstance?.current?.api?.isSelectAllRecords;
    const hasPendingEdits = props.savedEditedData?.length > 0;

    if (!hasSelectedRows && !hasPendingEdits) return null;

    return (
      <>
        {hasSelectedRows && (
          <Button
            id="set-all-rule-group-constraints-btn"
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
              id="cancel-rule-group-constraints-btn"
              variant="tertiary"
              size="large"
              onClick={() => setShowCancelConfirm(true)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              id="apply-rule-group-constraints-btn"
              variant="primary"
              size="large"
              onClick={handleApplyEdits}
              disabled={saving}
            >
              Apply
            </Button>
          </>
        )}
      </>
    );
  };

  const getTopLeftOptions = () => {
    return DETAIL_OPTIONS.map((option) => (
      <Chips
        key={option.value}
        label={option.label}
        type="single"
        isActive={activeTab === option.value}
        onClick={() => handleOptionChange(option.value)}
      />
    ));
  };
  return (
    <div className={classes.detailPanelWrapper1}>
      <div className={classes.detailPanelWrapper}>
        {showCancelConfirm && (
          <ConfirmBox
            onClose={() => setShowCancelConfirm(false)}
            onConfirm={handleCancelEdits}
          />
        )}
        {activeTab === "constraints" && mounted && (
          <Loader loader={constraintsLoading} minHeight={innerTableHeight}>
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
                props?.setSelectedRulesList([]);
                agGridInstance.current?.api?.refreshServerSideStore({
                  purge: true,
                });
              }}
              excludeDeselections={true}
              deSelectedRows={deSelectedRows}
              setDeselectedRows={setDeselectedRows}
              relativeWosMessage={[
                        "In Relative change, values will be added to/subtracted from current WOS.",
                        "In Relative change, WOS values will be adjusted for the relevant Rule-Store combinations in the exception screen as well.",
              ]}
              disableRelativeWos={
                props?.constraintsConfigs?.isRelativeWOSdisabled || false
              }
              addSnack={props?.addSnack}
            />
            {!dataAvaiable ? (
              <div className="rule-group-exception-empty-state">
                <div className="rule-group-exception-header">
                  {getTopLeftOptions()}
                </div>
                <div className="rule-group-content">
                  <EmptyImage />
                  <div className="empty-msg">No Exception Found</div>
                </div>
              </div>
            ) : (
              <>
                {(props?.constraintsConfigs?.showSingleMergedRows || true) && (
                  <NewMinDistributionModal
                    isModalOpen={minDistributionModalStatus}
                    setIsModalOpen={setMinDistributionModalStatus}
                    rowData={minDistributionRowData}
                    filters={filterDependencies?.current?.filters}
                    addDataToEditableState={addDataToEditableState}
                    handleMinDistributionSave={handleMinDistributionSave}
                    flow={"rules_constraint_list"}
                  />
                )}
                <AgGridComponent
                  customClass={actionColumnClasses.grid}
                  columns={constraintsColumns}
                  uniqueRowId={"key"}
                  rowModelType="serverSide"
                  serverSideStoreType="partial"
                  selectAllHeaderComponent={true}
                  cacheBlockSize={props.pageSize || 100}
                  disablePaginationForSinglePage={true}
                  loadTableInstance={loadTableInstance}
                  manualCallBack={(body, pageIndex, params) =>
                    manualCallBack(body, pageIndex, params)
                  }
                  onSelectionChanged={onSelectionChanged}
                  height={innerTableHeight}
                  callOnModelUpdated={handleInnerModelUpdated}
                  adjustTableHeightServerSide={true}
                  onCellValueChanged={(params) => saveTheEditedRules(params)}
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
                  skipAutoSizeColumn={true}
                  hideChildSelection={true}
                  groupDisplayType={"custom"}
                  suppressAggFuncInHeader={true}
                  enableChildRowSelection={props.showNewConstraintFlow}
                  syncChildAndParentSelection={props.showNewConstraintFlow}
                  childKey={"data"}
                  treeData={true}
                  purgeClosedRowNodes={true}
                  paginationPageSize={props.pageSize || 100}
                  topLeftOptions={getTopLeftOptions()}
                  topCenterOptions={getTopCenterOptions()}
                  topRightOptions={getConstraintsTopRightOptions()}
                  cardContainer={false}
                  tableName={CONSTRAINTS_TABLE_NAME}
                />
              </>
            )}
          </Loader>
        )}
        {activeTab === "exceptions" && mounted && (
          <RuleGroupExceptionsTable
            groupId={groupId}
            module={props?.module}
            history={props?.history}
            ruleList={data?.rule_list}
            filters={props.selectedDependencyValue?.filters}
            topLeftOptions={getTopLeftOptions()}
          />
        )}
      </div>
    </div>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer } = store;
  return {
    savedEditedData:
      inventorysmartReducer?.ruleGroupService?.editedRuleGroupRules || [],
    pageSize:
      inventorysmartReducer.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.inventorysmart_page_count,
    isSetAllModalVisible:
      inventorysmartReducer?.rulesConstraintsReducer?.isSetAllModalVisible,
    savedSetAllModalData:
      inventorysmartReducer?.rulesConstraintsReducer?.rulesSetAllModalData,
    selectedPlan:
      inventorysmartReducer?.rulesConstraintsReducer?.selectedRulesPlan,
    constraintsConfigs:
      inventorysmartReducer?.inventorySmartConstraints?.constraintsConfigs,
    showNewConstraintFlow:
      inventorysmartReducer?.inventorySmartConstraints?.showNewConstraintFlow,
  };
};

const mapDispatchToProps = (dispatch) => ({
  addSnack: (snack) => dispatch(addSnack(snack)),
  setManageConstraintsPreSelectedKeys: (keys) =>
    dispatch(setManageConstraintsPreSelectedKeys(keys)),
  saveModifiedData: (data) => dispatch(saveEditedRuleGroupRules(data)),
  clearExceptionEdits: (data) => dispatch(saveEditedExceptions(data)),
  clearExceptionSelection: (data) => dispatch(setSelectedExceptionList(data)),
  setExceptionSetAllModalVisibility: (body) =>
    dispatch(setExceptionSetAllModalVisibility(body)),
  setSelectedRulesList: (body) => dispatch(setSelectedRulesList(body)),
  setAllModalVisibility: (body) => dispatch(setAllModalVisibility(body)),
  setAllModalData: (data) => dispatch(setAllModalData(data)),
});

export default connect(mapStateToProps, mapDispatchToProps)(RuleGroupDetailPanel);
