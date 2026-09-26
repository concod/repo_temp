import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Alert, Button, useTranslation } from "impact-ui-v3";
import Loader from "core/Utils/Loader/loader";
import AgGridComponent from "core/Utils/agGrid";
import { addSnack } from "core/actions/snackbarActions";
import { getColumnsAg } from "core/actions/tableColumnActions";
import { ERROR_MESSAGE } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import {
  applyDCTransferRuleSetAll,
  fetchDCTransferRuleMapping,
} from "modules/inventorysmart/services-inventorysmart/DC-Transfer-Rule/dc-transfer-rule";
import { DC_TRANSFER_RULE_MASTER_TABLE_NAME, FULFILMENT_TYPE } from "../constants";
import { hasCircularDcTransfers } from "./circularDcTransferUtils";
import { useCreateRuleFlowStyles } from "./useCreateRuleFlowStyles";
import SetAllPanel from "./SetAllPanel";

const SET_ALL_FIELD_MAP = {
  lead_time: "lead_time",
  min_transfer_quantity: "tranfer_qty",
  tranfer_qty: "tranfer_qty",
  transfer_qty: "tranfer_qty",
  source_priority: "priority",
  priority: "priority",
};

const NUMERIC_UPDATE_FIELDS = new Set(["lead_time", "tranfer_qty", "priority"]);

const isNonNegativeIntegerValue = (value) =>
  /^\d+$/.test(String(value ?? "").trim());

const parseNonNegativeInteger = (value) =>
  parseInt(String(value).trim(), 10);

const buildUpdateAttributes = (entries = []) => {
  const updateAttributes = [];

  entries.forEach(({ attributeName, value }) => {
    if (
      !attributeName ||
      value === undefined ||
      value === null ||
      String(value).trim() === ""
    ) {
      return;
    }

    if (NUMERIC_UPDATE_FIELDS.has(attributeName)) {
      if (!isNonNegativeIntegerValue(value)) {
        return;
      }
      updateAttributes.push({
        attribute_name: attributeName,
        attribute_value: parseNonNegativeInteger(value),
      });
      return;
    }

    updateAttributes.push({
      attribute_name: attributeName,
      attribute_value: value,
    });
  });

  return updateAttributes;
};

const buildSetAllUpdateAttributes = (formValues) =>
  buildUpdateAttributes([
    { attributeName: "lead_time", value: formValues.lead_time },
    {
      attributeName: "tranfer_qty",
      value: formValues.min_transfer_quantity,
    },
    { attributeName: "priority", value: formValues.source_priority },
  ]);

const getInlineUpdateAttributes = (columnField, value) => {
  if (!columnField) {
    return null;
  }

  const apiField = SET_ALL_FIELD_MAP[columnField] || columnField;
  const updateAttributes = buildUpdateAttributes([
    { attributeName: apiField, value },
  ]);

  return updateAttributes.length ? updateAttributes : null;
};

const getColumnField = (column) =>
  column?.colId || column?.colDef?.field || column?.colDef?.accessor || column?.field;

const getSelectAllContext = (tableApi, selectedRowData = []) => {
  const checkConfiguration = tableApi?.checkConfiguration;
  const isAllRecordsSelected = Boolean(
    tableApi?.isSelectAllRecords ||
      checkConfiguration?.[checkConfiguration.length - 1]?.checkAll
  );

  if (isAllRecordsSelected) {
    const deselectedNodes =
      tableApi?.getRenderedNodes?.()?.filter((node) => !node?.selected) || [];
    const excludedRows = deselectedNodes
      .map((node) => node?.data?.id)
      .filter((id) => id !== undefined && id !== null);

    return {
      isAllRecordsSelected: true,
      updateIds: [],
      excludedRows,
    };
  }

  return {
    isAllRecordsSelected: false,
    updateIds: selectedRowData
      .map((row) => row?.id)
      .filter((id) => id !== undefined && id !== null),
    excludedRows: [],
  };
};

const isMappingRowActive = (row) => {
  const flag = row?.is_active ?? row?.isActive;
  return (
    flag === true ||
    flag === 1 ||
    flag === "1" ||
    flag === "true" ||
    flag === "True"
  );
};

