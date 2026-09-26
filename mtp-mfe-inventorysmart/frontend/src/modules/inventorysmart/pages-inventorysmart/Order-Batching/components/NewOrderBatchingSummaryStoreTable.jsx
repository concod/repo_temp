import React, { useState, useEffect, useRef, useContext } from "react";
import { addSnack } from "core/actions/snackbarActions";
import { connect } from "react-redux";
import { Switch, Button, useTranslation } from "impact-ui-v3";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import Loader from "core/Utils/Loader/loader";
import { cloneDeep, isEmpty } from "lodash";
import {
  getOrderBatchingSummaryStoreTableConfiguration,
  getOrderBatchingSummaryStoreTableData,
  setInventorysmartOrderBatchingSummaryTableConfigLoader,
  setOrderBatchingSummaryStoreDataLoader,
  setOrderBatchingSummaryStoreTableData,
  setEditModeEnabledOnSummary,
} from "modules/inventorysmart/services-inventorysmart/Order-Batching/order-batching-summary-services";
import {
  handleErrorMessage,
  displaySnackMessages,
  mapFiltersForAiSmartFilter,
} from "../../inventorysmart-utility";
import CellRenderers from "core/Utils/agGrid/cellRenderer";
import NewOrderBatchingSummarySetAll from "./NewOrderBatchingSummarySetAll";
import { OrderBatchingContext } from "../index.js";
import {
  getOrderBatchingSummary,
  setInventorysmartReloadOrderBatchingData,
} from "modules/inventorysmart/services-inventorysmart/Order-Batching/order-batching-services";
import { fetchSetAllLimits } from "../../inventorysmart-utility.js";
import NewOrderBatchingBottomSheetTableView from "./NewOrderBatchingBottomSheetTableView";
import { getProgressBarCellStyle } from "./orderBatchingHelperFunctions";
import AiSmartFilterButton from "../../Decision-Dashboard/components/AiSmartFilterButton";
import AiSmartFilterChips from "../../Decision-Dashboard/components/AiSmartFilterChips";
import useAiSmartFilterChips from "../../Decision-Dashboard/components/useAiSmartFilterChips";
import { AI_SMART_FILTER_OB_STORE_LEVEL_DETAILS } from "../../Decision-Dashboard/components/aiSmartFilterDummyConstants";

