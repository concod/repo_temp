import React, { useState, useEffect, useRef, useContext } from "react";
import { addSnack } from "core/actions/snackbarActions";
import { connect } from "react-redux";
import { Button, useTranslation } from "impact-ui-v3";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import Loader from "core/Utils/Loader/loader";
import { cloneDeep, isEmpty } from "lodash";
import {
  getOrderBatchingSummaryStyleTableConfiguration,
  getOrderBatchingSummaryStyleTableData,
  setInventorysmartOrderBatchingSummaryTableConfigLoader,
  setOrderBatchingSummaryStyleDataLoader,
  setOrderBatchingSummaryStyleTableData,
  setEditModeEnabledOnSummary,
} from "modules/inventorysmart/services-inventorysmart/Order-Batching/order-batching-summary-services";
import {
  getOrderBatchingSummary,
  setInventorysmartReloadOrderBatchingData,
} from "modules/inventorysmart/services-inventorysmart/Order-Batching/order-batching-services";
import {
  handleErrorMessage,
  displaySnackMessages,
  mapFiltersForAiSmartFilter,
} from "../../inventorysmart-utility";
import NewOrderBatchingSummarySetAll from "./NewOrderBatchingSummarySetAll";
import CellRenderers from "core/Utils/agGrid/cellRenderer";
import { OrderBatchingContext } from "../index.js";
import { fetchSetAllLimits } from "../../inventorysmart-utility";
import NewOrderBatchingBottomSheetTableView from "./NewOrderBatchingBottomSheetTableView";
import { getProgressBarCellStyle } from "./orderBatchingHelperFunctions";
import AiSmartFilterButton from "../../Decision-Dashboard/components/AiSmartFilterButton";
import AiSmartFilterChips from "../../Decision-Dashboard/components/AiSmartFilterChips";
import useAiSmartFilterChips from "../../Decision-Dashboard/components/useAiSmartFilterChips";
import { AI_SMART_FILTER_OB_STYLE_COLOR_LEVEL_DETAILS } from "../../Decision-Dashboard/components/aiSmartFilterDummyConstants";

