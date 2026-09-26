import React, { useEffect, useState, useRef } from "react";
import { getColumnsAg } from "core/actions/tableColumnActions";
import { connect } from "react-redux";
import Loader from "core/Utils/Loader/loader";
import AgGridComponent from "core/Utils/agGrid";
import { addSnack } from "core/actions/snackbarActions";
import {
  getProductStoreLevelCapacityData,
  getStoreLevelCapacityData,
} from "modules/inventorysmart/services-inventorysmart/Finalize/store-capacity-service";

import { getIgnoreAllocationCode } from "../../Create-Allocation/helperFunctions";
import {
  setAllocationCode,
  setOriginalAllocationCode,
} from "modules/inventorysmart/services-inventorysmart/Finalize/store-view-services";
import { useStyles } from "modules/inventorysmart/styles/inventorySmartUseStyles";
import globalStyles from "core/Styles/globalStyles";
import { Button, Grid, Paper, Typography } from "@mui/material";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import SizePopup from "./StoreCapacityPopup";
import { ERROR_MESSAGE } from "modules/inventorysmart/constants-inventorysmart/stringConstants";

const ProductStoreLevelCapacity = (props) => {
  const [productLevelColumn, setProductLevelColumn] = useState([]);
  const [productLevelLoader, setProductLevelLoader] = useState(true);
  const globalClasses = globalStyles();
  const classes = useStyles();
  const [productLevelData, setProductLevelData] = useState([]);
  const tableRef = useRef(null);
  const [showSizeLevelPopup, setShowSizeLevelPopup] = useState(false);
  const [selectedRowData, setSelectedRowData] = useState([]);

  const loadTableInstance = (params) => {
    tableRef.current = params;
  };
  const storePopupClick = (params) => {
    setSelectedRowData(params?.cellData?.data);
    setShowSizeLevelPopup(true);
  };
  useEffect(() => {
    setProductLevelLoader(true);
    const fetchCols = async () => {
      let storeCols = await props.getColumnsAg(
        "table_name=capacity_breach_product_table"
      );

      // setProductLevelColumn(storeCols);
      let formattedColumns = storeCols;
      formattedColumns = formattedColumns.map((item) => {
        item.aggregate_type = null;
        item.footer = null;
        item.formatter = null;

        if (item.column_name === "current_allocation") {
          item.onClick = storePopupClick;
          item.is_editable = props.scenarioId ? false : true;
        }
        return item;
      });
      formattedColumns = agGridColumnFormatter(formattedColumns);
      setProductLevelColumn(formattedColumns);
    };
    fetchCols();
  }, []);

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };
  const fetchTableConfigandData = async () => {
    setProductLevelLoader(true);
    try {
      let allocation_code = props.scenarioId
        ? props.allocation_code
        : props.allocationCode;
      let body = {
        allocation_code:
          props.tabValue === 2 ? props.scenarioId : allocation_code,
        ignore_allocation_code: getIgnoreAllocationCode(
          props.originalAllocationCode,
          allocation_code
        ),
        store_code: props.store,
        plan_type: props.tabValue === 2 ? "Default" : props.planType,
      };

      let { data: response } = await props.getProductStoreLevelCapacityData(
        body
      );

      setProductLevelData(response?.data);
    } catch (e) {
      const errObj = e?.response?.data;
      if (errObj?.show_message) displaySnackMessages(errObj?.message, "error");
      else displaySnackMessages(ERROR_MESSAGE, "error");
    } finally {
      setProductLevelLoader(false);
    }
  };
  useEffect(() => {
    if (
      (props.allocationCode || props.allocation_code || props.scenarioId) &&
      props.store
    ) {
      fetchTableConfigandData();
    }
  }, [props.store, props.allocationCode, props.tabValue]);

  const cancelRequest = () => {
    // fetchTableConfigandData();
    setShowSizeLevelPopup(false);
  };
  return (
    <div>
      <Loader loader={productLevelLoader}>
        <AgGridComponent
          columns={productLevelColumn}
          rowdata={productLevelData}
          tableHeader={"Product Level"}
          loadTableInstance={loadTableInstance} // to make use of available grid api's
          uniqueRowId={"pack_type_id"}
          closeButton={true}
          sizeColumnsToFitFlag={true}
          handleCloseButtonClick={() => {
            props.setShowProductlevelData(false);
          }}
          // suppressFieldDotNotation
        />
        {showSizeLevelPopup && (
          <SizePopup
            selectedRowData={selectedRowData}
            {...props}
            onCancel={cancelRequest}
          ></SizePopup>
        )}
        {props.isStoreBand && props.planStatus !== "Finalized" && (
          <Grid
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
              onClick={() => saveHandler()}
            >
              Save Grid Edit
            </Button>
          </Grid>
        )}
      </Loader>
    </div>
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

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ProductStoreLevelCapacity);