const OrderBatchingSummaryStoreTable = (props) => {
  const agGridInstance = useRef(null);
  const aiChips = useAiSmartFilterChips();
  const { t } = useTranslation();

  const [columnConfigs, setColumnConfigs] = useState([]);
  const [tableData, setTableData] = useState([]);
  const [negativeCapacityOnly, setNegativeCapacityOnly] = useState(false);
  const [editValuesModalOpen, setEditValuesModalOpen] = useState(false);
  const [selectedStores, setSelectedStores] = useState([]);
  const [
    updatedStoreSummaryRowEdits,
    setUpdatedStoreSummaryRowEdits,
  ] = useState([]);

  const [
    storeSummarySetAllModalOpen,
    setStoreSummarySetAllModalOpen,
  ] = useState(false);
  const [showStyleView, setShowStyleView] = useState(false);
  const {
    selectedOption,
    sessionId,
    createdAtDate,
    setSelectedOption,
  } = useContext(OrderBatchingContext);
  const [setAllLimits, setSetAllLimits] = useState({});
  const [selectedStore, setSelectedStore] = useState(null);
  const updatedStoreSummaryRowEditsRef = useRef([]);
  const validationWarningShownRef = useRef(false);

  const fetchRelatedStyles = (data) => {
    setShowStyleView(true);
    setSelectedStore(data);
  };

  const styleAction = {
    style_count: fetchRelatedStyles,
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
      let columns = await props.getOrderBatchingSummaryStoreTableConfiguration();
      props.setInventorysmartOrderBatchingSummaryTableConfigLoader(false);
      columns?.data?.data?.forEach((col) => {
        if (col.column_name === "style_count") {
          col = setEditableLinkColumn(col);
        }
        if (col.column_name === "store_percentage_to_capacity") {
          col.styleProgressBar = getProgressBarCellStyle;
        }
        // Apply breach configuration BEFORE formatting
        if (col.type === "breach_status") {
          
          col.extra = {
            ...col.extra,
            showBreachIcon: (data) => data?.store_to_perc_cap > 100
          };
          col.cellRenderer = (cellProps) => (
            <CellRenderers cellData={cellProps} column={col} />
          );
        }
        if (col.type === "breach_progress") {
          col.cellRenderer = (cellProps) => (
            <CellRenderers cellData={cellProps} column={col} />
          );
        }

      });
      let formattedColumns = agGridColumnFormatter(
        columns?.data?.data,
        null,
        styleAction
      );
      setColumnConfigs(formattedColumns);
    };
    fetchColumnConfig();
    return () => {
      props.setEditModeEnabledOnSummary(false);
    };
  }, []);

  useEffect(() => {
    if (!isEmpty(updatedStoreSummaryRowEdits))
      updatedStoreSummaryRowEditsRef.current = cloneDeep(
        updatedStoreSummaryRowEdits
      );
  }, [updatedStoreSummaryRowEdits]);

  // Apply edit mode state when columns are first loaded
  useEffect(() => {
    if (columnConfigs.length > 0) {
      showEditValuesModal(props.editModeEnabledOnSummary);
    }
  }, [columnConfigs.length]);

  useEffect(() => {
    if (props.editModeEnabledOnDetails) {
      showEditValuesModal(false);
    }
  }, [props.editModeEnabledOnDetails]);

  useEffect(() => {
    if (!isEmpty(props.selectedFilters) && !props.inventorysmartReloadOrderBatchingData) {
      showEditValuesModal && disableSummaryTableEditing();
      fetchOrderBatchingSummaryTableData();
    }
  }, [props.selectedFilters]);

  useEffect(() => {
    props.inventorysmartReloadOrderBatchingData &&
      fetchOrderBatchingSummaryTableData();
  }, [props.inventorysmartReloadOrderBatchingData]);

  useEffect(() => {
    storeSummaryActions(editValuesModalOpen);
  }, [editValuesModalOpen]);

  const fetchOrderBatchingSummaryTableData = async () => {
    try {
      props.setOrderBatchingSummaryStoreDataLoader(true);
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
      let response = await props.getOrderBatchingSummaryStoreTableData(body);
      if (response.data.status) {
        setTableData(cloneDeep(response.data.data));
        props.setOrderBatchingSummaryStoreTableData(response.data);
        props.setOrderBatchingSummaryStoreDataLoader(false);
        if (response.data?.show_message) {
          displaySnackMessages(response.data?.message, "success", props);
        }
      } else {
        setTableData([]);
        props.setOrderBatchingSummaryStoreTableData({
          data: [],
        });
        props.setOrderBatchingSummaryStoreDataLoader(false);
      }
    } catch (e) {
      handleErrorMessage(e, props);
      props.setOrderBatchingSummaryStoreDataLoader(false);
    }
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

  const smartFilterButton = props.enableSmartFilter ? (
    <AiSmartFilterButton
      key="ai-smart-filter-btn"
      columns={columnConfigs}
      filters={mapFiltersForAiSmartFilter(props?.selectedFilters)}
      onFilterApplied={applyAiSmartFilterToColumn}
      onAppliedFilterChange={aiChips.onAppliedFilterChange}
      onAppliedFilterCleared={aiChips.onAppliedFilterCleared}
      screenName={AI_SMART_FILTER_OB_STORE_LEVEL_DETAILS.screenName}
      tableId={AI_SMART_FILTER_OB_STORE_LEVEL_DETAILS.tableId}
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

  const filterNegativeCapacityOnly = (checked) => {
    if (checked) {
      setNegativeCapacityOnly(checked);
      let filteredData = tableData.filter((item) => {
        return +item.store_percentage_to_capacity > 100;
      });
      setTableData(filteredData);
    } else {
      setNegativeCapacityOnly(checked);
      setTableData(cloneDeep(props.orderBatchingSummaryStoreTableData?.data));
    }
  };

  const getAvailableSetAllFields = () => {
    const fields = [];
    const checkColumn = (col) => {
      if (col.column_name === "store_level_packs") fields.push("packs");
      if (col.column_name === "store_level_eaches") fields.push("eaches");
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
      col.column_name === "store_level_eaches" ||
      col.column_name === "store_level_packs"
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

  const enableSummaryTableEditing = () => {
    props.setEditModeEnabledOnSummary(true);
    showEditValuesModal(true);
  };

  const disableSummaryTableEditing = (resetData = true) => {
    props.setEditModeEnabledOnSummary(false);
    showEditValuesModal(false);
    setUpdatedStoreSummaryRowEdits([]);
    updatedStoreSummaryRowEditsRef.current = [];
    validationWarningShownRef.current = false;
    if (resetData) {
      setTableData(cloneDeep(props.orderBatchingSummaryStoreTableData?.data));
    }
  };

  const saveStoreSummaryRowEdits = (data) => {
    let rowDetails = [];
    const getAllocationUpdates = (item, data) => {
      if (data && !isEmpty(data)) {
        return {
          store_level_eaches: data.type === "eaches" ? data.value : null,
          store_level_packs: data.type === "packs" ? data.value : null,
        };
      } else {
        return {
          store_level_eaches: item.store_level_eaches,
          store_level_packs: item.store_level_packs,
        };
      }
    };

    const sourceArray =
      selectedStores.length > 0 && !isEmpty(data)
        ? selectedStores
        : updatedStoreSummaryRowEdits;

    rowDetails = sourceArray.map((item) => ({
      row: {
        store: item.store,
      },
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
      updatedStoreSummaryRowEdits.length > 0 ||
      (!isEmpty(data) && selectedStores.length > 0)
    ) {
      try {
        props.setOrderBatchingSummaryStoreDataLoader(true);
        let body = saveStoreSummaryRowEdits(data);
        let response = await props.getOrderBatchingSummary(body);
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
          props.setOrderBatchingSummaryStoreDataLoader(false);
        }
      } catch (e) {
        handleErrorMessage(e);
        disableSummaryTableEditing();
        props.setOrderBatchingSummaryStoreDataLoader(false);
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
    if (updatedStoreSummaryRowEdits.length > 0) {
      displaySnackMessages(
        t("inventorysmart.obSaveRowEditsBeforeSetAll"),
        "warning",
        props
      );
    } else {
      setStoreSummarySetAllModalOpen(true);
    }
  };

  const storeSummaryActions = (editButtonClicked) => {
    let options = [];
    if (selectedOption === "view") {
      if (props.showCapacityToggle) {
        options = [
          <Switch
            leftLabel=""
            onChange={(e) => {
              filterNegativeCapacityOnly(e.target.checked);
            }}
            value={negativeCapacityOnly}
            rightLabel="Show negative capacity only"
          />,
          <div className="divider-line"></div>,
        ];
      }
      if (smartFilterButton) {
        options.push(smartFilterButton);
      }
      return options.length > 0 ? options : null;
    }
    if (props.showCapacityToggle) {
      options.push(
        <Switch
          leftLabel=""
          onChange={(e) => {
            filterNegativeCapacityOnly(e.target.checked);
          }}
          value={negativeCapacityOnly}
          rightLabel="Show negative capacity only"
        />,
        <div className="divider-line"></div>
      );
    }
    options.push(
      <Button
        size="large"
        type="default"
        variant="tertiary"
        id="update-store-summary-set-all-button"
        onClick={() => openSetAllModal()}
        disabled={selectedStores.length === 0}
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
          id="cancel-store-summary-button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => disableSummaryTableEditing()}
        >
          Cancel
        </Button>,
        <Button
          size="large"
          type="default"
          variant="primary"
          id="update-store-summary-button"
          onClick={() => showSummaryOnEdit()}
        >
          Update
        </Button>
      );
    } else {
      options.push(
        <Button
          size="large"
          type="default"
          variant="secondary"
          id="edit-store-summary-button"
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
    setSelectedStores(selections);
    let limits = fetchSetAllLimits(selections, {
      packsAvailableKey: "store_level_packs_available",
      eachesAvailableKey: "store_level_eaches_available",
      packsAllocatedKey: "store_level_packs",
      eachesAllocatedKey: "store_level_eaches",
      packsOriginalKey: "store_level_packs_original",
      eachesOriginalKey: "store_level_eaches_original",
      packsPctKey: "store_level_packs_max_increase_pct",
      eachesPctKey: "store_level_eaches_max_increase_pct",
    });
    setSetAllLimits(limits);
  };

  const updateEditedRowState = (data) => {
    let cloneRefInstance = cloneDeep(updatedStoreSummaryRowEditsRef.current);
    const existingIndex = cloneRefInstance.findIndex(
      (obj) => obj.store === data.store
    );
    if (existingIndex !== -1) {
      // Replace the existing object with the new object
      cloneRefInstance[existingIndex] = data;
      setUpdatedStoreSummaryRowEdits(cloneRefInstance);
    } else {
      // Push the new object to the state
      setUpdatedStoreSummaryRowEdits((prevState) => [...prevState, data]);
    }
  };

  const onBlur = (e, data, column, isChanged, value, initialValue) => {
    if (
      (column.colId === "store_level_eaches" ||
        column.colId === "store_level_packs") &&
      isChanged
    ) {
      if (props.allowAllocationIncrease) {
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
        let oldValue = props.orderBatchingSummaryStoreTableData.data.find(
          (item) => item.store === data.store
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
          props.orderBatchingSummaryStoreDataLoader
        }
        minHeight={"120px"}
      >
        {!props.inventorysmartOrderBatchingSummaryTableConfigLoader &&
          !props.orderBatchingSummaryStoreDataLoader && (
            <AgGridComponent
              downloadAsExcel={tableData?.length ? true : false}
              columns={columnConfigs}
              rowdata={tableData}
              uniqueRowId={"store"}
              loadTableInstance={loadTableInstance}
              skipAutoColumn
              tableHeader={"Allocation Summary - Stores"}
            topLeftOptions={smartFilterChips}
              topRightOptions={storeSummaryActions(editValuesModalOpen)}
              onSelectionChanged={handleSelectionChanged}
              selectAllHeaderComponent={selectedOption === "edit"}
              onBlur={onBlur}
            />
          )}
      </Loader>
      <NewOrderBatchingSummarySetAll
        showSetAllModal={storeSummarySetAllModalOpen}
        closeSetAllModal={() => setStoreSummarySetAllModalOpen(false)}
        onApplySetAll={(data) => showSummaryOnEdit(data)}
        setAllLimits={setAllLimits}
        allowIncrease={props.allowAllocationIncrease}
        availableFields={getAvailableSetAllFields()}
      />
      {showStyleView && (
        <NewOrderBatchingBottomSheetTableView
          title="Style"
          onClose={() => setShowStyleView(false)}
          {...props}
          createdAtDate={createdAtDate}
          sessionId={sessionId}
          selectedOption={selectedOption}
          rowData={selectedStore}
          open={showStyleView}
          header="Style Details"
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
    orderBatchingSummaryStoreDataLoader:
      store.inventorysmartReducer.inventorySmartOrderBatchingSummaryService
        .orderBatchingSummaryStoreDataLoader,
    orderBatchingSummaryStoreTableData:
      store.inventorysmartReducer.inventorySmartOrderBatchingSummaryService
        .orderBatchingSummaryStoreTableData,
    inventorysmartScreenConfig:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
    editModeEnabledOnDetails:
      store.inventorysmartReducer.inventorySmartOrderBatchingService
        .editModeEnabledOnDetails,
    editModeEnabledOnSummary:
      store.inventorysmartReducer.inventorySmartOrderBatchingSummaryService
        .editModeEnabledOnSummary,
    showCapacityToggle:
      store.inventorysmartReducer?.inventorySmartCommonService
        ?.orderBatchingConfig?.showCapacityToggle,
    enableSmartFilter:
      store.inventorysmartReducer?.inventorySmartCommonService
        ?.orderBatchingConfig?.enableSmartFilter,
    allowAllocationIncrease:
      store.inventorysmartReducer?.inventorySmartCommonService
        ?.orderBatchingConfig?.allow_allocation_increase,
  };
};

const mapDispatchToProps = (dispatch) => ({
  getOrderBatchingSummaryStoreTableConfiguration: () =>
    dispatch(getOrderBatchingSummaryStoreTableConfiguration()),
  getOrderBatchingSummaryStoreTableData: (payload) =>
    dispatch(getOrderBatchingSummaryStoreTableData(payload)),
  setInventorysmartOrderBatchingSummaryTableConfigLoader: (payload) =>
    dispatch(setInventorysmartOrderBatchingSummaryTableConfigLoader(payload)),
  setOrderBatchingSummaryStoreDataLoader: (payload) =>
    dispatch(setOrderBatchingSummaryStoreDataLoader(payload)),
  setOrderBatchingSummaryStoreTableData: (payload) =>
    dispatch(setOrderBatchingSummaryStoreTableData(payload)),
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
)(OrderBatchingSummaryStoreTable);
