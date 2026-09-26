import React, { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import { cloneDeep } from "lodash";
import { makeStyles } from "@mui/styles";
import globalStyles from "core/Styles/globalStyles";
import Loader from "core/Utils/Loader/loader";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import axiosInstance from "core/Utils/axios";
import { GET_COLUMNS } from "config/api";
import { addSnack } from "core/actions/snackbarActions";
import { Button, useTranslation } from "impact-ui-v3";
import { displaySnackMessages } from "../../inventorysmart-utility";
import { ERROR_MESSAGE } from "../../../constants-inventorysmart/stringConstants";
import {
  applyDCTransferConfigurationSetAll,
  fetchDCTransferConfigurationsList,
} from "../../../services-inventorysmart/DC-Transfer-Configuration/dc-transfer-configuration-service";
import {
  DC_TRANSFER_CONFIGURATION_FULFILLMENT_TYPE_COLUMN,
  DC_TRANSFER_CONFIGURATION_RULE_ID_FIELD,
  DC_TRANSFER_CONFIGURATION_RULE_NAME_COLUMN,
  DC_TRANSFER_CONFIGURATION_SET_ALL_ATTRIBUTES,
  DC_TRANSFER_CONFIGURATION_UNIQUE_ROW_ID,
  NUMERIC_INLINE_FIELDS,
} from "../../DC-Transfer-Configuration/constants";
import { fetchDCTransferRules } from "../../../services-inventorysmart/DC-Transfer-Rule/dc-transfer-rule";
import {
  buildInlineSetAllPayload,
  buildSetAllUpdateAttributes,
  configureRuleNameColumnDef,
  enrichRowWithRuleDropdownOptions,
  findMatchedRuleOption,
  findRuleById,
  getConfigurationSelectAllContext,
  getColumnField,
  getInlineComparableValue,
  getInlineUpdateAttributes,
  mapRulesToDropdownOptions,
  applyRuleSelectionToCell,
  syncInlineRuleRowData,
} from "../../DC-Transfer-Configuration/common-functions";
import { CREATE_DC_TRANSFER_ALLOCATION_TABLE_CONFIG_NAME } from "../constants";
import { applyFulfillmentTypeTextColumn } from "../fulfillmentTypeText";
import CreateDcTransferSetAll from "./CreateDcTransferSetAll";
import RuleNameDropdownWithEyeCell from "./RuleNameDropdownWithEyeCell";
import DcTransferRuleMappingBottomSheet from "./DcTransferRuleMappingBottomSheet";

const useStyles = makeStyles(() => ({
  tableContainer: {
    minHeight: "500px",
    width: "100%",
  },
  "@global": {
    ".ag-cell.dc-transfer-rule-name-cell": {
      overflow: "visible",
      display: "flex",
      alignItems: "center",
    },
  },
}));

const parseConfigurationListResponse = (response) => {
  const payload = response?.data;
  const responseData = payload?.data;
  const rows = Array.isArray(responseData)
    ? responseData
    : Array.isArray(responseData?.data)
      ? responseData.data
      : [];

  const rawTotal = payload?.total ?? payload?.count;
  let totalCount = rows.length;
  if (rawTotal !== null && rawTotal !== undefined && rawTotal !== "") {
    const parsed = Number(rawTotal);
    if (Number.isFinite(parsed)) {
      totalCount = parsed;
    }
  }

  return {
    rows,
    totalCount,
    status: payload?.status,
    message: payload?.message,
  };
};

const RULE_NAME_DROPDOWN_WIDTH = 184;
const RULE_NAME_COLUMN_WIDTH_WITH_EYE = RULE_NAME_DROPDOWN_WIDTH + 32;

const isRuleNameColumnDef = (column = {}) =>
  column?.column_name === DC_TRANSFER_CONFIGURATION_RULE_NAME_COLUMN ||
  column?.field === DC_TRANSFER_CONFIGURATION_RULE_NAME_COLUMN;

const applyRuleNameColumnWithEyeRenderer = (columns = [], cellRendererParams = {}) =>
  columns.map((column) => {
    let nextColumn = { ...column };

    if (nextColumn.children?.length) {
      nextColumn.children = applyRuleNameColumnWithEyeRenderer(
        nextColumn.children,
        cellRendererParams
      );
    }

    if (nextColumn.sub_headers?.length) {
      nextColumn.sub_headers = applyRuleNameColumnWithEyeRenderer(
        nextColumn.sub_headers,
        cellRendererParams
      );
    }

    if (!isRuleNameColumnDef(nextColumn)) {
      return nextColumn;
    }

    return {
      ...nextColumn,
      cellRenderer: RuleNameDropdownWithEyeCell,
      cellRendererParams,
      width: RULE_NAME_COLUMN_WIDTH_WITH_EYE,
      minWidth: RULE_NAME_COLUMN_WIDTH_WITH_EYE,
      suppressSizeToFit: true,
      cellClass: `${nextColumn.cellClass || ""} dc-transfer-rule-name-cell`.trim(),
      extra: {
        ...nextColumn.extra,
        width: RULE_NAME_COLUMN_WIDTH_WITH_EYE,
      },
    };
  });

const CreateDcTransferConfigurationTable = (props) => {
  const { t } = useTranslation();
  const globalClasses = globalStyles();
  const classes = useStyles();
  const agGridInstance = useRef(null);
  const tableNameRef = useRef(props.tableName);
  const ruleOptionsRef = useRef([]);
  const dcTransferRulesRef = useRef([]);
  const inlineEditInFlightRef = useRef(new Set());
  const viewRuleClickRef = useRef(null);
  const [tableColumns, setTableColumns] = useState([]);
  const [tableLoader, setTableLoader] = useState(false);
  const [selectedRows, setSelectedRows] = useState([]);
  const [showSetAllPanel, setShowSetAllPanel] = useState(false);
  const [ruleMappingSheet, setRuleMappingSheet] = useState({
    open: false,
    ruleId: null,
    ruleName: "",
    fulfillmentType: "",
  });

  useEffect(() => {
    tableNameRef.current = props.tableName;
    if (props.tableName && agGridInstance.current?.api) {
      agGridInstance.current.api.refreshServerSideStore({ purge: true });
    }
  }, [props.tableName]);

  const handleErrorMessage = (error) => {
    const errObj = error?.response?.data;
    if (errObj?.show_message) {
      displaySnackMessages(errObj?.message, "error", props);
    } else {
      displaySnackMessages(ERROR_MESSAGE, "error", props);
    }
  };

  const handleViewRuleClick = (rowData) => {
    const matchedOption = findMatchedRuleOption(
      rowData,
      ruleOptionsRef.current
    );
    const ruleId =
      matchedOption?.value ??
      rowData?.[DC_TRANSFER_CONFIGURATION_RULE_ID_FIELD] ??
      rowData?.rule_id;

    if (ruleId === undefined || ruleId === null || ruleId === "") {
      return;
    }

    const matchedRule = findRuleById(ruleId, dcTransferRulesRef.current);
    const ruleName =
      matchedOption?.label ??
      matchedRule?.rule_name ??
      (typeof rowData?.[DC_TRANSFER_CONFIGURATION_RULE_NAME_COLUMN] ===
      "object"
        ? rowData?.[DC_TRANSFER_CONFIGURATION_RULE_NAME_COLUMN]?.label
        : rowData?.[DC_TRANSFER_CONFIGURATION_RULE_NAME_COLUMN]) ??
      "";
    const fulfillmentType =
      matchedRule?.fulfillment_type ??
      rowData?.[DC_TRANSFER_CONFIGURATION_FULFILLMENT_TYPE_COLUMN];

    setRuleMappingSheet({
      open: true,
      ruleId,
      ruleName,
      fulfillmentType,
    });
  };

  const closeRuleMappingSheet = () => {
    setRuleMappingSheet({
      open: false,
      ruleId: null,
      ruleName: "",
      fulfillmentType: "",
    });
  };

  viewRuleClickRef.current = handleViewRuleClick;

  const fetchTableColumns = async () => {
    try {
      setTableLoader(true);
      const [columnsResponse, rulesResponse] = await Promise.all([
        axiosInstance({
          url: `${GET_COLUMNS}?table_name=${CREATE_DC_TRANSFER_ALLOCATION_TABLE_CONFIG_NAME}`,
          method: "GET",
        }),
        props.fetchDCTransferRules(),
      ]);

      const rules = rulesResponse?.data?.data || [];
      dcTransferRulesRef.current = rules;
      const ruleOptions = mapRulesToDropdownOptions(rules);
      ruleOptionsRef.current = ruleOptions;

      const rawColumns = cloneDeep(columnsResponse?.data?.data || []);
      configureRuleNameColumnDef(rawColumns, ruleOptions);
      const formattedColumns = agGridColumnFormatter(
        rawColumns,
        null,
        null,
        null,
        null,
        false,
        false,
        false,
        false,
        true
      );

      const ruleRendererParams = {
        onViewRule: (rowData) => viewRuleClickRef.current?.(rowData),
        getRuleOptions: () => ruleOptionsRef.current,
      };

      const columnsWithRuleEye = applyRuleNameColumnWithEyeRenderer(
        formattedColumns,
        ruleRendererParams
      );
      setTableColumns(applyFulfillmentTypeTextColumn(columnsWithRuleEye));
    } catch (error) {
      handleErrorMessage(error);
    } finally {
      setTableLoader(false);
    }
  };

  const loadTableInstance = (params) => {
    agGridInstance.current = params;
  };

  const onSelectionChanged = (params) => {
    const selectedNodes = params?.api?.getSelectedNodes();
    const actuallySelectedNodes =
      selectedNodes?.filter((node) => node?.isSelected()) || [];
    const selectedData = actuallySelectedNodes.map((node) => node?.data);
    setSelectedRows(selectedData);
    props.onSelectionChange?.(selectedData);
  };

  const refreshTable = () => {
    if (agGridInstance.current?.api) {
      agGridInstance.current.api.deselectAll();
    }
    setSelectedRows([]);
    props.onSelectionChange?.([]);
    agGridInstance.current?.api?.refreshServerSideStore({ purge: true });
  };

  const openSetAllPanel = () => {
    if (!selectedRows.length) {
      displaySnackMessages(
        t("inventorysmart.pleaseSelectAtLeastOneRow"),
        "info",
        props
      );
      return;
    }
    setShowSetAllPanel(true);
  };

  const closeSetAllPanel = () => {
    setShowSetAllPanel(false);
  };

  const buildSetAllPayload = (formData) => {
    const tableApi = agGridInstance.current?.api;
    const { isAllRecordsSelected, row_update, excluded_rows } =
      getConfigurationSelectAllContext(tableApi, selectedRows);

    return {
      table_name: tableNameRef.current,
      is_all_records_selected: isAllRecordsSelected,
      row_update,
      excluded_rows,
      update_attributes: buildSetAllUpdateAttributes(
        formData,
        dcTransferRulesRef.current,
        true
      ),
    };
  };

  const applyConfigurationSetAll = async (payload) => {
    const response = await props.applyDCTransferConfigurationSetAll(payload);
    if (!response?.data?.status) {
      throw new Error(response?.data?.message || ERROR_MESSAGE);
    }
    return response;
  };

  const isRuleInlineColumn = (columnField) =>
    columnField === DC_TRANSFER_CONFIGURATION_RULE_NAME_COLUMN ||
    columnField === DC_TRANSFER_CONFIGURATION_RULE_ID_FIELD;

  const revertInlineCellValue = (cellData, data, columnField, revertValue) => {
    if (cellData?.node?.setDataValue) {
      cellData.node.setDataValue(columnField, revertValue);
    } else if (data && columnField) {
      data[columnField] = revertValue;
      agGridInstance.current?.api?.refreshCells?.({
        columns: [columnField],
        force: true,
      });
    }
  };

  const refreshRuleDerivedCells = (cellNode) => {
    if (!cellNode || !agGridInstance.current?.api) {
      return;
    }

    agGridInstance.current.api.refreshCells({
      rowNodes: [cellNode],
      columns: [
        DC_TRANSFER_CONFIGURATION_FULFILLMENT_TYPE_COLUMN,
        DC_TRANSFER_CONFIGURATION_SET_ALL_ATTRIBUTES.TOTAL_DC,
      ],
      force: true,
    });
  };

  const handleRuleDropdownChange = (cellNode, colId, _colType, selectedOption) => {
    const data = cellNode?.data;
    const rowId = data?.[DC_TRANSFER_CONFIGURATION_UNIQUE_ROW_ID];
    const columnField = colId || DC_TRANSFER_CONFIGURATION_RULE_NAME_COLUMN;
    const previousRuleId = data?.[DC_TRANSFER_CONFIGURATION_RULE_ID_FIELD];
    const previousRuleNameValue = data?.[DC_TRANSFER_CONFIGURATION_RULE_NAME_COLUMN];
    const previousFulfillmentType = data?.[DC_TRANSFER_CONFIGURATION_FULFILLMENT_TYPE_COLUMN];
    const previousDcCount =
      data?.[DC_TRANSFER_CONFIGURATION_SET_ALL_ATTRIBUTES.TOTAL_DC] ??
      data?.total_dc;

    if (!tableNameRef.current || rowId === undefined || rowId === null) {
      return false;
    }

    const nextComparableValue = getInlineComparableValue(
      columnField,
      selectedOption
    );
    if (
      nextComparableValue === getInlineComparableValue(columnField, previousRuleId) ||
      nextComparableValue ===
        getInlineComparableValue(columnField, previousRuleNameValue)
    ) {
      return false;
    }

    const payload = buildInlineSetAllPayload({
      tableName: tableNameRef.current,
      rowId,
      columnField,
      value: selectedOption,
      rules: dcTransferRulesRef.current,
      includeDcCount: true,
    });

    if (!payload) {
      return false;
    }

    const requestKey = `${rowId}:rule_id`;
    if (inlineEditInFlightRef.current.has(requestKey)) {
      return false;
    }

    inlineEditInFlightRef.current.add(requestKey);
    applyRuleSelectionToCell(
      cellNode,
      data,
      columnField,
      selectedOption,
      dcTransferRulesRef.current,
      true
    );
    refreshRuleDerivedCells(cellNode);
    applyConfigurationSetAll(payload)
      .then((response) => {
        applyRuleSelectionToCell(
          cellNode,
          data,
          columnField,
          selectedOption,
          dcTransferRulesRef.current,
          true
        );
        refreshRuleDerivedCells(cellNode);
        if (response?.data?.show_message) {
          displaySnackMessages(response?.data?.message, "success", props);
        }
      })
      .catch((error) => {
        if (cellNode?.setDataValue) {
          cellNode.setDataValue(columnField, previousRuleNameValue);
        }
        data[DC_TRANSFER_CONFIGURATION_RULE_ID_FIELD] = previousRuleId;
        data[DC_TRANSFER_CONFIGURATION_FULFILLMENT_TYPE_COLUMN] =
          previousFulfillmentType;
        data[DC_TRANSFER_CONFIGURATION_SET_ALL_ATTRIBUTES.TOTAL_DC] =
          previousDcCount;
        data.total_dc = previousDcCount;
        refreshRuleDerivedCells(cellNode);
        const errObj = error?.response?.data;
        if (errObj?.show_message) {
          displaySnackMessages(errObj?.message, "error", props);
        } else if (error?.message) {
          displaySnackMessages(error.message, "error", props);
        } else {
          displaySnackMessages(ERROR_MESSAGE, "error", props);
        }
      })
      .finally(() => {
        inlineEditInFlightRef.current.delete(requestKey);
      });

    return false;
  };

  const handleInlineCellBlur = async (
    _event,
    data,
    column,
    isChanged,
    _previousValue,
    initialValue,
    cellData,
    newValue
  ) => {
    if (!isChanged || !tableNameRef.current) {
      return;
    }

    const columnField = getColumnField(column);
    if (isRuleInlineColumn(columnField)) {
      return;
    }

    const rowId = data?.[DC_TRANSFER_CONFIGURATION_UNIQUE_ROW_ID];
    const nextValue = newValue ?? data?.[columnField];

    if (
      rowId === undefined ||
      rowId === null ||
      getInlineComparableValue(columnField, nextValue) ===
        getInlineComparableValue(columnField, initialValue)
    ) {
      return;
    }

    if (
      NUMERIC_INLINE_FIELDS.has(columnField) &&
      !/^\d+$/.test(String(nextValue ?? "").trim())
    ) {
      revertInlineCellValue(cellData, data, columnField, initialValue);
      displaySnackMessages(
        "Only non-negative whole numbers are allowed.",
        "error",
        props
      );
      return;
    }

    const updateAttributes = getInlineUpdateAttributes(
      columnField,
      nextValue,
      dcTransferRulesRef.current,
      true
    );
    if (!updateAttributes?.length) {
      revertInlineCellValue(cellData, data, columnField, initialValue);
      return;
    }

    const payload = buildInlineSetAllPayload({
      tableName: tableNameRef.current,
      rowId,
      columnField,
      value: nextValue,
      rules: dcTransferRulesRef.current,
      includeDcCount: true,
    });
    if (!payload) {
      revertInlineCellValue(cellData, data, columnField, initialValue);
      return;
    }

    const requestKey = `${rowId}:${updateAttributes[0]?.attribute_name}`;
    if (inlineEditInFlightRef.current.has(requestKey)) {
      return;
    }

    inlineEditInFlightRef.current.add(requestKey);
    try {
      const response = await applyConfigurationSetAll(payload);
      syncInlineRuleRowData(
        data,
        columnField,
        nextValue,
        dcTransferRulesRef.current,
        true
      );
      if (response?.data?.show_message) {
        displaySnackMessages(response?.data?.message, "success", props);
      }
    } catch (error) {
      revertInlineCellValue(cellData, data, columnField, initialValue);
      const errObj = error?.response?.data;
      if (errObj?.show_message) {
        displaySnackMessages(errObj?.message, "error", props);
      } else if (error?.message) {
        displaySnackMessages(error.message, "error", props);
      } else {
        displaySnackMessages(ERROR_MESSAGE, "error", props);
      }
    } finally {
      inlineEditInFlightRef.current.delete(requestKey);
    }
  };

  const getTopRightOptions = () => {
    if (!selectedRows.length) {
      return [];
    }

    return [
      <Button key="create-dc-transfer-set-all" variant="primary" onClick={openSetAllPanel}>
        {t("inventorysmart.setAll")}
      </Button>,
    ];
  };

  useEffect(() => {
    fetchTableColumns();
  }, []);

  useEffect(() => {
    if (props.filterAppliedTrigger > 0 && agGridInstance.current?.api) {
      setSelectedRows([]);
      props.onSelectionChange?.([]);
      agGridInstance.current.api.refreshServerSideStore({ purge: true });
    }
  }, [props.filterAppliedTrigger]);

  const configurationManualCallBack = async (manualBody, pageIndex) => {
    if (!tableNameRef.current) {
      return {
        data: [],
        totalCount: 0,
      };
    }

    try {
      setTableLoader(true);

      const body = {
        table_name: tableNameRef.current,
        meta: {
          search: manualBody?.search || [],
          sort: manualBody?.sort || [],
          range: manualBody?.range || [],
          ...manualBody,
          limit: { limit: props.pageSize || 10, page: pageIndex + 1 },
        },
      };

      const response = await props.fetchDCTransferConfigurationsList(body);
      const { rows, totalCount, status, message } =
        parseConfigurationListResponse(response);

      if (status === false) {
        displaySnackMessages(message || ERROR_MESSAGE, "error", props);
        return {
          data: [],
          totalCount: 0,
        };
      }

      const ruleOptions = ruleOptionsRef.current;
      return {
        data: rows.map((row) =>
          enrichRowWithRuleDropdownOptions(
            row,
            ruleOptions,
            dcTransferRulesRef.current,
            true
          )
        ),
        totalCount,
      };
    } catch (error) {
      handleErrorMessage(error);
      return {
        data: [],
        totalCount: 0,
      };
    } finally {
      setTableLoader(false);
    }
  };

  if (!tableColumns.length) {
    return null;
  }

  return (
    <div className={globalClasses.padding}>
      <Loader loader={tableLoader}>
        <div className={classes.tableContainer}>
          <AgGridComponent
            columns={tableColumns}
            rowModelType="serverSide"
            serverSideStoreType="partial"
            cacheBlockSize={props.pageSize || 10}
            paginationPageSize={props.pageSize || 10}
            pagination
            disablePaginationForSinglePage
            sizeColumnsToFitFlag
            manualCallBack={configurationManualCallBack}
            uniqueRowId={DC_TRANSFER_CONFIGURATION_UNIQUE_ROW_ID}
            loadTableInstance={loadTableInstance}
            selectAllHeaderComponent
            rowSelection="multiple"
            onSelectionChanged={onSelectionChanged}
            onBlur={handleInlineCellBlur}
            callBackOnChangeCustomFunction={handleRuleDropdownChange}
            topRightOptions={getTopRightOptions()}
            suppressClickEdit
            tableName={CREATE_DC_TRANSFER_ALLOCATION_TABLE_CONFIG_NAME}
            tableHeader="Create DC Transfer"
          />
        </div>
      </Loader>

      <CreateDcTransferSetAll
        open={showSetAllPanel}
        onClose={closeSetAllPanel}
        ruleOptions={ruleOptionsRef.current}
        applyDCTransferConfigurationSetAll={props.applyDCTransferConfigurationSetAll}
        displaySnackMessages={displaySnackMessages}
        buildPayload={buildSetAllPayload}
        refreshTable={refreshTable}
        addSnack={props.addSnack}
      />

      <DcTransferRuleMappingBottomSheet
        open={ruleMappingSheet.open}
        ruleId={ruleMappingSheet.ruleId}
        ruleName={ruleMappingSheet.ruleName}
        fulfillmentType={ruleMappingSheet.fulfillmentType}
        onClose={closeRuleMappingSheet}
      />
    </div>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer } = store;
  return {
    pageSize:
      inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.inventorysmart_page_count || 10,
  };
};

const mapDispatchToProps = (dispatch) => ({
  addSnack: (snack) => dispatch(addSnack(snack)),
  fetchDCTransferConfigurationsList: (payload) =>
    dispatch(fetchDCTransferConfigurationsList(payload)),
  fetchDCTransferRules: () => dispatch(fetchDCTransferRules()),
  applyDCTransferConfigurationSetAll: (payload) =>
    dispatch(applyDCTransferConfigurationSetAll(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(CreateDcTransferConfigurationTable);
