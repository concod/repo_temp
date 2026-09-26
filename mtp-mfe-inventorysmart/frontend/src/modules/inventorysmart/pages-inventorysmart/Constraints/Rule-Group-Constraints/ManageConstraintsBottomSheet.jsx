import React, { useEffect, useRef, useState, useCallback } from "react";
import { connect } from "react-redux";
import { BottomSheet, Button } from "impact-ui-v3";
import AgGridComponent from "core/Utils/agGrid";
import {Alert} from "impact-ui-v3";
import { getColumnsAg } from "actions/tableColumnActions";
import { useExceptionStyles } from "../../Exceptions-stores/exceptionStyles";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import Loader from "core/Utils/Loader/loader";
import InfoBanner from "../../Exceptions-stores/InfoBanner";
import { cloneDeep, isNull } from "lodash";
import { addSnack } from "core/actions/snackbarActions";
import { getRulesListData } from "../../../services-inventorysmart/Rules-Contraints/rules-contraints-services";
import {
  getRuleGroupRules,
  setManageConstraintsPreSelectedKeys,
  setManageConstraintsSelectedCount,
  setManageConstraintsLoading,
  resetManageConstraints,
  updateRuleGroupConstraints,
} from "../../../services-inventorysmart/Rule-Group-Constraints/rule-group-services";
import { addUniqueKeyToSubrows } from "modules/inventorysmart/utils-inventorysmart/utilityFunctions";
import { tableConfigurationMetaData } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { handleErrorMessage } from "../Rules-Constraints/add-rcl-component";
import moment from "moment";
import ExceptionDetailsBottomSheet from "./ExceptionDetailsBottomSheet";
import { statusBadgeCellRenderer, transformMinDistribution } from "./ruleGroupUtils";
import {
  renderParentDash,
  wrapColumnsWithEmptyCell,
  isConstraintColumn,
  isConstraintChildRow,
  applyNumericColumnAlignment,
  renderReadOnlyConstraintValue,
} from "../landing-screen/constraintsCommonUtils";
import { cellStyles, useRuleGroupStyles } from "./ruleGroupStyles";

const CONSTRAINTS_TABLE_NAME = "rules_constraint_table";

const renderConstraintCell = (cellProps, extraProps, column) => {
  if (
    column.column_name.includes("date")
  ) {
    return (
      <div style={cellStyles.constraintDateCell}>
        {moment(cellProps?.value).format(
          column?.extra?.dateFormat ||
            localStorage.getItem("tenantDateFormat") ||
            "MM-DD-YYYY"
        )}
      </div>
    );
  }
  if (!isConstraintChildRow(cellProps)) return renderParentDash(column);
  return <div>{cellProps?.value || ""}</div>;
};

const applyColumnRenderers = (data) => {
  data.is_editable = false;
  data.editable = false;

  applyNumericColumnAlignment(data);

  if (data?.column_name === "rule_code") {
    data.cellRenderer = "agGroupCellRenderer";
    data.rowGroup = true;
  }
  if (data?.column_name === "rule_name") {
    data.cellRenderer = (cellProps) => {
      if (cellProps.node.level !== 0) return <></>;
      return <div>{cellProps?.value || ""}</div>;
    };
  }
  if (data?.column_name === "exceptions") {
    data.type = "link";
    data.is_editable = true;
  }
  if (isConstraintColumn(data)) {
    data.cellRenderer = (cellProps, extraProps) =>
      renderConstraintCell(cellProps, extraProps, data);
  }
  if (data?.column_name === "end_date") {
    data.disablePast = true;
  }
  if (data?.column_name === "min_distribution") {
    data.is_aggregated = false;
    data.width = 470;
    data.minWidth = 200;
    data.extra = { ...data.extra, width: 470 };
    data.cellRenderer = (cellProps) => {
      if (!isConstraintChildRow(cellProps)) {
        return <>{"-"}</>;
      }
      return renderReadOnlyConstraintValue(cellProps, data);
    };
  }
  if (data?.column_name === "status") {
    data.cellRenderer = statusBadgeCellRenderer;
  }
  if (data?.column_name === "action") {
    data.is_hidden = true;
    data.suppressMenu = true;
  }

  const nestedColumns = data?.children?.length
    ? data.children
    : data?.sub_headers;
  nestedColumns?.forEach(applyColumnRenderers);
};

