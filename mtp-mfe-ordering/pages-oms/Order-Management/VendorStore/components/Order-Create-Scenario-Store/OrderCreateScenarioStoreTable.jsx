import { useState, useEffect, useRef } from "react";
import globalStyles from "core/Styles/globalStyles";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import { connect } from "react-redux";
import {
  setOrderCreateScenarioTableConfigLoader,
  getOmsSkuSummaryTableData,
  setOrderManagementSkuSummaryTableLoader,
} from "modules/oms/services-oms/Order-Management/order-management-service";
import { getOmsCreateScenarioStoreTableConfig } from "modules/oms/services-oms/Order-Management/order-management-vendor-to-store-service";
import { addSnack, closeSnack } from "core/actions/snackbarActions";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import Loader from "core/Utils/Loader/loader";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import { Grid, Typography } from "@mui/material";
import { Button, Tooltip } from "impact-ui-v3";
import {
  defaultTableData,
  ERROR_MESSAGE,
  OMS_SERVICE_LEVEL_VALIDATION_ERROR,
} from "modules/oms/constants-oms/stringConstants";
import UpdateIcon from "@mui/icons-material/Update";
import AgGridComponent from "core/Utils/agGrid";
import OrderStoreSetAllModal from "./OrderStoreSetAllModal";
import { getCreateScenarioSafetyStockTableDataStore } from "modules/oms/services-oms/Order-Management/order-management-vendor-to-store-service";
import { cloneDeep, remove, some, uniq, isEmpty } from "lodash";

const DEFAULT_SAFETY_STOCK_METHODS = [
  { field: "stock_units", value: "User Input" },
  { field: "service_level_pct", value: "Service Level" },
];

