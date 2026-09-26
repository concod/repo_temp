import React, { useEffect, useState, useRef } from "react";
import { getColumnsAg } from "core/actions/tableColumnActions";
import { connect } from "react-redux";
import globalStyles from "core/Styles/globalStyles";
import Loader from "core/Utils/Loader/loader";
import AgGridComponent from "core/Utils/agGrid";
import {
  getProductStoreLevelCapacityData,
  getStoreLevelCapacityData,
} from "modules/inventorysmart/services-inventorysmart/Finalize/store-capacity-service";
import { getIgnoreAllocationCode } from "../../Create-Allocation/helperFunctions";
import {
  setAllocationCode,
  setOriginalAllocationCode,
} from "modules/inventorysmart/services-inventorysmart/Finalize/store-view-services";
import ProductLevelTable from "./ProductLevelStoreCapacity";
import { Paper, Typography } from "@mui/material";
import { useStyles } from "modules/inventorysmart/styles/inventorySmartUseStyles";
import { addSnack } from "core/actions/snackbarActions";
import { ERROR_MESSAGE } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { ButtonGroup } from "impact-ui-v3";

const StoreLevelCapacity = (props) => {
  const [storeLevelColumn, setStoreLevelColumn] = useState([]);
  const [storeLevelLoader, setStoreLevelLoader] = useState(true);
  const [showProductlevelData, setShowProductlevelData] = useState(false);
  const [selectedStore, setSelectedStore] = useState("");
  const globalClasses = globalStyles();
  const classes = useStyles();
  const [storeLevelData, setStoreLevelData] = useState([]);
  const TableRef = useRef(null);
  const [tabValue, setTabValue] = useState(1);
  const loadTableInstance = (params) => {
    TableRef.current = params;
  };
  const storePopupClick = (params) => {
    setSelectedStore(params?.cellData?.data?.store_code);
    setShowProductlevelData(true);
  };
  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };
  useEffect(() => {
    const fetchTableConfigandData = async () => {
      setStoreLevelLoader(true);
      try {
        let storeCols = await props.getColumnsAg(
          "table_name=capacity_breach_store_table"
        );
        storeCols.forEach((element) => {
          if (element.column_name === "store_code") {
            element.is_editable = true;
            element.onClick = storePopupClick;
          }
        });
        let allocation_code = props.scenarioId
          ? props.allocation_code
          : props.allocationCode;
        if (props.allocationCode || props.scenarioId) {
          let body = {
            allocation_code:
              tabValue === 2 ? props.scenarioId : allocation_code,
            article: props.articles,
            ignore_allocation_code: getIgnoreAllocationCode(
              props.originalAllocationCode,
              allocation_code
            ),
            plan_type: tabValue === 2 ? "Default" : props.planType,
          };
          let { data: response } = await props.getStoreLevelCapacityData(body);
          setStoreLevelData(response?.data);
        }
        setStoreLevelColumn(storeCols);
      } catch (e) {
        const errObj = e?.response?.data;
        if (errObj?.show_message)
          displaySnackMessages(errObj?.message, "error");
        else displaySnackMessages(ERROR_MESSAGE, "error");
      } finally {
        setStoreLevelLoader(false);
      }
    };
    fetchTableConfigandData();
  }, [props.allocationCode, tabValue]);

  const onTabChangeHandler = (_event, newValue) => {
    setTabValue(newValue);
    setShowProductlevelData(false);
  };
  const getCenterOptions = () => {
    let options = [];
    if (props.scenarioId) {
      options.push(
        <ButtonGroup
          onChange={onTabChangeHandler}
          options={[
            {
              label: "Original",
              value: 1,
              id: "original",
            },
            {
              label: "Scenario",
              value: 2,
              id: "scenario",
            },
          ]}
          selectedOption={tabValue}
        />
      );
    }

    return options;
  };

  return (
    <Loader loader={storeLevelLoader}>
      <AgGridComponent
        tableHeader={"Details"}
        topCenterOptions={getCenterOptions()}
        columns={storeLevelColumn}
        rowdata={
          props.uniqueColCombinationForStoreCapacityTable
            ? storeLevelData.map(row => ({
                ...row,
                composite_key: `${row.store_code}_${row.range_name}_${row.l1_name}`
              }))
            : storeLevelData
        }
        loadTableInstance={loadTableInstance} // to make use of available grid api's
        uniqueRowId={
          props.uniqueColCombinationForStoreCapacityTable
            ? "composite_key"
            : "store_code"
        }
        suppressFieldDotNotation
        nestedTable={showProductlevelData}
        nestedTableComponent={
          <div className={classes.marginTop}>
            <ProductLevelTable
              store={selectedStore}
              tabValue={tabValue}
              setShowProductlevelData={setShowProductlevelData}
              {...props}
            />
          </div>
        }
        sizeColumnsToFitFlag={true}
      />
    </Loader>
  );
};
const mapStateToProps = (store) => {
  return {
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
    uniqueColCombinationForStoreCapacityTable:
      store?.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartFinalizeAllocationConfig
        ?.uniqueColCombinationForStoreCapacityTable,
  };
};

const mapDispatchToProps = (dispatch) => ({
  getColumnsAg: (payload) => dispatch(getColumnsAg(payload)),
  getStoreLevelCapacityData: (payload) =>
    dispatch(getStoreLevelCapacityData(payload)),
  getProductStoreLevelCapacityData: (payload) =>
    dispatch(getProductStoreLevelCapacityData(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps)(StoreLevelCapacity);
