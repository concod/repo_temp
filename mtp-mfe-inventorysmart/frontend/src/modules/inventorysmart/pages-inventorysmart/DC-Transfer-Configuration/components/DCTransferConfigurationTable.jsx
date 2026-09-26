import React, { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import { cloneDeep } from "lodash";
import { makeStyles } from "@mui/styles";
import globalStyles from "core/Styles/globalStyles";
import Loader from "core/Utils/Loader/loader";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { addSnack } from "core/actions/snackbarActions";
import { Button, useTranslation } from "impact-ui-v3";
import { displaySnackMessages } from "../../inventorysmart-utility";
import { ERROR_MESSAGE } from "../../../constants-inventorysmart/stringConstants";
import {
  applyDCTransferConfigurationSetAll,
  fetchDCTransferConfigurationsList,
  fetchDCTransferConfigurationTableInit,
  saveDCTransferConfiguration,
} from "../../../services-inventorysmart/DC-Transfer-Configuration/dc-transfer-configuration-service";
import {
  DC_TRANSFER_CONFIGURATION_FULFILLMENT_TYPE_COLUMN,
  DC_TRANSFER_CONFIGURATION_RULE_ID_FIELD,
  DC_TRANSFER_CONFIGURATION_RULE_NAME_COLUMN,
  DC_TRANSFER_CONFIGURATION_TABLE_NAME,
  DC_TRANSFER_CONFIGURATION_UNIQUE_ROW_ID,
  NUMERIC_INLINE_FIELDS,
} from "../constants";
import {
  buildInlineSetAllPayload,
  buildSetAllUpdateAttributes,
  configureRuleNameColumnDef,
  enrichRowWithRuleDropdownOptions,
  getConfigurationSelectAllContext,
  getColumnField,
  getInlineComparableValue,
  getInlineUpdateAttributes,
  mapRulesToDropdownOptions,
  applyRuleSelectionToCell,
  syncInlineRuleRowData,
} from "../common-functions";
import {
  applyFulfillmentTypeBadgeColumn,
  configureFulfillmentTypeColumnDef,
  patchFulfillmentTypeColumnRenderer,
  renderFulfillmentTypeBadge,
} from "../fulfillmentTypeColumn";
import DCTransferConfigurationSetAll from "./DCTransferConfigurationSetAll";

const useStyles = makeStyles(() => ({
  tableContainer: {
    minHeight: "500px",
    width: "100%",
  },
  stickyFooterRight: {
    justifyContent: "flex-end",
    padding: "16px 24px",
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

const DCTransferConfigurationTable = (props) => {
  const { t } = useTranslation();
  const globalClasses = globalStyles();
  const classes = useStyles();
  const agGridInstance = useRef(null);
  const tableNameRef = useRef(props.tableName);
  const ruleOptionsRef = useRef([]);
  const dcTransferRulesRef = useRef([]);
  const inlineEditInFlightRef = useRef(new Set());
  const [tableColumns, setTableColumns] = useState([]);
  const [tableLoader, setTableLoader] = useState(false);
  const [selectedRows, setSelectedRows] = useState([]);
  const [showSetAllPanel, setShowSetAllPanel] = useState(false);
  const [hasPendingInlineChanges, setHasPendingInlineChanges] = useState(false);
  const [isSavingConfiguration, setIsSavingConfiguration] = useState(false);

  const markConfigurationPending = () => {
    setHasPendingInlineChanges(true);
  };

  useEffect(() => {
    tableNameRef.current = props.tableName;
    setHasPendingInlineChanges(false);
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

  const fetchTableColumns = async () => {
    try {
      setTableLoader(true);
      const { columnsResponse, rulesResponse } =
        await props.fetchDCTransferConfigurationTableInit();

      const rules = rulesResponse?.data?.data || [];
      dcTransferRulesRef.current = rules;
      const ruleOptions = mapRulesToDropdownOptions(rules);
      ruleOptionsRef.current = ruleOptions;

      const rawColumns = cloneDeep(columnsResponse?.data?.data || []);
      configureRuleNameColumnDef(rawColumns, ruleOptions);
      configureFulfillmentTypeColumnDef(rawColumns);
      // 10th arg prevents OverflowTooltip from replacing non-editable cellRenderer.
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
      setTableColumns(applyFulfillmentTypeBadgeColumn(formattedColumns));
    } catch (error) {
      handleErrorMessage(error);
    } finally {
      setTableLoader(false);
    }
  };

  const patchFulfillmentTypeRendererOnGrid = (api) => {
    if (!api?.getColumnDefs) {
      return;
    }

    const patchedColumns = patchFulfillmentTypeColumnRenderer(
      cloneDeep(api.getColumnDefs())
    );
    api.setColumnDefs(patchedColumns);
    api.refreshCells({ force: true });
  };

  const loadTableInstance = (params) => {
    agGridInstance.current = params;
    // Run after table formatting hooks (e.g. number format) so badge renderer wins.
    setTimeout(() => {
      patchFulfillmentTypeRendererOnGrid(params?.api);
    }, 0);
  };

  const onSelectionChanged = (params) => {
    const selectedNodes = params?.api?.getSelectedNodes();
    const actuallySelectedNodes =
      selectedNodes?.filter((node) => node?.isSelected()) || [];
    setSelectedRows(actuallySelectedNodes.map((node) => node?.data));
  };

  const refreshTable = () => {
    if (agGridInstance.current?.api) {
      agGridInstance.current.api.deselectAll();
    }
    setSelectedRows([]);
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
        dcTransferRulesRef.current
      ),
    };
  };

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

  const applyConfigurationSetAll = async (payload) => {
    const response = await props.applyDCTransferConfigurationSetAll(payload);
    if (response?.data?.status === false) {
      throw new Error(response?.data?.message || ERROR_MESSAGE);
    }
    markConfigurationPending();
    return response;
  };

  const isRuleInlineColumn = (columnField) =>
    columnField === DC_TRANSFER_CONFIGURATION_RULE_NAME_COLUMN ||
    columnField === DC_TRANSFER_CONFIGURATION_RULE_ID_FIELD;

  const refreshFulfillmentTypeCell = (cellNode) => {
    if (!cellNode || !agGridInstance.current?.api) {
      return;
    }

    agGridInstance.current.api.refreshCells({
      rowNodes: [cellNode],
      columns: [DC_TRANSFER_CONFIGURATION_FULFILLMENT_TYPE_COLUMN],
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
      dcTransferRulesRef.current
    );
    refreshFulfillmentTypeCell(cellNode);
    applyConfigurationSetAll(payload)
      .then((response) => {
        applyRuleSelectionToCell(
          cellNode,
          data,
          columnField,
          selectedOption,
          dcTransferRulesRef.current
        );
        refreshFulfillmentTypeCell(cellNode);
      })
      .catch((error) => {
        if (cellNode?.setDataValue) {
          cellNode.setDataValue(columnField, previousRuleNameValue);
        }
        data[DC_TRANSFER_CONFIGURATION_RULE_ID_FIELD] = previousRuleId;
        data[DC_TRANSFER_CONFIGURATION_FULFILLMENT_TYPE_COLUMN] =
          previousFulfillmentType;
        refreshFulfillmentTypeCell(cellNode);
        const errObj = error?.response?.data;
        if (error?.message) {
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
      dcTransferRulesRef.current
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
        dcTransferRulesRef.current
      );
    } catch (error) {
      revertInlineCellValue(cellData, data, columnField, initialValue);
      const errObj = error?.response?.data;
      if (error?.message) {
        displaySnackMessages(error.message, "error", props);
      } else {
        displaySnackMessages(ERROR_MESSAGE, "error", props);
      }
    } finally {
      inlineEditInFlightRef.current.delete(requestKey);
    }
  };

  const handleSaveConfiguration = async () => {
    if (!tableNameRef.current || isSavingConfiguration) {
      return;
    }

    setIsSavingConfiguration(true);
    try {
      const response = await props.saveDCTransferConfiguration({
        table_name: tableNameRef.current,
      });

      if (response?.data?.status) {
        displaySnackMessages(
          response?.data?.message ||
            t("inventorysmart.dcTransferConfigurationSavedSuccessfully"),
          "success",
          props
        );
        setHasPendingInlineChanges(false);
      } else {
        displaySnackMessages(
          response?.data?.message || ERROR_MESSAGE,
          "error",
          props
        );
      }
    } catch (error) {
      handleErrorMessage(error);
    } finally {
      setIsSavingConfiguration(false);
    }
  };

  const getTopRightOptions = () => {
    if (!selectedRows.length) {
      return null;
    }

    return [
      <Button
        key="dc-transfer-config-set-all"
        variant="primary"
        onClick={openSetAllPanel}
      >
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
      setHasPendingInlineChanges(false);
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
            dcTransferRulesRef.current
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
            customCellRenderer={renderFulfillmentTypeBadge}
            noEditableCustomCellRender={renderFulfillmentTypeBadge}
            topRightOptions={getTopRightOptions()}
            suppressClickEdit
            tableName={DC_TRANSFER_CONFIGURATION_TABLE_NAME}
            tableHeader="DC Transfer Configuration"
          />
        </div>
      </Loader>

      <DCTransferConfigurationSetAll
        open={showSetAllPanel}
        onClose={closeSetAllPanel}
        ruleOptions={ruleOptionsRef.current}
        applyDCTransferConfigurationSetAll={applyConfigurationSetAll}
        displaySnackMessages={displaySnackMessages}
        buildPayload={buildSetAllPayload}
        refreshTable={refreshTable}
        addSnack={props.addSnack}
      />

      <div
        className={`${globalClasses.stickyFooter} ${classes.stickyFooterRight}`}
      >
        <Button
          variant="primary"
          onClick={handleSaveConfiguration}
          disabled={!hasPendingInlineChanges || isSavingConfiguration}
          size="large"
        >
          {t("inventorysmart.save")}
        </Button>
      </div>
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
  fetchDCTransferConfigurationTableInit: () =>
    dispatch(fetchDCTransferConfigurationTableInit()),
  applyDCTransferConfigurationSetAll: (payload) =>
    dispatch(applyDCTransferConfigurationSetAll(payload)),
  saveDCTransferConfiguration: (payload) =>
    dispatch(saveDCTransferConfiguration(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(DCTransferConfigurationTable);