const OrderBatchingSummaryStyleTable = (props) => {
  const agGridInstance = useRef(null);
  const aiChips = useAiSmartFilterChips();
  const { t } = useTranslation();

  const [columnConfigs, setColumnConfigs] = useState([]);
  const [tableData, setTableData] = useState([]);
  const [selectedStyles, setSelectedStyles] = useState([]);
  const [editValuesModalOpen, setEditValuesModalOpen] = useState(false);
  const [
    updatedStyleSummaryRowEdits,
    setUpdatedStyleSummaryRowEdits,
  ] = useState([]);

  const [
    styleSummarySetAllModalOpen,
    setStyleSummarySetAllModalOpen,
  ] = useState(false);
  const {
    selectedOption,
    sessionId,
    createdAtDate,
    setSelectedOption,
  } = useContext(OrderBatchingContext);
  const [setAllLimits, setSetAllLimits] = useState({});
  const [showStoreView, setShowStoreView] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState(null);

  const updatedStyleSummaryRowEditsRef = useRef([]);
  const validationWarningShownRef = useRef(false);

  const fetchRelatedStores = (data) => {
    setShowStoreView(true);
    setSelectedStyle(data);
  };

  const storeAction = {
    store_count: fetchRelatedStores,
  };

  const setEditableLinkColumn = (item) => {
    item.is_editable = true;
    item.type = "link";
    item.extra = { enableIcon: true };
    return item;
  };

  useEffect(() => {
    const fetchColumnConfig = async () => {
      props.setInventorysmartOrderBatchingSummaryTableConfigLoader(true);
      let columns = await props.getOrderBatchingSummaryStyleTableConfiguration();
      columns?.data?.data?.forEach((col) => {
        if (col.column_name === "store_count") {
          col = setEditableLinkColumn(col);
        }
      });
      let formattedColumns = agGridColumnFormatter(
        columns?.data?.data,
        null,
        storeAction
      );
      setColumnConfigs(formattedColumns);
      props.setInventorysmartOrderBatchingSummaryTableConfigLoader(false);
    };
    fetchColumnConfig();
    return () => {
      props.setEditModeEnabledOnSummary(false);
    };
  }, []);

  useEffect(() => {
    if (!isEmpty(updatedStyleSummaryRowEdits))
      updatedStyleSummaryRowEditsRef.current = cloneDeep(
        updatedStyleSummaryRowEdits
      );
  }, [updatedStyleSummaryRowEdits]);

  // Apply edit mode state when columns are first loaded
  useEffect(() => {
    if (columnConfigs.length > 0) {
      showEditValuesModal(props.editModeEnabledOnSummary);
    }
  }, [columnConfigs.length]);

  useEffect(() => {
    if (!isEmpty(props.selectedFilters) && !props.inventorysmartReloadOrderBatchingData) {
      showEditValuesModal && disableSummaryTableEditing();
      fetchOrderBatchingSummaryTableData();
    }
  }, [props.selectedFilters]);

  useEffect(() => {
    consumerCategorySummaryActions(editValuesModalOpen);
  }, [editValuesModalOpen]);

  useEffect(() => {
    if (props.editModeEnabledOnDetails) {
      showEditValuesModal(false);
    }
  }, [props.editModeEnabledOnDetails]);

  useEffect(() => {
    props.inventorysmartReloadOrderBatchingData &&
      fetchOrderBatchingSummaryTableData();
  }, [props.inventorysmartReloadOrderBatchingData]);

  const fetchOrderBatchingSummaryTableData = async () => {
    try {
      props.setOrderBatchingSummaryStyleDataLoader(true);
      let body = {
        filters: props.selectedFilters,
        ...(props.cacheKeyPrepared && { cache_key: props.cache_key }),
        ...(createdAtDate && { created_at: createdAtDate }),
      };
      if (selectedOption === "edit") {
        body = {
          ...body,
          session_id: sessionId,
          is_update_mode: true,
        };
      }
      let response = await props.getOrderBatchingSummaryStyleTableData(body);
      if (response.data.status) {
        setTableData(cloneDeep(response.data.data));
        props.setOrderBatchingSummaryStyleTableData(response.data);
        props.setOrderBatchingSummaryStyleDataLoader(false);
        if (response.data?.show_message) {
          displaySnackMessages(response.data?.message, "success", props);
        }
      } else {
        setTableData([]);
        props.setOrderBatchingSummaryStyleDataLoader(false);
      }
    } catch (e) {
      handleErrorMessage(e, props);
      props.setOrderBatchingSummaryStyleDataLoader(false);
    }
  };

  const getAvailableSetAllFields = () => {
    const fields = [];
    const checkColumn = (col) => {
      if (col.column_name === "product_level_packs") fields.push("packs");
      if (col.column_name === "product_level_eaches") fields.push("eaches");
    };
    columnConfigs.forEach((column) => {
      if (column.sub_headers?.length > 0) {
        column.sub_headers.forEach(checkColumn);
      } else {
        checkColumn(column);
      }
    });
    return fields;
  };

  const applyEditableToColumn = (col, showEdits) => {
    if (
      col.column_name === "product_level_eaches" ||
      col.column_name === "product_level_packs"
    ) {
      col.is_editable = showEdits;
      if (showEdits) {
        col.cellRenderer = (params, extraProps) => {
          return (
            <CellRenderers
              cellData={params}
              column={col}
              extraProps={extraProps}
              actions={null}
            ></CellRenderers>
          );
        };
      } else {
        col.cellRenderer = null;
      }
    }
  };

  const showEditValuesModal = (showEdits) => {
    let newCol = columnConfigs.map((column) => {
      if (column.sub_headers?.length > 0) {
        column.sub_headers.forEach((subHeader) => {
          applyEditableToColumn(subHeader, showEdits);
        });
      } else {
        applyEditableToColumn(column, showEdits);
      }
      return column;
    });
    setColumnConfigs(newCol);
    agGridInstance.current?.api?.refreshCells({
      force: true,
    });
    setEditValuesModalOpen(showEdits);
  };

  const loadTableInstance = (params) => {
    agGridInstance.current = params;
  };

  const applyAiSmartFilterToColumn = (columnName, values) => {
    if (!columnName) return;
    const api = agGridInstance.current?.api;
    if (!api) return;

    if (Array.isArray(values) && values.length > 0) {
      api.setFilterModel({
        [columnName]: {
          filterType: "text",
          type: "contains",
          filter: values.join(","),
        },
      });
    } else {
      const currentModel = api.getFilterModel() || {};
      if (Object.prototype.hasOwnProperty.call(currentModel, columnName)) {
        const { [columnName]: _removed, ...rest } = currentModel;
        api.setFilterModel(rest);
      }
    }
  };

  const smartFilterButton = props.orderBatchingConfig?.enableSmartFilter ? (
    <AiSmartFilterButton
      key="ai-smart-filter-btn"
      columns={columnConfigs}
      filters={mapFiltersForAiSmartFilter(props?.selectedFilters)}
      onFilterApplied={applyAiSmartFilterToColumn}
      onAppliedFilterChange={aiChips.onAppliedFilterChange}
      onAppliedFilterCleared={aiChips.onAppliedFilterCleared}
      screenName={AI_SMART_FILTER_OB_STYLE_COLOR_LEVEL_DETAILS.screenName}
      tableId={AI_SMART_FILTER_OB_STYLE_COLOR_LEVEL_DETAILS.tableId}
      hideSuggestions
    />
  ) : null;

  const smartFilterChips = smartFilterButton ? (
    <AiSmartFilterChips
      chips={aiChips.chips}
      onChipClick={(chip) =>
        aiChips.handleChipClick(chip, applyAiSmartFilterToColumn)
      }
      onChipRemove={(chip) =>
        aiChips.handleChipRemove(chip, applyAiSmartFilterToColumn)
      }
    />
  ) : null;

  const enableSummaryTableEditing = () => {
    props.setEditModeEnabledOnSummary(true);
    showEditValuesModal(true);
  };

  const disableSummaryTableEditing = (resetData = true) => {
    props.setEditModeEnabledOnSummary(false);
    showEditValuesModal(false);
    setUpdatedStyleSummaryRowEdits([]);
    updatedStyleSummaryRowEditsRef.current = [];
    validationWarningShownRef.current = false;
    if (resetData) {
      setTableData(cloneDeep(props.orderBatchingSummaryStyleTableData?.data));
    }
  };

  const saveStyleSummaryRowEdits = (data) => {
    let rowDetails = [];
    // Optimized logic for building rowDetails, similar to store table
    const getAllocationUpdates = (item, data) => {
      if (data && !isEmpty(data)) {
        return {
          product_level_eaches: data.type === "eaches" ? data.value : null,
          product_level_packs: data.type === "packs" ? data.value : null,
        };
      } else {
        return {
          product_level_eaches: item.product_level_eaches,
          product_level_packs: item.product_level_packs,
        };
      }
    };

    const sourceArray =
      selectedStyles.length > 0 && !isEmpty(data)
        ? selectedStyles
        : updatedStyleSummaryRowEdits;

    const buildRow = (item) => {
      const uniqueCols = props.orderBatchingConfig?.product_lvl_unique_cols;
      if (!isEmpty(uniqueCols)) {
        return uniqueCols.reduce((acc, col) => {
          acc[col] = item[col];
          return acc;
        }, {});
      }
      return { l1_name: item.l1_name, l3_name: item.l3_name };
    };

    rowDetails = sourceArray.map((item) => ({
      row: buildRow(item),
      allocation_updates: getAllocationUpdates(item, data),
    }));

    let body = {
      filters: props.selectedFilters,
      ...(createdAtDate && { created_at: createdAtDate }),
      session_id: sessionId,
      is_set_all: false,
      included: [],
      excluded: [],
      meta: {},
      row_updates: rowDetails,
      is_update_mode: true,
    };

    if (!isEmpty(data)) {
      body.is_percentage = data.isPercentage;
    }
    return body;
  };

  const showSummaryOnEdit = async (data) => {
    if (
      updatedStyleSummaryRowEdits.length > 0 ||
      (!isEmpty(data) && selectedStyles.length > 0)
    ) {
      try {
        props.setOrderBatchingSummaryStyleDataLoader(true);
        let body = saveStyleSummaryRowEdits(data);
        const response = await props.getOrderBatchingSummary(body);
        if (response.data?.status) {
          displaySnackMessages(response.data?.message, "success", props);
          // Keep the loader on and don't repaint stale data — the reload
          // fetch refreshes the grid with the updated values.
          disableSummaryTableEditing(false);
          props.setInventorysmartReloadOrderBatchingData(true);
          setTimeout(() => {
            props.setInventorysmartReloadOrderBatchingData(false);
          }, 1000);
        } else {
          if (response.data?.show_message) {
            displaySnackMessages(response.data?.message, "error", props);
          }
          disableSummaryTableEditing();
          props.setOrderBatchingSummaryStyleDataLoader(false);
        }
      } catch (e) {
        handleErrorMessage(e);
        disableSummaryTableEditing();
        props.setOrderBatchingSummaryStyleDataLoader(false);
      }
    } else {
      if (!validationWarningShownRef.current) {
        displaySnackMessages(
          t("inventorysmart.obNoChangesToUpdate"),
          "warning",
          props
        );
      }
      validationWarningShownRef.current = false;
    }
  };

  const openSetAllModal = () => {
    if (updatedStyleSummaryRowEdits.length > 0) {
      displaySnackMessages(
        t("inventorysmart.obSaveRowEditsBeforeSetAll"),
        "warning",
        props
      );
    } else {
      setStyleSummarySetAllModalOpen(true);
    }
  };

  const consumerCategorySummaryActions = (editButtonClicked) => {
    const options = [];
    if (selectedOption === "view") {
      if (smartFilterButton) {
        options.push(smartFilterButton);
      }
      return options.length > 0 ? options : null;
    }
    options.push(
      <Button
        size="large"
        type="default"
        variant="tertiary"
        id="update-style-summary-set-all-button"
        onClick={() => openSetAllModal()}
        disabled={selectedStyles.length === 0}
      >
        Set All
      </Button>,
      <div className="divider-line"></div>
    );
    if (editButtonClicked) {
      options.push(
        <Button
          size="large"
          type="default"
          variant="text"
          id="cancel-style-summary-button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => disableSummaryTableEditing()}
        >
          Cancel
        </Button>,
        <Button
          size="large"
          type="default"
          variant="primary"
          id="update-style-summary-button"
          onClick={() => showSummaryOnEdit()} // call API / summary update
        >
          Update
        </Button> // to show the summary popup here
      );
    } else {
      options.push(
        <Button
          size="large"
          type="default"
          variant="secondary"
          id="edit-style-summary-button"
          disabled={props.editModeEnabledOnDetails}
          onClick={() => enableSummaryTableEditing()}
        >
          Edit Values
        </Button>
      );
    }
    if (smartFilterButton) {
      options.push(smartFilterButton);
    }
    return options;
  };

  const handleSelectionChanged = (event) => {
    let selections = event.api.getSelectedRows().map((item) => item); // to change this something valid
    setSelectedStyles(selections);
    const limits = fetchSetAllLimits(selections, {
      packsAvailableKey: "product_level_packs_available",
      eachesAvailableKey: "product_level_eaches_available",
      packsAllocatedKey: "product_level_packs",
      eachesAllocatedKey: "product_level_eaches",
      packsOriginalKey: "product_level_packs_original",
      eachesOriginalKey: "product_level_eaches_original",
      packsPctKey: "product_level_packs_max_increase_pct",
      eachesPctKey: "product_level_eaches_max_increase_pct",
      useMinAvailable: true,
    });
    setSetAllLimits(limits);
  };

  const updateEditedRowState = (data) => {
    let cloneRefInstance = cloneDeep(updatedStyleSummaryRowEditsRef.current);
    const existingIndex = cloneRefInstance.findIndex(
      (obj) => obj.unique_key === data.unique_key
    );
    if (existingIndex !== -1) {
      // Replace the existing object with the new object
      cloneRefInstance[existingIndex] = data;
      setUpdatedStyleSummaryRowEdits(cloneRefInstance);
    } else {
      // Push the new object to the state
      setUpdatedStyleSummaryRowEdits((prevState) => [...prevState, data]);
    }
  };

  const onBlur = async (e, data, column, isChanged, value, initialValue) => {
    if (
      (column.colId === "product_level_eaches" ||
        column.colId === "product_level_packs") &&
      isChanged
    ) {
      if (props.orderBatchingConfig?.allow_allocation_increase) {
        const available = data[`${column.colId}_available`];
        const maxLimit =
          available === null || available === undefined
            ? null
            : (Number(data[`${column.colId}_original`]) || 0) +
              Number(available);
        if (maxLimit !== null && value > maxLimit) {
          validationWarningShownRef.current = true;
          displaySnackMessages(
            t("inventorysmart.obInputCappedToMaxLimit"),
            "warning",
            props,
            true
          );
          data[column.colId] = maxLimit;
        } else {
          data[column.colId] = value;
        }
        updateEditedRowState(data);
      } else {
        let oldValue = props.orderBatchingSummaryStyleTableData.data.find(
          (item) => item.unique_key === data.unique_key
        )[column.colId];
        if (value > oldValue) {
          validationWarningShownRef.current = true;
          displaySnackMessages(
            t("inventorysmart.obNewValueGreaterThanInitial"),
            "warning",
            props,
            true
          );
          data[column.colId] = oldValue;
        } else {
          data[column.colId] = value;
          updateEditedRowState(data);
        }
      }
      agGridInstance.current?.api?.refreshCells({
        columns: [column.colId],
      });
    }
  };

  return (
    <>
      <Loader
        loader={
          props.inventorysmartOrderBatchingSummaryTableConfigLoader ||
          props.orderBatchingSummaryStyleDataLoader
        }
        minHeight={"120px"}
      >
        {!props.inventorysmartOrderBatchingSummaryTableConfigLoader &&
          !props.orderBatchingSummaryStyleDataLoader && (
            <AgGridComponent
              downloadAsExcel={tableData?.length ? true : false}
              columns={columnConfigs}
              rowdata={tableData}
              uniqueRowId={"unique_key"}
              loadTableInstance={loadTableInstance}
              skipAutoColumn
              tableHeader={`Allocation Summary ${props.summaryTableHeader ? ` - ${props.summaryTableHeader}` : ""}`}
            topLeftOptions={smartFilterChips}
              topRightOptions={consumerCategorySummaryActions(
                editValuesModalOpen
              )}
              onSelectionChanged={handleSelectionChanged}
              selectAllHeaderComponent={selectedOption === "edit"}
              onBlur={onBlur}
            />
          )}
      </Loader>
      <NewOrderBatchingSummarySetAll
        showSetAllModal={styleSummarySetAllModalOpen}
        closeSetAllModal={() => setStyleSummarySetAllModalOpen(false)}
        displaySnackMessages={displaySnackMessages}
        onApplySetAll={(data) => showSummaryOnEdit(data)}
        setAllLimits={setAllLimits}
        allowIncrease={props.orderBatchingConfig?.allow_allocation_increase}
        availableFields={getAvailableSetAllFields()}
      />
      {showStoreView && (
        <NewOrderBatchingBottomSheetTableView
          title="Store"
          onClose={() => setShowStoreView(false)}
          {...props}
          createdAtDate={createdAtDate}
          sessionId={sessionId}
          selectedOption={selectedOption}
          rowData={selectedStyle}
          open={showStoreView}
          header="Store Details"
        />
      )}
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    selectedFilters:
      store.inventorysmartReducer.inventorySmartOrderBatchingService
        .selectedFilters,
    cache_key:
      store.inventorysmartReducer.inventorySmartOrderBatchingService.cache_key,
    cacheKeyPrepared:
      store.inventorysmartReducer.inventorySmartOrderBatchingService
        .cacheKeyPrepared,
    inventorysmartReloadOrderBatchingData:
      store.inventorysmartReducer.inventorySmartOrderBatchingService
        .inventorysmartReloadOrderBatchingData,
    inventorysmartOrderBatchingSummaryTableConfigLoader:
      store.inventorysmartReducer.inventorySmartOrderBatchingSummaryService
        .inventorysmartOrderBatchingSummaryTableConfigLoader,
    orderBatchingSummaryStyleDataLoader:
      store.inventorysmartReducer.inventorySmartOrderBatchingSummaryService
        .orderBatchingSummaryStyleDataLoader,
    orderBatchingSummaryStyleTableData:
      store.inventorysmartReducer.inventorySmartOrderBatchingSummaryService
        .orderBatchingSummaryStyleTableData,
    inventorysmartScreenConfig:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
    editModeEnabledOnDetails:
      store.inventorysmartReducer.inventorySmartOrderBatchingService
        .editModeEnabledOnDetails,
    editModeEnabledOnSummary:
      store.inventorysmartReducer.inventorySmartOrderBatchingSummaryService
        .editModeEnabledOnSummary,
    summaryTableHeader:
      store.inventorysmartReducer?.inventorySmartCommonService
        ?.orderBatchingConfig?.summaryTableHeader,
    orderBatchingConfig:
      store.inventorysmartReducer.inventorySmartCommonService
        .orderBatchingConfig,
  };
};

const mapDispatchToProps = (dispatch) => ({
  getOrderBatchingSummaryStyleTableConfiguration: () =>
    dispatch(getOrderBatchingSummaryStyleTableConfiguration()),
  getOrderBatchingSummaryStyleTableData: (payload) =>
    dispatch(getOrderBatchingSummaryStyleTableData(payload)),
  setInventorysmartOrderBatchingSummaryTableConfigLoader: (payload) =>
    dispatch(setInventorysmartOrderBatchingSummaryTableConfigLoader(payload)),
  setOrderBatchingSummaryStyleDataLoader: (payload) =>
    dispatch(setOrderBatchingSummaryStyleDataLoader(payload)),
  setOrderBatchingSummaryStyleTableData: (payload) =>
    dispatch(setOrderBatchingSummaryStyleTableData(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  setEditModeEnabledOnSummary: (payload) =>
    dispatch(setEditModeEnabledOnSummary(payload)),
  getOrderBatchingSummary: (payload) =>
    dispatch(getOrderBatchingSummary(payload)),
  setInventorysmartReloadOrderBatchingData: (payload) =>
    dispatch(setInventorysmartReloadOrderBatchingData(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(OrderBatchingSummaryStyleTable);