const ReviewCombinationsStep = ({
  mappingTableName,
  fulfilmentType,
  onError,
  onCircularTransfersChange,
  onSelectedRowsChange,
  isDisabled = false,
  preselectActiveRows = false,
}) => {
  const classes = useCreateRuleFlowStyles();
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const tableInstance = useRef(null);
  const inlineEditInFlightRef = useRef(new Set());
  const [columnConfig, setColumnConfig] = useState([]);
  const [isColumnConfigLoading, setIsColumnConfigLoading] = useState(true);
  const [selectedRows, setSelectedRows] = useState([]);
  const [isSetAllPanelOpen, setIsSetAllPanelOpen] = useState(false);
  const [isSetAllApplying, setIsSetAllApplying] = useState(false);
  const [isCircularAlertDismissed, setIsCircularAlertDismissed] = useState(
    false
  );
  const isFixedPush = fulfilmentType === FULFILMENT_TYPE.FIXED_PUSH;
  const hasCircularTransfers = useMemo(
    () =>
      isFixedPush ? hasCircularDcTransfers(selectedRows) : false,
    [isFixedPush, selectedRows]
  );
  const pageSize =
    useSelector(
      (state) =>
        state.inventorysmartReducer?.inventorySmartCommonService
          ?.inventorysmartScreenConfig?.inventorysmart_page_count
    ) || 10;

  useEffect(() => {
    let cancelled = false;

    const loadColumnConfig = async () => {
      setIsColumnConfigLoading(true);
      try {
        const columns = await getColumnsAg(
          `table_name=${DC_TRANSFER_RULE_MASTER_TABLE_NAME}`,
          {},
          {},
          false,
          isDisabled
        )();
        if (!cancelled) {
          setColumnConfig(columns || []);
        }
      } catch (error) {
        if (!cancelled) {
          setColumnConfig([]);
          onError?.(error);
        }
      } finally {
        if (!cancelled) {
          setIsColumnConfigLoading(false);
        }
      }
    };

    loadColumnConfig();
    return () => {
      cancelled = true;
    };
  }, [onError, isDisabled]);

  useEffect(() => {
    onCircularTransfersChange?.(hasCircularTransfers);
  }, [hasCircularTransfers, onCircularTransfersChange]);

  useEffect(() => {
    onSelectedRowsChange?.(selectedRows);
  }, [selectedRows, onSelectedRowsChange]);

  useEffect(() => {
    if (!hasCircularTransfers) {
      setIsCircularAlertDismissed(false);
    }
  }, [hasCircularTransfers]);

  useEffect(() => {
    if (isDisabled) {
      setIsSetAllPanelOpen(false);
      if (!preselectActiveRows) {
        setSelectedRows([]);
        tableInstance.current?.api?.deselectAll?.();
      }
    }
  }, [isDisabled, preselectActiveRows]);

  const loadTableInstance = (params) => {
    tableInstance.current = params;
  };

  const onSelectionChanged = (event) => {
    setSelectedRows(event?.api?.getSelectedRows?.() || []);
  };

  const preselectActiveMappingRows = useCallback(
    (params) => {
      if (!preselectActiveRows) {
        return;
      }

      const api = params?.api;
      if (!api?.forEachNode) {
        return;
      }

      api.forEachNode((node) => {
        if (isMappingRowActive(node?.data) && !node.isSelected()) {
          node.setSelected(true, false, true);
        }
      });
      setSelectedRows(api.getSelectedRows?.() || []);
    },
    [preselectActiveRows]
  );

  const handleMappingTableCallBack = async (manualBody, pageIndex) => {
    if (!mappingTableName) {
      return {
        data: [],
        totalCount: 0,
      };
    }

    try {
      const response = await fetchDCTransferRuleMapping({
        meta: {
          ...manualBody,
          limit: { limit: pageSize, page: pageIndex + 1 },
        },
        table_name: mappingTableName,
      })();
      const rows = response?.data?.data || [];
      const totalCount = Number(response?.data?.total);

      return {
        data: rows,
        totalCount: Number.isNaN(totalCount) ? rows.length : totalCount,
      };
    } catch (error) {
      onError?.(error);
      return {
        data: [],
        totalCount: 0,
      };
    }
  };

  const showErrorSnack = (message) => {
    dispatch(
      addSnack({
        message: message || ERROR_MESSAGE,
        options: { variant: "error" },
      })
    );
  };

  const revertInlineCellValue = (cellData, data, field, revertValue) => {
    if (cellData?.node?.setDataValue) {
      cellData.node.setDataValue(field, revertValue);
    } else if (data && field) {
      data[field] = revertValue;
      tableInstance.current?.api?.refreshCells?.({
        columns: [field],
        force: true,
      });
    }
  };

  const applyMappingUpdate = async ({
    updateIds = [],
    updateAttributes,
    isAllRecordsSelected = false,
    excludedRows = [],
  }) => {
    const response = await applyDCTransferRuleSetAll({
      table_name: mappingTableName,
      is_all_records_selected: isAllRecordsSelected,
      update_ids: updateIds,
      excluded_rows: excludedRows,
      update_attributes: updateAttributes,
    })();

    if (!response?.data?.status) {
      throw new Error(response?.data?.message || ERROR_MESSAGE);
    }

    return response;
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
    if (isDisabled || !isChanged || !mappingTableName) {
      return;
    }

    const columnField = getColumnField(column);
    const rowId = data?.id;
    const nextValue = newValue ?? data?.[columnField];
    if (
      rowId === undefined ||
      rowId === null ||
      String(nextValue ?? "") === String(initialValue ?? "")
    ) {
      return;
    }

    const apiField = SET_ALL_FIELD_MAP[columnField] || columnField;
    if (
      NUMERIC_UPDATE_FIELDS.has(apiField) &&
      !isNonNegativeIntegerValue(nextValue)
    ) {
      revertInlineCellValue(cellData, data, columnField, initialValue);
      showErrorSnack(
        t("inventorysmart.dcTransferRule.onlyNonNegativeIntegersAllowed")
      );
      return;
    }

    const updateAttributes = getInlineUpdateAttributes(columnField, nextValue);
    if (!updateAttributes) {
      revertInlineCellValue(cellData, data, columnField, initialValue);
      return;
    }

    const requestKey = `${rowId}:${updateAttributes[0]?.attribute_name}`;
    if (inlineEditInFlightRef.current.has(requestKey)) {
      return;
    }

    inlineEditInFlightRef.current.add(requestKey);
    try {
      await applyMappingUpdate({
        updateIds: [rowId],
        updateAttributes,
        isAllRecordsSelected: false,
        excludedRows: [],
      });
    } catch (error) {
      revertInlineCellValue(cellData, data, columnField, initialValue);
      showErrorSnack(error?.response?.data?.message || error?.message);
    } finally {
      inlineEditInFlightRef.current.delete(requestKey);
    }
  };

  const handleSetAllClick = () => {
    setIsSetAllPanelOpen(true);
  };

  const handleSetAllClose = () => {
    if (isSetAllApplying) {
      return;
    }
    setIsSetAllPanelOpen(false);
  };

  const handleSetAllApply = async (formValues) => {
    const tableApi = tableInstance.current?.api;
    const { isAllRecordsSelected, updateIds, excludedRows } = getSelectAllContext(
      tableApi,
      selectedRows
    );
    const updateAttributes = buildSetAllUpdateAttributes(formValues);

    if (!updateAttributes.length) {
      return;
    }

    setIsSetAllApplying(true);
    try {
      const response = await applyMappingUpdate({
        updateIds,
        updateAttributes,
        isAllRecordsSelected,
        excludedRows,
      });

      dispatch(
        addSnack({
          message:
            response?.data?.message ||
            t("inventorysmart.dcTransferRule.mappingUpdatedSuccessfully"),
          options: { variant: "success" },
        })
      );
      setIsSetAllPanelOpen(false);
      tableInstance.current?.api?.deselectAll?.();
      setSelectedRows([]);
      tableInstance.current?.api?.refreshServerSideStore?.({ purge: true });
    } catch (error) {
      showErrorSnack(error?.response?.data?.message || error?.message);
    } finally {
      setIsSetAllApplying(false);
    }
  };

  const getTopCenterOptions = () => {
    if (!hasCircularTransfers || isCircularAlertDismissed) {
      return null;
    }

    return [
      <div key="circular-transfers-alert" className={classes.circularAlert}>
        <Alert
          severity="error"
          title={t("inventorysmart.dcTransferRule.circularTransfersAlert")}
          subtleBackground={true}
          onClose={() => setIsCircularAlertDismissed(true)}
        />
      </div>,
    ];
  };

  const getTopRightOptions = () => {
    if (isDisabled || !selectedRows.length) {
      return null;
    }

    return [
      <Button
        key="dc-mapping-set-all"
        variant="primary"
        onClick={handleSetAllClick}
      >
        {t("agGrid.setAll")}
      </Button>,
    ];
  };

  return (
    <div className={classes.contentWrapper}>
      <Loader loader={isColumnConfigLoading} minHeight="400px">
        <div className={classes.mappingTableWrapper}>
          {columnConfig.length ? (
            <AgGridComponent
              key={`dc-mapping-${isDisabled ? "view" : "edit"}`}
              columns={columnConfig}
              uniqueRowId="id"
              rowModelType="serverSide"
              serverSideStoreType="partial"
              cacheBlockSize={pageSize}
              disablePaginationForSinglePage
              pagination
              paginationPageSize={pageSize}
              sizeColumnsToFitFlag
              tableHeader={t("inventorysmart.dcTransferRule.detailsTableHeader")}
              selectAllHeaderComponent
              rowSelection="multiple"
              onSelectionChanged={onSelectionChanged}
              onBlur={isDisabled ? undefined : handleInlineCellBlur}
              suppressClickEdit={isDisabled}
              loadTableInstance={loadTableInstance}
              manualCallBack={handleMappingTableCallBack}
              callOnModelUpdated={preselectActiveMappingRows}
              topCenterOptions={getTopCenterOptions()}
              topRightOptions={getTopRightOptions()}
            />
          ) : null}
        </div>
      </Loader>
      <SetAllPanel
        open={isSetAllPanelOpen}
        onClose={handleSetAllClose}
        onApply={handleSetAllApply}
        isApplying={isSetAllApplying}
      />
    </div>
  );
};

export default ReviewCombinationsStep;