const applyCheckboxDisabledForDefaults = (rows = []) =>
  rows.map((row) => {
    const isDefault = Boolean(row?.is_default);
    return {
      ...row,
      // Keep checkbox visible but disabled for default rules (same as AllRulesTable).
      checkbox_disabled: isDefault,
      data: isDefault
        ? row.data?.map((subRow) => ({
            ...subRow,
            checkbox_disabled: true,
          }))
        : row.data,
    };
  });

// Flags rows whose key is pre-selected and records their original data so we can
// compute add/remove diffs later.
const markSelectedRows = (rows = [], keys = [], rowDataMap) => {
  const keySet = new Set(keys);
  return rows.map((row) => {
    const isSelected = keySet.has(row.key);
    if (isSelected && rowDataMap) rowDataMap.set(row.key, row);
    return { ...row, is_selected: isSelected };
  });
};

// Display order: selected rows first, then default (non-selectable) rows, then
// the rest. Lower rank = higher in the list.
const getRowDisplayRank = (row) => {
  if (row?.is_default) return 0;
  if (row?.is_selected) return 1;
  return 2;
};

// Array.prototype.sort is stable, so rows with the same rank keep their order.
const sortRowsForDisplay = (rows = []) =>
  [...rows].sort((a, b) => getRowDisplayRank(a) - getRowDisplayRank(b));