const OrderCreateScenarioStoreTable = (props) => {
  const globalClasses = globalStyles();
  const classes = useStyles();
  const completeFilters = props.completeFilters;

  const [selectedSku, setSelectedSku] = useState([]);
  const [skuTableData, setSkuTableData] = useState([]);
  const [tableRowCount, setTableRowCount] = useState();
  const [tableColumns, setTableColumns] = useState([]);
  const [openPopUp, setOpenPopUp] = useState(false);
  const [isUpdateButtonHidden, setIsUpdateButtonHidden] = useState(true);
  const [editsDetected, setEditsDetected] = useState(false);
  const editedPayloadRef = useRef({});
  const selectedRowsRef = useRef([]);
  const tableGridInstance = useRef(null);

  const UNIQUE_ROW_ID =
    props?.vendorToStoreScreenConfig?.create_scenario?.unique_key || "id";

  const PRIMARY_KEY_FROM_OMS = props?.primaryKeyFromOMS || "product_code";

  const TABLE_PRIMARY_KEY =
    props?.vendorToStoreScreenConfig?.create_scenario?.primary_key ||
    "product_code";

  const is_safety_stock_table_paginated =
    props?.vendorToStoreScreenConfig?.create_scenario
      ?.is_safety_stock_table_paginated || false;

  const hideSelectAllRecords =
    props?.vendorToStoreScreenConfig?.create_scenario
      ?.hide_select_all_records || true;

  const create_scenario_display_note =
    props?.vendorToStoreScreenConfig?.create_scenario?.display_note || false;

  const COLUMNS_TO_BE_DISABLED_BASED_ON_SAFETY_STOCK_METHOD = (
    props?.vendorToStoreScreenConfig?.create_scenario?.safety_stock
      ?.safety_stock_methods || DEFAULT_SAFETY_STOCK_METHODS
  )?.map((col) => col.field);

  const EDITABLE_COLUMNS_TO_SAFETY_STOCK_METHOD_MAPPING =
    props?.vendorToStoreScreenConfig?.create_scenario?.safety_stock
      ?.safety_stock_methods || DEFAULT_SAFETY_STOCK_METHODS;

  const SETALL_MAPPING =
    props?.vendorToStoreScreenConfig?.create_scenario?.safety_stock
      ?.setall_mapping || {};

  const SETALL_FORMDATA_FIELDS =
    props?.vendorToStoreScreenConfig?.create_scenario?.safety_stock
      ?.setall_formdata_fields || [];

  const SERVICE_LEVEL_MAX_VALUE = 99;
  const SERVICE_LEVEL_MIN_VALUE = 50;

  useEffect(() => {
    const fetchColumnData = async () => {
      try {
        props.setOrderCreateScenarioTableConfigLoader(true);
        let columns = await props.getOmsCreateScenarioStoreTableConfig();
        let formattedColumns = agGridColumnFormatter(
          columns?.data?.data,
          null,
          null,
          null,
          null,
          null,
          null,
          true
        );

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

        if (!is_safety_stock_table_paginated) {
          var values = [];
          props?.skuData?.forEach((e) => {
            values.push(e[PRIMARY_KEY_FROM_OMS]);
          });
          const uniqueData = uniq(values);
          const baseFilters = props?.filters || [
            {
              filter_type: "cascaded",
              attribute_name: PRIMARY_KEY_FROM_OMS,
              operator: "in",
              dimension: "Product",
              values: uniqueData,
            },
          ];
          let body = {
            filters: cloneDeep(baseFilters),
            is_recommended: props?.isRecommended,
            current_cycle_order: false,
            meta: {
              limit: {
                limit: -1,
                page: 1,
              },
            },
          };

          if (completeFilters) {
            body.filters = [...body.filters, ...completeFilters.filters];
          }

          setSkuTableData([]);
          let response = await props.getCreateScenarioSafetyStockTableDataStore(
            body
          );

          if (response.data.status) {
            let formatedData = agGridRowFormatter(response.data.data);
            setSkuTableData(formatedData);
          }
        }

        setTableColumns(l_columnsWithDisablekey);
        props.setOrderCreateScenarioTableConfigLoader(false);
      } catch (error) {
        console.log("error", error);
        props.setOrderCreateScenarioTableConfigLoader(false);
      }
    };
    fetchColumnData();
  }, []);

  const manualCallBack = async (manualbody, pageIndex, params) => {
    try {
      props.setOrderCreateScenarioTableConfigLoader(true);
      let SORT_TYPE = [
        {
          column: TABLE_PRIMARY_KEY,
          order: "asc",
        },
      ];
      let manualBodyObject = JSON.parse(JSON.stringify(manualbody));
      if (manualBodyObject.sort.length === 0) {
        manualBodyObject.sort = SORT_TYPE;
      }

      var values = [];
      props?.skuData?.forEach((e) => {
        values.push(e[PRIMARY_KEY_FROM_OMS]);
      });
      const uniqueData = uniq(values);
      const baseFilters = props?.filters || [
        {
          filter_type: "cascaded",
          attribute_name: PRIMARY_KEY_FROM_OMS,
          operator: "in",
          dimension: "Product",
          values: uniqueData,
        },
      ];
      let body = {
        filters: cloneDeep(baseFilters),
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

      if (completeFilters) {
        body.filters = [...body.filters, ...completeFilters.filters];
      }
      let response = await props.getCreateScenarioSafetyStockTableDataStore(
        body
      );
      if (response.data.status) {
        let formatedData = agGridRowFormatter(
          response.data.data,
          params?.api?.checkConfiguration,
          "id"
        );
        //Handle search scenario
        formatedData = formatedData.map((data) => {
          if (data[UNIQUE_ROW_ID] in editedPayloadRef.current) {
            data = editedPayloadRef.current[data[UNIQUE_ROW_ID]];
          }
          return data;
        });
        setTableRowCount(formatedData.length);
        props.setOrderCreateScenarioTableConfigLoader(false);
        return { data: formatedData, totalCount: response.data.total };
      } else {
        displaySnackMessages(ERROR_MESSAGE, "error");
        props.setOrderCreateScenarioTableConfigLoader(false);
        return defaultTableData;
      }
    } catch (error) {
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
    let selectedRows = [...selectedRowsRef.current];
    tableGridInstance.current.api.forEachNode((node) => {
      if (node.selected) {
        // Only add if the item with the same UNIQUE_ROW_ID doesn't already exist
        if (
          !some(selectedRows, { [UNIQUE_ROW_ID]: node.data[UNIQUE_ROW_ID] })
        ) {
          selectedRows.push(node.data);
        }
      } else if (
        !node.selected &&
        some(selectedRows, { [UNIQUE_ROW_ID]: node.data[UNIQUE_ROW_ID] })
      ) {
        remove(selectedRows, {
          [UNIQUE_ROW_ID]: node.data[UNIQUE_ROW_ID],
        });
      }
    });
    selectedRowsRef.current = selectedRows;
    setSelectedSku(selectedRows);
    props.setIsSimulateButtonDisabled(selectedRows.length === 0);
  };

  const setCellsToBeDisabled = (row, item) => {
    let selectedSafetyStock = Array.isArray(row.safety_stock_method)
      ? row.safety_stock_method[0].value
      : row.safety_stock_method;
    let fieldMappingForSelectedMethod = EDITABLE_COLUMNS_TO_SAFETY_STOCK_METHOD_MAPPING.find(
      (col) => col.value === selectedSafetyStock
    );
    let fieldMappingForCurrentItem = EDITABLE_COLUMNS_TO_SAFETY_STOCK_METHOD_MAPPING.find(
      (col) => col.field === item.accessor
    );
    if (
      fieldMappingForCurrentItem.value === selectedSafetyStock &&
      fieldMappingForSelectedMethod.field === item.accessor
    ) {
      return false;
    } else {
      return true;
    }
  };

  const handleSimulateButton = () => {
    var selectedEditData = [];
    let selections = cloneDeep(selectedSku);
    let hasEdits = false;

    selections.forEach((row) => {
      if (row[UNIQUE_ROW_ID] in editedPayloadRef.current) {
        const editedRow = editedPayloadRef.current[row[UNIQUE_ROW_ID]];
        editedRow.isEdited = true;
        hasEdits = true;
        selectedEditData.push(editedRow);
      } else {
        if (row.isEdited) {
          hasEdits = true;
        }
        selectedEditData.push(row);
      }
    });
    if (hasEdits && !editsDetected) {
      setEditsDetected(true);
    }
    if (
      hasEdits &&
      props.onEditsDetected &&
      typeof props.onEditsDetected === "function"
    ) {
      props.onEditsDetected(true);
    }

    props.simulateCreateScenario(selectedEditData);
    tableGridInstance.current.api.deselectAll();
  };

  const validateUserInputServiceLevel = (data, key = "service_level_pct") => {
    let validatedServiceLevel = parseInt(data[key]);
    let displayError = false;
    if (validatedServiceLevel < SERVICE_LEVEL_MIN_VALUE) {
      validatedServiceLevel = SERVICE_LEVEL_MIN_VALUE;
      displayError = true;
    }
    if (validatedServiceLevel > SERVICE_LEVEL_MAX_VALUE) {
      validatedServiceLevel = SERVICE_LEVEL_MAX_VALUE;
      displayError = true;
    }
    return [validatedServiceLevel, displayError];
  };

  const onBlur = (_e, data, column, isChanged) => {
    tableGridInstance.current.api.refreshCells({
      force: true,
      suppressFlash: false,
      columns: [...COLUMNS_TO_BE_DISABLED_BASED_ON_SAFETY_STOCK_METHOD],
    });
    if (column.colId === "service_level_pct") {
      let validatedServiceLevelData = validateUserInputServiceLevel(data);
      tableGridInstance.current.api.forEachNode((node) => {
        if (node.data[UNIQUE_ROW_ID] === data?.[UNIQUE_ROW_ID]) {
          node.data.isEdited = true;
          node.data.service_level_pct = validatedServiceLevelData[0];
        }
        if (validatedServiceLevelData[1]) {
          displaySnackMessages(OMS_SERVICE_LEVEL_VALIDATION_ERROR, "info");
        }
        tableGridInstance.current.api.refreshCells({
          force: true,
          suppressFlash: false,
          rowNodes: [node],
          columns: [column.colId],
        });
      });
    } else {
      tableGridInstance.current.api.forEachNode((node) => {
        if (node.data[UNIQUE_ROW_ID] === data?.[UNIQUE_ROW_ID]) {
          node.data.isEdited = true;
        }
      });
    }
    data.isEdited = true;
    editedPayloadRef.current[data[UNIQUE_ROW_ID]] = data;
    if (!editsDetected) {
      setEditsDetected(true);
    }
  };

  useEffect(() => {
    if (
      editsDetected &&
      props.onEditsDetected &&
      typeof props.onEditsDetected === "function"
    ) {
      props.onEditsDetected(true);
    }
  }, [editsDetected, props.onEditsDetected]);

  const getTopRightOptions = () => {
    let options = [];

    options.push(
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
    );

    if (selectedSku.length > 0) {
      options.push(
        <Button
          variant="tertiary"
          color="primary"
          id="productSetAllBtn"
          className={classes.button}
          onClick={openSetAllPopUp}
          disabled={selectedSku.length == 0 ? true : false}
        >
          Set All
        </Button>
      );
    }

    if (!isUpdateButtonHidden) {
      options.push(
        <Button variant="secondary" color="primary" className={classes.button}>
          Update
        </Button>
      );
    }

    return options;
  };

  const getTableHeaderWithNote = () => {
    if (create_scenario_display_note) {
      return (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "8px 0",
          }}
        >
          <span>Safety Stock</span>
          <Typography
            variant="body2"
            component="span"
            sx={{
              color: "text.secondary",
              fontStyle: "italic",
              fontSize: "12px",
            }}
          >
            (Note: If the selected product is recommended in packs, please
            ensure all sizes under that product are selected.)
          </Typography>
        </div>
      );
    } else {
      return "Safety Stock";
    }
  };

  const onCellValueChanged = (params) => {
    if (params.data) {
      params.data.isEdited = true;

      editedPayloadRef.current[params.data[UNIQUE_ROW_ID]] = params.data;

      tableGridInstance.current.api.refreshCells({
        force: true,
        suppressFlash: false,
        rowNodes: [params.node],
        columns: [params.column.colId],
      });

      if (!editsDetected) {
        setEditsDetected(true);
        if (
          props.onEditsDetected &&
          typeof props.onEditsDetected === "function"
        ) {
          props.onEditsDetected(true);
        }
      }
    }
  };

  return (
    <div>
      <Loader
        loader={props.orderCreateScenarioTableConfigLoader}
        minHeight={"260px"}
      >
        {is_safety_stock_table_paginated ? (
          <AgGridComponent
            columns={tableColumns}
            selectAllHeaderComponent={true}
            hideSelectedAllRecords={hideSelectAllRecords}
            uniqueRowId={UNIQUE_ROW_ID}
            onSelectionChanged={onSelectionChanged}
            loadTableInstance={loadTableInstance}
            onBlur={onBlur}
            onCellValueChanged={onCellValueChanged}
            sizeColumnsToFitFlag
            cacheBlockSize={10}
            pagination={
              props?.screenConfig?.create_scenario?.pagination || true
            }
            manualCallBack={(body, pageIndex, params) =>
              manualCallBack(body, pageIndex, params)
            }
            rowSelection="multiple"
            rowModelType="serverSide"
            serverSideStoreType="partial"
            onRowSelected
            totalCount={tableRowCount}
            tableHeader={getTableHeaderWithNote()}
            topRightOptions={getTopRightOptions()}
          />
        ) : (
          <AgGridComponent
            pagination={true}
            columns={tableColumns}
            rowdata={skuTableData}
            selectAllHeaderComponent={true}
            hideSelectAllRecords={false}
            uniqueRowId={UNIQUE_ROW_ID}
            onSelectionChanged={onSelectionChanged}
            loadTableInstance={loadTableInstance}
            onBlur={onBlur}
            onCellValueChanged={onCellValueChanged}
            sizeColumnsToFitFlag
            tableHeader={getTableHeaderWithNote()}
            topRightOptions={getTopRightOptions()}
          />
        )}
      </Loader>
      <Grid
        container
        direction="row"
        justifyContent="center"
        alignItems="center"
        className={globalClasses.marginAround}
      ></Grid>

      {openPopUp && (
        <OrderStoreSetAllModal
          setShowSetAllModal={setOpenPopUp}
          rowsData={selectedSku}
          //setAll={updateSetAllData}
          agGridInstance={tableGridInstance.current}
          displaySnackMessages={displaySnackMessages}
          uniqueRowId={UNIQUE_ROW_ID}
          SETALL_MAPPING={SETALL_MAPPING}
          SETALL_FORMDATA_FIELDS={SETALL_FORMDATA_FIELDS}
          EDITABLE_COLUMNS_TO_SAFETY_STOCK_METHOD_MAPPING={
            EDITABLE_COLUMNS_TO_SAFETY_STOCK_METHOD_MAPPING
          }
          editedPayloadRef={editedPayloadRef}
          validateUserInputServiceLevel={validateUserInputServiceLevel}
        />
      )}
    </div>
  );
};

const mapStateToProps = (store) => {
  return {
    screenConfig: store.omsReducer.orderingCommonService.orderingScreensConfig,
    userAccess:
      store.omsReducer.orderingCommonService.orderingUserAccess?.vendor_store,
    orderCreateScenarioTableConfigLoader:
      store.omsReducer.orderManagementService
        .orderCreateScenarioTableConfigLoader,
    orderManagementSkuSummaryTableLoader:
      store.omsReducer.orderManagementService
        .orderManagementSkuSummaryTableLoader,
  };
};

const mapDispatchToProps = (dispatch) => ({
  getOmsCreateScenarioStoreTableConfig: (payload) =>
    dispatch(getOmsCreateScenarioStoreTableConfig(payload)),
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
  getCreateScenarioSafetyStockTableDataStore: (payload) =>
    dispatch(getCreateScenarioSafetyStockTableDataStore(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(OrderCreateScenarioStoreTable);
