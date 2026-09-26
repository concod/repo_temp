import { useState, useEffect, useRef } from "react";
import globalStyles from "core/Styles/globalStyles";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import { connect } from "react-redux";
import {
  setOrderCreateScenarioTableConfigLoader,
  getOmsCreateScenarioTableConfig,
  getOmsSkuSummaryTableData,
  setOrderManagementSkuSummaryTableLoader,
} from "modules/inventorysmart/services-inventorysmart/Order-Management/order-management-service";
import { addSnack, closeSnack } from "core/actions/snackbarActions";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import Loader from "core/Utils/Loader/loader";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import { Button, Grid, Tooltip, Typography } from "@mui/material";
import {
  defaultTableData,
  ERROR_MESSAGE,
  OMS_SERVICE_LEVEL_VALIDATION_ERROR,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import UpdateIcon from "@mui/icons-material/Update";
import AgGridComponent from "core/Utils/agGrid";
import OrderSetAllModal from "./OrderSetAllModal";
import { getConstraintsSafetyStockTableData } from "modules/inventorysmart/services-inventorysmart/Constraints/constraints-services";

const COLUMNS_TO_BE_DISABLED_BASED_ON_SAFETY_STOCK_METHOD = [
  "stock_units",
  "service_level_pct",
];

const OrderCreateScenarioTable = function (props) {
  const globalClasses = globalStyles();
  const classes = useStyles();

  const [selectedSku, setSelectedSku] = useState([]);
  const [skuTableData, setSkuTableData] = useState([]);
  const [tableRowCount, setTableRowCount] = useState();
  const [tableColumns, setTableColumns] = useState([]);
  const [openPopUp, setOpenPopUp] = useState(false);
  const [ishide, setIsHide] = useState(false);
  const [editSetAllData, setEditSetAllData] = useState([]);
  const tableGridInstance = useRef(null);
  var safetyStockEditPayload = useRef([]);

  useEffect(() => {
    const fetchColumnData = async () => {
      props.setOrderCreateScenarioTableConfigLoader(true);
      let columns = await props.getOmsCreateScenarioTableConfig();
      props.setOrderCreateScenarioTableConfigLoader(false);
      let formattedColumns = agGridColumnFormatter(columns?.data?.data);
      let l_columnsWithDisablekey = formattedColumns.map((obj) => {
        if (
          COLUMNS_TO_BE_DISABLED_BASED_ON_SAFETY_STOCK_METHOD.includes(
            obj.column_name
          )
        ) {
          obj.disabled = setCellsToBeDisabled;
        }
        return obj;
      });
      var values = [];
      props?.skuData?.forEach((e) => {
        values.push(e.product_code);
      });
      const uniqueData = values.filter(
        (element, index) => values.indexOf(element) === index
      );
      let body = {
        filters: [
          {
            filter_type: "cascaded",
            attribute_name: "product_code",
            operator: "in",
            dimension: "Product",
            values: uniqueData,
          },
        ],
        is_recommended: props?.isRecommended,
        current_cycle_order: false,
        meta: {},
      };
      setSkuTableData([]);
      let response = await props.getConstraintsSafetyStockTableData(body); //props.getOmsSkuSummaryTableData(body);

      if (response.data.status) {
        let formatedData = agGridRowFormatter(
          response.data.data
          // params?.api?.checkConfiguration,
          // "plan_code"
        );
        setSkuTableData(formatedData);
      }
      setTableColumns(l_columnsWithDisablekey);
      props.setOrderCreateScenarioTableConfigLoader(false);
    };
    fetchColumnData();
  }, []);

  const manualCallBack = async (manualbody, pageIndex, params) => {
    try {
      props.setOrderManagementSkuSummaryTableLoader(true);
      let SORT_TYPE = [
        {
          column: "product_code",
          order: "asc",
        },
      ];
      let manualBodyObject = JSON.parse(JSON.stringify(manualbody));
      if (manualBodyObject.sort.length === 0) {
        manualBodyObject.sort = SORT_TYPE;
      }

      var values = [];
      props?.skuData?.forEach((e) => {
        values.push(e.product_code);
      });
      let body = {
        filters: [
          {
            filter_type: "cascaded",
            attribute_name: "product_code",
            operator: "in",
            dimension: "Product",
            values: values,
          },
        ],
        meta: manualbody
          ? {
              ...manualBodyObject,
              limit: { limit: 10, page: pageIndex + 1 },
            }
          : {
              search: [],
              sort: SORT_TYPE,
              range: [],
              limit: { limit: 10, page: Number(pageIndex) ? pageIndex + 1 : 1 },
            },
      };

      let response = await props.getOmsSkuSummaryTableData(body);

      if (response.data.status) {
        let formatedData = agGridRowFormatter(
          response.data.data,
          params?.api?.checkConfiguration,
          "plan_code"
        );
        setTableRowCount(formatedData.length);
        formatedData.forEach((val) => {
          val.order_quantity_copy = val.order_quantity;
        });
        props.setOrderManagementSkuSummaryTableLoader(false);
        return { data: formatedData, totalCount: response.data.total };
      } else {
        displaySnackMessages(ERROR_MESSAGE, "error");
        props.setOrderManagementSkuSummaryTableLoader(false);
        return defaultTableData;
      }
    } catch {
      displaySnackMessages(ERROR_MESSAGE, "error");
      props.setOrderManagementSkuSummaryTableLoader(false);
      return defaultTableData;
    }
  };

  const displaySnackMessages = (message, variance) => {
    props.closeSnack();
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const openSetAllPopUp = () => {
    setOpenPopUp(true);
  };

  const loadTableInstance = (params) => {
    tableGridInstance.current = params;
  };

  const onSelectionChanged = (event) => {
    let selectedRows = [];
    tableGridInstance.current.api.forEachNode((node) => {
      node.selected && selectedRows.push({ ...node.data });
    });
    setSelectedSku(selectedRows);
  };

  const setCellsToBeDisabled = (row, item) => {
    let l_safetyStockType = Array.isArray(row.safety_stock_method)
      ? row.safety_stock_method[0].value
      : row.safety_stock_method;
    if (["stock_units", "service_level_pct"].includes(item.accessor)) {
      if (item.accessor == "stock_units")
        return l_safetyStockType !== "User Input" ? true : false;
      if (item.accessor == "service_level_pct")
        return l_safetyStockType !== "Service Level" ? true : false;
    }
  };

  const handleSimulateButton = () => {
    var selectedEditData = [];
    let selectedData = tableGridInstance.current.api.getSelectedNodes();
    let selections = selectedData?.filter((val) => val.displayed);
    selections.forEach((row) => {
      selectedEditData.push(row.data);
    });
    props.simulateCreateScenario(selectedEditData);
    tableGridInstance.current.api.deselectAll();
  };

  const onBlur = (_e, data, column, isChanged) => {
    tableGridInstance.current.api.refreshCells({
      force: true,
      suppressFlash: false,
      columns: ["stock_units", "service_level_pct"],
    });
    if (data.service_level_pct < 50) {
      tableGridInstance.current.api.forEachNode((node) => {
        if (node.data.product_code === data?.product_code) {
          node.data.service_level_pct = 50;
        }
        displaySnackMessages(OMS_SERVICE_LEVEL_VALIDATION_ERROR, "info");
        tableGridInstance.current.api.refreshCells({
          force: true,
          suppressFlash: false,
          rowNodes: [node],
          columns: ["service_level_pct"],
        });
      });
    }
    if (data.service_level_pct > 99) {
      tableGridInstance.current.api.forEachNode((node) => {
        if (node.data.product_code === data?.product_code) {
          node.data.service_level_pct = 99;
        }
        displaySnackMessages(OMS_SERVICE_LEVEL_VALIDATION_ERROR, "info");
        tableGridInstance.current.api.refreshCells({
          force: true,
          suppressFlash: false,
          rowNodes: [node],
          columns: ["service_level_pct"],
        });
      });
    }
  };

  return (
    <div>
      <Grid
        container
        className={globalClasses.marginVertical1rem}
        justifyContent={"space-between"}
      >
        <Grid container alignItems={"center"} item xs={3}>
          <Typography variant="h6">Safety Stock</Typography>
        </Grid>
        <Grid item xs={6} container justifyContent={"flex-end"}>
          <Button
            variant="outlined"
            color="primary"
            id="productSetAllBtn"
            className={classes.button}
            onClick={openSetAllPopUp}
            disabled={selectedSku.length == 0 ? true : false}
          >
            Set All
          </Button>
          {ishide && (
            <Tooltip title="Update">
              <Button
                variant="contained"
                color="primary"
                id="createProductBtn"
                className={classes.button}
              >
                <UpdateIcon fontSize="small"></UpdateIcon>
              </Button>
            </Tooltip>
          )}
        </Grid>
      </Grid>
      <Loader
        loader={
          props.orderCreateScenarioTableConfigLoader || skuTableData.length == 0
        }
        minHeight={"260px"}
      >
        <AgGridComponent
          sideBar={false}
          pagination={false}
          columns={tableColumns}
          rowdata={skuTableData}
          selectAllHeaderComponent={true}
          hideSelectAllRecords={true}
          uniqueRowId={"id"}
          onSelectionChanged={onSelectionChanged}
          loadTableInstance={loadTableInstance}
          onBlur={onBlur}
          sizeColumnsToFitFlag
        />
      </Loader>
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
          disabled={props.isScenarioApplied || selectedSku.length == 0}
          onClick={() => handleSimulateButton()}
        >
          Simulate
        </Button>
      </Grid>

      {openPopUp && (
        <OrderSetAllModal
          setShowSetAllModal={setOpenPopUp}
          rowsData={selectedSku}
          //setAll={updateSetAllData}
          agGridInstance={tableGridInstance.current}
          displaySnackMessages={displaySnackMessages}
        />
      )}
    </div>
  );
};

const mapStateToProps = (store) => {
  return {
    orderCreateScenarioTableConfigLoader:
      store.inventorysmartReducer.inventorySmartOrderManagementService
        .orderCreateScenarioTableConfigLoader,
    orderManagementSkuSummaryTableLoader:
      store.inventorysmartReducer.inventorySmartOrderManagementService
        .orderManagementSkuSummaryTableLoader,
  };
};

const mapDispatchToProps = (dispatch) => ({
  getOmsCreateScenarioTableConfig: (payload) =>
    dispatch(getOmsCreateScenarioTableConfig(payload)),
  getOmsSkuSummaryTableData: (payload) =>
    dispatch(getOmsSkuSummaryTableData(payload)),
  setOrderCreateScenarioTableConfigLoader: (payload) =>
    dispatch(setOrderCreateScenarioTableConfigLoader(payload)),
  setOrderManagementSkuSummaryTableLoader: (payload) =>
    dispatch(setOrderManagementSkuSummaryTableLoader(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  closeSnack: (payload) => dispatch(closeSnack(payload)),
  getConstraintsSafetyStockTableData: (payload) =>
    dispatch(getConstraintsSafetyStockTableData(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(OrderCreateScenarioTable);