const ManageConstraintsBottomSheet = (props) => {
  const {
    open,
    onClose,
    selectedGroup,
    filters,
    rulesListStatus,
    preSelectedKeys,
    selectedCount,
    manageConstraintsLoading,
    onUpdateSuccess,
  } = props;

  const ruleGroupClasses = useRuleGroupStyles();
  const [columns, setColumns] = useState([]);
  const [showExceptionDetails, setShowExceptionDetails] = useState(false);
  const [selectedExceptionRule, setSelectedExceptionRule] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [hasSelectionChanged, setHasSelectionChanged] = useState(false);
  const agGridInstance = useRef(null);
  const columnsFetched = useRef(false);
  const preSelectedKeysRef = useRef(preSelectedKeys);
  const initialRowDataMap = useRef(new Map());
  const fetchKeysPromise = useRef(null);
  const useStyles = useExceptionStyles();
  

  useEffect(() => {
    preSelectedKeysRef.current = preSelectedKeys;
  }, [preSelectedKeys]);

  useEffect(() => {
    if (open) {
      if (!columnsFetched.current) {
        fetchColumns();
      }
      // Fetch keys in parallel — grid will await this before applying selection
      if (!preSelectedKeys.length && selectedGroup?.rule_list?.length) {
        fetchKeysPromise.current = fetchPreSelectedKeys();
      } else {
        fetchKeysPromise.current = null;
      }
    } else {
      props.resetManageConstraints();
      initialRowDataMap.current = new Map();
      fetchKeysPromise.current = null;
      setHasSelectionChanged(false);
      setShowExceptionDetails(false);
      setSelectedExceptionRule(null);
      setUpdating(false);
    }
  }, [open]);

  const fetchPreSelectedKeys = async () => {
    try {
      props.setManageConstraintsLoading(true);
      const response = await getRuleGroupRules({
        rule_list: selectedGroup.rule_list,
        meta: {
          ...tableConfigurationMetaData.meta,
          limit: {
            limit: props.pageSize || 100,
            page: 1,
          },
        },
      });
      if (response?.data?.data?.length) {
        const keys = response.data.data.map((row) => row.key).filter(Boolean);
        props.setManageConstraintsPreSelectedKeys(keys);
      }
    } catch (e) {
      handleErrorMessage(e, props);
    } finally {
      props.setManageConstraintsLoading(false);
    }
  };

  const onSelectionChanged = useCallback(
    (params) => {
      const selectedRows = params?.api?.getSelectedRows() || [];
      const count = selectedRows.length;
      props.setManageConstraintsSelectedCount(count);

      const currentKeys = new Set(selectedRows.map((r) => r.key));
      const initialKeys = preSelectedKeysRef.current;
      const changed =
        currentKeys.size !== initialKeys.length ||
        initialKeys.some((key) => !currentKeys.has(key));
      setHasSelectionChanged(changed);
    },
    [props.setManageConstraintsSelectedCount]
  );

  const fetchColumns = async () => {
    try {
      columnsFetched.current = true;
      const rawColumns = await getColumnsAg(
        `table_name=${CONSTRAINTS_TABLE_NAME}`
      )();
      rawColumns?.forEach(applyColumnRenderers);
      const actions = {
        exceptions: (rowData, columnName, item) => {
          onExceptionLinkClick(rowData);
        },
      };
      let formattedColumns = agGridColumnFormatter(rawColumns, null, actions);
      formattedColumns?.forEach((col) => {
        if (col.column_name === "status") {
          col.cellRenderer = statusBadgeCellRenderer;
        }
      });
      wrapColumnsWithEmptyCell(formattedColumns);
      setColumns(formattedColumns || []);
    } catch (e) {
      handleErrorMessage(e, props);
    }
  };

  const manualCallBack = async (manualbody, pageIndex, params) => {
    const body = {
      meta: {
        ...manualbody,
        limit: {
          limit: props.pageSize || 100,
          page: isNull(pageIndex) ? 1 : pageIndex + 1,
        },
      },
      filters: filters || [],
      selection: {
        data: [
          ...agGridInstance?.current?.api?.checkConfiguration,
          {
            checkedRows:
              agGridInstance?.current?.api
                ?.getSelectedRows()
                ?.map((item) => item.key) || [],
          },
        ],
        unique_columns: ["key"],
      },
      status: rulesListStatus || "all",
    };

    try {
      props.setManageConstraintsLoading(true);

      const response = await getRulesListData(body);

      // Wait for keys to be ready before processing selection on first page
      if (!pageIndex && fetchKeysPromise.current) {
        await fetchKeysPromise.current;
        fetchKeysPromise.current = null;
      }

      props.setManageConstraintsLoading(false);

      if (!response?.data?.data?.length) {
        return { data: [], totalCount: 0 };
      }

      response.data.data = transformMinDistribution(response.data.data);
      let result = applyCheckboxDisabledForDefaults(
        addUniqueKeyToSubrows(cloneDeep(response.data.data))
      );
      let formattedData;
      const keys = preSelectedKeysRef.current;

      if (pageIndex) {
        formattedData = agGridRowFormatter(
          sortRowsForDisplay(result),
          params?.api?.checkConfiguration,
          "key"
        );
      } else {
        if (keys.length) {
          params.api.setCheckConfiguration([{ checkedRows: keys }]);
          result = markSelectedRows(result, keys, initialRowDataMap.current);
        } else {
          params.api.setCheckConfiguration([]);
        }
        formattedData = sortRowsForDisplay(result);
      }

      return {
        data: formattedData,
        totalCount: response.data.total,
      };
    } catch (e) {
      props.setManageConstraintsLoading(false);
      handleErrorMessage(e, props);
      return { data: [], totalCount: 0 };
    }
  };

  const onExceptionLinkClick = useCallback((rowData) => {
    setSelectedExceptionRule(rowData);
    setShowExceptionDetails(true);
  }, []);

  const handleUpdateGroup = async () => {
    try {
      setUpdating(true);
      props.setManageConstraintsLoading(true);

      const currentSelectedRows = agGridInstance.current?.api?.getSelectedRows() || [];
      const currentSelectedKeys = new Set(currentSelectedRows.map((r) => r.key));
      const initialKeys = new Set(preSelectedKeysRef.current);

      const add_rules = [];
      const remove_rules = [];

      // Rules that are now selected but were not initially
      currentSelectedRows.forEach((row) => {
        if (!initialKeys.has(row.key)) {
          add_rules.push({
            psa_code: row.psa_code,
            rcl_code: row.rcl_code,
            rule_code: row.rule_code,
          });
        }
      });

      // Rules that were initially selected but are now deselected
      initialKeys.forEach((key) => {
        if (!currentSelectedKeys.has(key)) {
          const rowData = initialRowDataMap.current.get(key);
          if (rowData) {
            remove_rules.push({
              psa_code: rowData.psa_code,
              rcl_code: rowData.rcl_code,
              rule_code: rowData.rule_code,
            });
          }
        }
      });

      const payload = {
        group_id: selectedGroup?.group_id,
        add_rules,
        remove_rules,
      };

      const response = await updateRuleGroupConstraints(payload);
      if (response?.data?.status) {
        props.addSnack({
          message: response?.data?.message || "Group updated successfully",
          options: { variant: "success" },
        });
        props.setManageConstraintsPreSelectedKeys([]);
        onClose();
        if (onUpdateSuccess) onUpdateSuccess();
      } else {
        props.addSnack({
          message: response?.data?.message || "Failed to update group",
          options: { variant: "error" },
        });
      }
    } catch (e) {
      handleErrorMessage(e, props);
    } finally {
      setUpdating(false);
      props.setManageConstraintsLoading(false);
    }
  };

  const loadTableInstance = (params) => {
    agGridInstance.current = params;
  };

  if (!open) return null;

  return (<>
    <BottomSheet
      title="Modify Group"
      open={open}
      onClose={onClose}
      withExpandIcon={false}
      maxHeight={`calc(100vh - 200px)`}
      className={useStyles.exceptionBottomSheet}
      footerOptions={
        <div style={cellStyles.bottomSheetFooterActions}>
          <Button variant="url" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleUpdateGroup}
            disabled={!hasSelectionChanged || updating}
          >
            Update Group
          </Button>
        </div>
      }
    >
      <Loader loader={manageConstraintsLoading}>
        <AgGridComponent
          tableHeader={"All Constraints"}
          columns={columns}
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
          skipAutoSizeColumn={true}
          hideChildSelection={true}
          groupDisplayType={"custom"}
          suppressAggFuncInHeader={true}
          childKey={"data"}
          treeData={true}
          purgeClosedRowNodes={true}
          paginationPageSize={props.pageSize || 100}
          cardContainer={false}
          isInsideBottomSheet
          isBottomSheetExpanded={true}
          tableName={CONSTRAINTS_TABLE_NAME}
          aboveTableComponent={
            selectedCount > 0 ? (
              <div className={ruleGroupClasses.centeredAlert}
              >
                <Alert
                  onClose={() => props.setManageConstraintsSelectedCount(0)}
                  severity="info"
                  style={{borderRadius: "0px", border: "none"}}
                  title={`${selectedCount} Rule${selectedCount !== 1 ? "s" : ""} selected`}
                  subtleBackground
                />
              </div>
            ) : null
          }
        />
      </Loader>
    </BottomSheet>
    <ExceptionDetailsBottomSheet
      open={showExceptionDetails}
      onClose={() => {
        setShowExceptionDetails(false);
        setSelectedExceptionRule(null);
      }}
      ruleData={selectedExceptionRule}
      filters={filters}
    />
  </>);
};

const mapStateToProps = (store) => {
  const { manageConstraints } =
    store.inventorysmartReducer.ruleGroupService;
  return {
    preSelectedKeys: manageConstraints.preSelectedKeys,
    selectedCount: manageConstraints.selectedCount,
    manageConstraintsLoading: manageConstraints.loading,
    pageSize:
      store.inventorysmartReducer.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.inventorysmart_page_count,
  };
};

const mapDispatchToProps = (dispatch) => ({
  addSnack: (snack) => dispatch(addSnack(snack)),
  setManageConstraintsPreSelectedKeys: (keys) =>
    dispatch(setManageConstraintsPreSelectedKeys(keys)),
  setManageConstraintsSelectedCount: (count) =>
    dispatch(setManageConstraintsSelectedCount(count)),
  setManageConstraintsLoading: (flag) =>
    dispatch(setManageConstraintsLoading(flag)),
  resetManageConstraints: () => dispatch(resetManageConstraints()),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ManageConstraintsBottomSheet);
