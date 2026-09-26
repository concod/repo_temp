import React, { useEffect, useMemo, useRef, useState } from "react";
import { connect } from "react-redux";
import Paper from "@mui/material/Paper";
import globalStyles from "core/Styles/globalStyles";
import LoadingOverlay from "core/Utils/Loader/loader";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { addSnack } from "core/actions/snackbarActions";
import {
  getStoreCapacityTableData,
  setStoreCapactiyEditLoader,
  setStoreCapactiySummaryLoader,
  updateStoreCapacityTableData,
} from "modules/inventorysmart/services-inventorysmart/Finalize/store-capacity-service";
import {
  defaultTableData,
  ERROR_MESSAGE,
  FINALIZE_STORE_CAPACITY_GROUPED_COLUMN_NAMES,
  FINALIZE_STORE_CAPACITY_PARENT_LEVEL_COLUMNS,
  NO_UPDATE,
  UPDATED_MESSAGE,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { getIgnoreAllocationCode } from "../../Create-Allocation/helperFunctions";
import {
  setAllocationCode,
  setOriginalAllocationCode,
} from "modules/inventorysmart/services-inventorysmart/Finalize/store-view-services";
import SizePopup from "./StoreCapacityPopup";
import AiSmartFilterButton from "../../Decision-Dashboard/components/AiSmartFilterButton";
import { AI_SMART_FILTER_CNA_STORE_CAPACITY } from "../../Decision-Dashboard/components/aiSmartFilterDummyConstants";
const StoreCapacity = function (props) {
  const globalClasses = globalStyles();

  const agGridUserInstance = useRef(null);
  const [showSizeLevelPopup, setShowSizeLevelPopup] = useState(false);

  const [storeCapacityData, setStoreCapacityData] = useState([]);
  const [storeCapacityTableColumns, setStoreCapacityColumns] = useState([]);
  const [selectedRowData, setSelectedRowData] = useState([]);
  const [isTreeDataEnabled, setIsTreeDataEnabled] = useState(false);
  const [originalStoreCapacityData, setOriginalStoreCapacityData] = useState(
    []
  );

  const autoGroupColumnDef = useMemo(() => {
    return {
      headerName: "Store Code",
      minWidth: 250,
      cellRendererParams: {
        suppressCount: true,
        innerRenderer: (params) => {
          if (params.data?._isParent) {
            return params.data?.store_code;
          }
          return "";
        },
      },
    };
  }, []);

  const transformToTreeData = (tableData) => {
    const treeData = [];
    const storeGroups = {};

    tableData.forEach((row) => {
      const storeCode = row.store_code;
      if (!storeGroups[storeCode]) {
        storeGroups[storeCode] = [];
      }
      storeGroups[storeCode].push(row);
    });

    let index = 0;
    Object.keys(storeGroups).forEach((storeCode) => {
      const children = storeGroups[storeCode];
      const parentRow = { index: index++, path: [storeCode], _isParent: true };
      FINALIZE_STORE_CAPACITY_PARENT_LEVEL_COLUMNS.forEach((col) => {
        parentRow[col] = children[0][col];
      });
      treeData.push(parentRow);

      children.forEach((child, childIdx) => {
        const childRow = {
          ...child,
          index: index++,
          path: [storeCode, `${storeCode}_${childIdx}`],
          _isChild: true,
        };
        treeData.push(childRow);
      });
    });
    return treeData;
  };
  const getGroupedColumnConfig = (columnConfig) => {
    let l_groupedColumn = props.finalizeAllocationConfig?.storeCapacityBreach
      ?.grouped_columns
      ? props.finalizeAllocationConfig.storeCapacityBreach.grouped_columns
      : FINALIZE_STORE_CAPACITY_GROUPED_COLUMN_NAMES;
    const hasGroupedColumns = columnConfig?.some(
      (config) => l_groupedColumn.indexOf(config.column_name) !== -1
    );
    return hasGroupedColumns;
  };
  const storePopupClick = (params) => {
    setSelectedRowData(params.cellData.data);
    setShowSizeLevelPopup(true);
  };

  const handleErrorMessage = (e) => {
    const errObj = e?.response?.data;
    if (errObj?.show_message) displaySnackMessages(errObj?.message, "error");
    else displaySnackMessages(ERROR_MESSAGE, "error");
  };

  const fetchStoreCapacityData = async () => {
    if (props.allocationCode && props.planType) {
      try {
        props.setStoreCapactiySummaryLoader(true);
        let body = {
          allocation_code: props.allocationCode,
          article: props.articles,
          ignore_allocation_code: getIgnoreAllocationCode(
            props.originalAllocationCode,
            props.allocationCode
          ),
          plan_type: props.planType,
        };
        let isV3 = props.isV3?.includes("storeCapacityBreach");
        let response = await props.getStoreCapacityTableData(body, isV3);
        if (response?.data?.show_message) {
          displaySnackMessages(response?.data?.message, "success");
          if (!response?.data.status) {
            setStoreCapacityColumns([]);
            setStoreCapacityData([]);
            return;
          }
        }
        let config = response?.data?.data?.table_config;
        const hasGroupedColumns = getGroupedColumnConfig(config);
        setIsTreeDataEnabled(hasGroupedColumns);
        const rawTableData = response?.data?.data?.table_data || [];
        setOriginalStoreCapacityData(rawTableData);
        let formattedData;
        if (hasGroupedColumns) {
          formattedData = transformToTreeData(rawTableData);
        } else {
          formattedData = rawTableData.map((item, index) => ({
            ...item,
            index,
          }));
        }
        setStoreCapacityData(formattedData);
        config = config?.map((item) => {
          if (hasGroupedColumns && item.column_name === "store_code") {
            item.is_hidden = true;
          }
          if (item.column_name === "allocated_qty") {
            item.type = "link";
            item.is_editable = true;
          }
          return item;
        });
        let formattedColumns = agGridColumnFormatter(config, null);
        formattedColumns = formattedColumns?.map((item) => {
          if (item?.sub_headers?.length > 0) {
            item.sub_headers = item.sub_headers.map((col) => {
              if (col.type === "link") {
                col.onClick = storePopupClick;
              }
              return col;
            });
          }
          if (item.type === "link") {
            item.onClick = storePopupClick;
          }
          if (hasGroupedColumns) {
            const isParentCol = FINALIZE_STORE_CAPACITY_PARENT_LEVEL_COLUMNS.includes(
              item.field
            );
            const originalValueGetter = item.valueGetter;
            item.valueGetter = (params) => {
              if (isParentCol && params.data?._isChild) return "";
              if (!isParentCol && params.data?._isParent) return "";
              if (originalValueGetter) return originalValueGetter(params);
              return params.data?.[item.field];
            };
          }
          return item;
        });
        setStoreCapacityColumns(formattedColumns);
        setStoreCapacityData(formattedData);
      } catch (err) {
        handleErrorMessage(err);
        return defaultTableData;
      } finally {
        props.setStoreCapactiySummaryLoader(false);
      }
    }
  };

  const getFormattedAllocationCapacityData = (editedCapacityData) => {
    const formattedCapacityData = [];
    editedCapacityData.forEach((data) => {
      const formattedCapacityStoreData = {
        store_code: data.store_code,
        channel: data.channel,
        article: data.article,
        updated_eaches: {},
        updated_packs: {},
      };

      if (data.size?.length > 0) {
        formattedCapacityStoreData.updated_eaches = {
          [data.dc_code]: {},
        };

        data.size.forEach((size) => {
          formattedCapacityStoreData.updated_eaches[data.dc_code][size] =
            data[`size_value_allocated_eaches__${size}`];
        });
      }

      formattedCapacityData.push(formattedCapacityStoreData);
    });

    return formattedCapacityData;
  };

  const handleStoreCapacityChanges = async () => {
    try {
      props.setStoreCapactiyEditLoader(true);
      const editedCapacityData = storeCapacityData.filter(
        (data) => data.isEdited
      );

      if (editedCapacityData?.length > 0) {
        const payload = {
          allocation_code: props.allocationCode,
          edited_allocation_code: null,
          allocation_row: getFormattedAllocationCapacityData(
            editedCapacityData
          ),
        };

        const updatedResponse = await props.updateStoreCapacityTableData(
          payload,
          true
        );

        if (updatedResponse?.data?.status) {
          if (!props.originalAllocationCode) {
            props.setOriginalAllocationCode(props.allocationCode);
          }
          if (updatedResponse?.data?.data?.allocation_code) {
            props.setAllocationCode(
              updatedResponse?.data?.data?.allocation_code
            );
          } else {
            props.setAllocationCode(null);
            let allocationCodeCopy = props.allocationCode;
            props.setAllocationCode(allocationCodeCopy);
          }
          displaySnackMessages(UPDATED_MESSAGE, "success");
        }
      } else {
        displaySnackMessages(NO_UPDATE, "info");
      }
    } catch (err) {
      handleErrorMessage(err);
    } finally {
      props.setStoreCapactiyEditLoader(false);
    }
  };

  const onBlur = async (
    _e,
    data,
    column,
    isChanged,
    value,
    initialValue,
    _cellData,
    _tableType
  ) => {
    if (isChanged) {
      if (!value) {
        data[column.colId] = 0;
      }

      if (initialValue !== value) {
        data.isEdited = true;
        agGridUserInstance.current?.api?.refreshCells();
      }
    }
  };

  const loadUserTableInstance = (params) => {
    agGridUserInstance.current = params;
  };

  const applyAiSmartFilterToColumn = (columnName, values) => {
    if (!columnName) return;
    const api = agGridUserInstance.current?.api;
    if (!api) return;

    if (Array.isArray(values) && values.length > 0) {
      // Existing behavior: apply the Style Color IDs
      api.setFilterModel({
        [columnName]: {
          filterType: "text",
          type: "contains",
          filter: values.join(","),
        },
      });
    } else {
      // New behavior: clear this column's filter
      const currentFilterModel = api.getFilterModel() || {};

      delete currentFilterModel[columnName];

      api.setFilterModel(currentFilterModel);
    }
  };
  const applyStoreCapacitySmartFilter = (resultRows) => {
    if (!Array.isArray(resultRows)) return;

    const storeCodes = resultRows
      .map((row) => row["Store Code"])
      .filter(Boolean);

    const filteredRawData = originalStoreCapacityData.filter((row) =>
      storeCodes.includes(String(row.store_code))
    );

    const filteredTableData = isTreeDataEnabled
      ? transformToTreeData(filteredRawData)
      : filteredRawData.map((item, index) => ({
          ...item,
          index,
        }));

    setStoreCapacityData(filteredTableData);

    const styleColorIds = [
      ...new Set(
        resultRows.flatMap((row) =>
          Array.isArray(row["Style Color IDs"]) ? row["Style Color IDs"] : []
        )
      ),
    ];

    // Defer the grid API call so it runs after the row-data state update above
    // has finished rendering. Calling setFilterModel synchronously while the
    // grid is mid-draw throws AG Grid's "cannot get grid to draw rows when it
    // is in the middle of drawing rows" error.
    setTimeout(() => applyAiSmartFilterToColumn("article", styleColorIds), 0);
  };
  const resetStoreCapacitySmartFilter = () => {
    const restoredTableData = isTreeDataEnabled
      ? transformToTreeData(originalStoreCapacityData)
      : originalStoreCapacityData.map((item, index) => ({
          ...item,
          index,
        }));

    setStoreCapacityData(restoredTableData);
  };

  useEffect(() => {
    fetchStoreCapacityData();
  }, [props.allocationCode, props.planType]);

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  return (
    <LoadingOverlay
      loader={props.storeCapacitySummaryLoader || props.storeCapactiyEditLoader}
    >
      <Paper className={globalClasses.paperWrapper}>
        {showSizeLevelPopup && (
          <SizePopup
            selectedRowData={selectedRowData}
            {...props}
            onCancel={() => setShowSizeLevelPopup(false)}
          ></SizePopup>
        )}
        <AgGridComponent
          key={isTreeDataEnabled ? "tree" : "flat"}
          tableHeader={"Details"}
          columns={storeCapacityTableColumns}
          rowdata={storeCapacityData}
          selectAllHeaderComponent={false}
          onBlur={onBlur}
          suppressFieldDotNotation
          loadTableInstance={loadUserTableInstance}
          uniqueRowId={"index"}
          treeData={isTreeDataEnabled}
          getDataPath={isTreeDataEnabled ? (data) => data.path : undefined}
          autoGroupColumnDef={
            isTreeDataEnabled ? autoGroupColumnDef : undefined
          }
          topRightOptions={
            props.finalizeAllocationConfig?.enableSmartFilter
              ? [
                  <AiSmartFilterButton
                    key="ai-smart-filter-btn"
                    columns={storeCapacityTableColumns}
                    allocationCode={props.allocationCode}
                    onFilterApplied={applyStoreCapacitySmartFilter}
                    onResetFilter={resetStoreCapacitySmartFilter}
                    screenName={AI_SMART_FILTER_CNA_STORE_CAPACITY.screenName}
                    tableId={AI_SMART_FILTER_CNA_STORE_CAPACITY.tableId}
                    hideSuggestions
                    isStoreCapacityTable
                    onClearColumnFilter={applyAiSmartFilterToColumn}
                  />,
                ]
              : null
          }
        />
        {/* <Grid
          container
          direction="row"
          justifyContent="center"
          alignItems="center"
          className={globalClasses.marginAround}
        >
          <Button
            variant="contained"
            color="primary"
            id="productSetAllBtn"
            className={classes.button}
            onClick={() => handleStoreCapacityChanges()}
          >
            Save
          </Button>
        </Grid> */}
      </Paper>
    </LoadingOverlay>
  );
};

const mapStateToProps = (store) => {
  return {
    storeCapacitySummaryLoader:
      store.inventorysmartReducer.inventorySmartFinalizeStoreCapacityService
        .storeCapacitySummaryLoader,
    storeCapactiyEditLoader:
      store.inventorysmartReducer.inventorySmartFinalizeStoreCapacityService
        .storeCapactiyEditLoader,
    planType:
      store.inventorysmartReducer.inventorySmartFinalizeStoreCapacityService
        .planType,
    allocationCode:
      store.inventorysmartReducer.inventorySmartFinalizeStoreViewService
        .allocationCode,
    originalAllocationCode:
      store.inventorysmartReducer.inventorySmartFinalizeStoreViewService
        .originalAllocationCode,
    articles:
      store.inventorysmartReducer.inventorySmartFinalizeStoreViewService
        .articles,
    isV3:
      store?.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.isV3,
    inventorysmartScreenConfig:
      store?.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig,
    finalizeAllocationConfig:
      store?.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartFinalizeAllocationConfig,
  };
};

const mapDispatchToProps = (dispatch) => ({
  setStoreCapactiySummaryLoader: (payload) =>
    dispatch(setStoreCapactiySummaryLoader(payload)),
  setStoreCapactiyEditLoader: (payload) =>
    dispatch(setStoreCapactiyEditLoader(payload)),
  getStoreCapacityTableData: (payload, isV3) =>
    dispatch(getStoreCapacityTableData(payload, isV3)),
  updateStoreCapacityTableData: (payload, isV3) =>
    dispatch(updateStoreCapacityTableData(payload, isV3)),
  setOriginalAllocationCode: (payload) =>
    dispatch(setOriginalAllocationCode(payload)),
  setAllocationCode: (payload) => dispatch(setAllocationCode(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps)(StoreCapacity);
