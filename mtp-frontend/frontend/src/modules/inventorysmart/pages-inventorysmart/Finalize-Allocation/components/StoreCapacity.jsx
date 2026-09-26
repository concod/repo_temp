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
  NO_UPDATE,
  UPDATED_MESSAGE,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { getIgnoreAllocationCode } from "../../Create-Allocation/helperFunctions";
import {
  setAllocationCode,
  setOriginalAllocationCode,
} from "modules/inventorysmart/services-inventorysmart/Finalize/store-view-services";
import SizePopup from "./StoreCapacityPopup";

import styles from "../index.module.scss";

const StoreCapacity = function (props) {
  const globalClasses = globalStyles();

  const agGridUserInstance = useRef(null);
  const [showSizeLevelPopup, setShowSizeLevelPopup] = useState(false);

  const [storeCapacityData, setStoreCapacityData] = useState([]);
  const [storeCapacityTableColumns, setStoreCapacityColumns] = useState([]);
  const [selectedRowData, setSelectedRowData] = useState([]);
  const [allocatedQuantities, setAllocatedQuantities] = useState({});
  const [cartonFactors, setCartonFactors] = useState({});

  const { highlightCapacityBreachFlag, capacityColumnsToBeHighlighted } =
    props.inventorysmartScreenConfig?.finalize?.storeCapacityBreach || {};

  const autoGroupColumnDef = useMemo(() => {
    return {
      headerValueGetter: (params) => `${params.colDef.headerName}`,
      minWidth: 220,
    };
  }, []);

  useEffect(() => {
    const newAllocatedQuantites = {};
    const newCartonFactors = {};

    storeCapacityData.forEach((rowData) => {
      const {retail_facility_code, article, allocated_qty, carton_factor } = rowData;

      if(!newAllocatedQuantites[retail_facility_code]){
        newAllocatedQuantites[retail_facility_code] = {};
      }

      newAllocatedQuantites[retail_facility_code][article] = allocated_qty;

      if(!newCartonFactors[retail_facility_code]){
        newCartonFactors[retail_facility_code] = {};
      }

      newCartonFactors[retail_facility_code][article] = carton_factor;
    });

    setAllocatedQuantities(newAllocatedQuantites);
    setCartonFactors(newCartonFactors);
  }, [storeCapacityData]);

  const getGroupedColumnConfig = (columnConfig) => {
    let l_groupedColumn = props.inventorysmartScreenConfig?.finalize
      ?.storeCapacityBreach?.grouped_columns
      ? props.inventorysmartScreenConfig.finalize.storeCapacityBreach
          .grouped_columns
      : FINALIZE_STORE_CAPACITY_GROUPED_COLUMN_NAMES;
    const groupedColumnConfigs = columnConfig.map((config) => {
      if (l_groupedColumn.indexOf(config.column_name) !== -1) {
        config.rowGroup = true;
        config.hide = true;
      }
      return config;
    });

    return groupedColumnConfigs;
  };
  const storePopupClick = (params) => {
    setSelectedRowData(params.cellData.data);
    setShowSizeLevelPopup(true);
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
        let config = getGroupedColumnConfig(response?.data?.data?.table_config);
        let formattedData = response?.data?.data?.table_data.map(
          (item, index) => {
            item.index = index;
            return item;
          }
        );

        // Highlight capacity column cells with breach
        if (highlightCapacityBreachFlag) {
          config.forEach((colDef) => {
            if (capacityColumnsToBeHighlighted.includes(colDef.column_name)) {
              colDef.cellClass = (params) => {
                if (params.value < 0) {
                  return styles["yellow-highlight"];
                }
              };
            } else {
              colDef.sub_headers.forEach(childColDef => {
                if (capacityColumnsToBeHighlighted.includes(childColDef.column_name)) {
                  childColDef.cellClass = (params) => {
                    if (params.value < 0) {
                      return styles["yellow-highlight"];
                    }
                  };
                }
              });
            }
          });
        }

        let formattedColumns = agGridColumnFormatter(config, null);
        formattedColumns = formattedColumns.map((item) => {
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
          return item;
        });
        setStoreCapacityColumns(formattedColumns);
        setStoreCapacityData(formattedData);
      } catch (err) {
        displaySnackMessages(ERROR_MESSAGE, "error");
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
      displaySnackMessages(ERROR_MESSAGE, "error");
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
            allocatedQuantities={allocatedQuantities[selectedRowData.retail_facility_code]}
            cartonFactors={cartonFactors[selectedRowData.retail_facility_code]}
            {...props}
            onCancel={() => setShowSizeLevelPopup(false)}
          ></SizePopup>
        )}
        <AgGridComponent
          columns={storeCapacityTableColumns}
          rowdata={storeCapacityData}
          selectAllHeaderComponent={false}
          // rowSelection="multiple"
          autoGroupColumnDef={autoGroupColumnDef}
          onBlur={onBlur}
          groupDisplayType={"multipleColumns"}
          suppressFieldDotNotation
          loadTableInstance={loadUserTableInstance}
          uniqueRowId={"index"}
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
