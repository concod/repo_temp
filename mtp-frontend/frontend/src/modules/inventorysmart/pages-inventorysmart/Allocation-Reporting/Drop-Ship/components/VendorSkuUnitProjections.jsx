import React, { useEffect, useState, useRef } from "react";
import { connect } from "react-redux";
import { addSnack, closeSnack } from "core/actions/snackbarActions";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import Loader from "core/Utils/Loader/loader";
import { setFormFilters } from "modules/inventorysmart/services-inventorysmart/Finalize/product-view-services";
import {
  setDropShipVendorSkuTableData,
  setDropShipVendorSkuTableDataLoader,
  setDropShipVendorSkuTableConfigLoader,
  getDropShipVendorSkuUnitTableData,
  setUpdateDropShipPredictionsSuccess,
  resetDropShipVendorSkuForecasts,
} from "modules/inventorysmart/services-inventorysmart/Allocation-Reports/drop-ship-service";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import {
  ERROR_MESSAGE,
  tableConfigurationMetaData,
  defaultTableData,
  OMS_EDITED_GRID_CELLS_BACKGROUND,
  OMS_EMPTY_ADJUSTED_PREDICTIONS,
  DIALOG_CONFIRM_BTN_TEXT,
  DIALOG_REJECT_BTN_TEXT,
  CONTINUE_MESSAGE,
  UPDATED_MESSAGE,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { isEmpty } from "lodash";
import { Typography } from "@mui/material";
import globalStyles from "core/Styles/globalStyles";
import { Prompt } from "impact-ui";

const REVERT_DIALOG_TITLE = "Revert Predictions";
const REVERT_DIALOG_DESCRIPTION =
  "Adjusted Predictions will be reverted to IA Predictions.";

const VendorSkuUnitProjections = (props) => {
  const globalClasses = globalStyles();

  const [tableColumns, setTableColumns] = useState([]);
  const [tableRowCountForUnits, setTableRowCountForUnits] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [renderAgGrid, setRenderAgGrid] = useState(false);
  const [emptyGrid, setEmptyGrid] = useState(false);
  const [selectedSetAllRows, setSelectedSetAllRows] = useState([]);
  const [selectedRowsIDs, setSelectedRowsIDs] = useState([]);
  const [checkAllSetAllRequest, setCheckAllSetAllRequest] = useState([]);

  const editedPredictions = useRef([]);
  const tableGridInstance = useRef(null);
  const loadTableInstance = (params) => {
    tableGridInstance.current = params;
  };

  useEffect(() => {
    if (!isEmpty(props.selectedFilters)) {
      setEmptyGrid(false);
      setRenderAgGrid(false);
    }
  }, [props.selectedFilters]);

  const displaySnackMessages = (message, variance) => {
    props.closeSnack();
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  useEffect(() => {
    if (!isLoaded) props.setDropShipVendorSkuTableConfigLoader(true);
    else props.setDropShipVendorSkuTableConfigLoader(false);
  }, [isLoaded]);

  const manualCallBack = async (manualbody, pageIndex, params) => {
    try {
      props.setDropShipVendorSkuTableDataLoader(true);

      let filterArray = [];
      if (props?.selectedFilters?.length > 0) {
        props.selectedFilters.forEach((filter) => {
          if (filter.dimension === "Product" && filter?.values?.length > 0) {
            filterArray.push(filter);
          }
        });
      }

      let body = {
        filters: filterArray,
        meta: manualbody
          ? {
              ...manualbody,
              limit: { limit: 10, page: pageIndex + 1 },
            }
          : {
              ...tableConfigurationMetaData.meta,
              limit: { limit: 10, page: Number(pageIndex) ? pageIndex + 1 : 1 },
            },
      };

      let response = await props.getDropShipVendorSkuUnitTableData(body);

      if (response.data.status) {
        let columns = response?.data?.data?.column;
        if (columns.length === 0) {
          setEmptyGrid(true);
          props.setIsSaveHidden(true);
          props.setDropShipVendorSkuTableDataLoader(false);
          return;
        }
        let formattedColumns = agGridColumnFormatter(columns, null);
        setTableColumns(formattedColumns);
        setEmptyGrid(false);
        props.setIsSaveHidden(false);

        let formatedData = agGridRowFormatter(
          response?.data?.data.data,
          params?.api?.checkConfiguration,
          "id"
        );
        setTableRowCountForUnits(formatedData.length);
        setIsLoaded(true);
        setRenderAgGrid(true);
        props.setDropShipVendorSkuTableDataLoader(false);
        props.setTotalCount(response.data?.total);
        return { data: formatedData, totalCount: response.data.total };
      } else {
        setIsLoaded(true);
        displaySnackMessages(ERROR_MESSAGE, "error");
        props.setDropShipVendorSkuTableDataLoader(false);
        return defaultTableData;
      }
    } catch {
      setIsLoaded(true);
      displaySnackMessages(ERROR_MESSAGE, "error");
      props.setDropShipVendorSkuTableDataLoader(false);
      return defaultTableData;
    }
  };

  const onCellValueChanged = (params) => {
    const { column, colDef, node, newValue, oldValue } = params;
    if (newValue === "") {
      displaySnackMessages(OMS_EMPTY_ADJUSTED_PREDICTIONS, "info");
    }
    if (oldValue !== newValue) {
      colDef.cellStyle = OMS_EDITED_GRID_CELLS_BACKGROUND;

      let columnField = colDef.field;
      let columnFiscalMonth = columnField.split("_")[0] + "_id";
      let columnId = node.data[columnFiscalMonth];
      let edited_predictions = [...editedPredictions.current];
      const index = edited_predictions.findIndex((cell) => {
        return cell.id === columnId;
      });
      if (index === -1) {
        let currentObject = {
          id: columnId,
          adjusted_predictions: newValue,
        };
        edited_predictions.push(currentObject);
      } else {
        edited_predictions[index].adjusted_predictions = newValue;
      }
      editedPredictions.current = [...edited_predictions];
      props.setValueForEditedPredictions(editedPredictions.current);
      params.api.refreshCells({
        force: true,
        suppressFlash: false,
        columns: [columnField],
        rowNodes: [node],
      });
    }
  };

  useEffect(() => {
    if (props.updateDropShipPredictionsSuccess) {
      props.setDropShipVendorSkuTableConfigLoader(true);
      tableGridInstance?.current?.api?.refreshServerSideStore({
        purge: true,
      });
      editedPredictions.current = [];
      props.setDropShipVendorSkuTableConfigLoader(false);
      props.setUpdateDropShipPredictionsSuccess(false);
    }
  }, [props.updateDropShipPredictionsSuccess]);

  useEffect(() => {
    if (!renderAgGrid) setRenderAgGrid(true);
  }, [props.selectedFilters, renderAgGrid]);

  const onSelectionChanged = (event) => {
    let selectedRows = [];
    tableGridInstance.current.api.forEachNode((node) => {
      node.selected && selectedRows.push({ ...node.data });
    });
    setSelectedSetAllRows(selectedRows);
    let selectedIds = [];
    selectedRows.forEach((row) => selectedIds.push(row.id));
    setSelectedRowsIDs(selectedIds);

    let l_selections = event.api.getSelectedRows().length;
    let l_buttonEnabled = tableGridInstance.current.api.buttonEnabled;
    if (l_selections) {
      !l_buttonEnabled && props.setIsRevertEnabled(true);
    } else {
      l_buttonEnabled && props.setIsRevertEnabled(false);
    }
  };

  useEffect(() => {
    if (!isEmpty(props.selectedFilters)) {
      props.setIsRevertEnabled(false);
      setCheckAllSetAllRequest([]);
    }
  }, [props.selectedFilters]);

  useEffect(() => {
    if (tableGridInstance?.current) {
      tableGridInstance.current.api.buttonEnabled = props.isRevertEnabled;
      tableGridInstance.current.api.checkAllSetAllRequest = checkAllSetAllRequest;
    }
  }, [checkAllSetAllRequest, props.isRevertEnabled]);

  const updateSetAllData = async () => {
    props.setDropShipVendorSkuTableConfigLoader(true);
    let l_checkAllSetAllRequest = {
      searchColumns: tableGridInstance.current.api.getFilterModel(),
    };
    if (
      tableGridInstance.current.api.checkConfiguration[
        tableGridInstance.current.api.checkConfiguration.length - 2
      ]
    ) {
      setCheckAllSetAllRequest((old) => {
        if (!isEmpty(old)) {
          return [...old, l_checkAllSetAllRequest];
        } else {
          return [l_checkAllSetAllRequest];
        }
      });
    }

    let isSelectAllRecordsChecked =
      tableGridInstance?.current?.api?.isSelectAllRecords;

    var selection = {
      data: tableGridInstance?.current?.api?.checkConfiguration,
      unique_columns: ["id"],
    };

    let body = {
      orders: isSelectAllRecordsChecked ? [] : selectedRowsIDs,
      filters: [...props.selectedFilters],
      meta: {
        sort: [],
        range: [],
      },
      selection,
      set_all: tableGridInstance?.current?.api?.checkAllSetAllRequest,
      isSelectAllRecords: isSelectAllRecordsChecked,
    };

    try {
      let response = await props.resetDropShipVendorSkuForecasts(body);
      if (response.data.status) {
        props.setDropShipVendorSkuTableConfigLoader(false);
        props?.setUpdateDropShipPredictionsSuccess(true);
        displaySnackMessages(UPDATED_MESSAGE, "success");
        return true;
      }
    } catch {
      displaySnackMessages(ERROR_MESSAGE, "error");
      return true;
    }
  };

  return (
    <>
      {emptyGrid ? (
        <div
          className={globalClasses.centerAlign}
          style={{ minHeight: "100px" }}
        >
          <Typography variant="h7" className={globalClasses.paperWrapper}>
            No data is present for the selected filters
          </Typography>
        </div>
      ) : (
        <>
          <Loader
            loader={
              props.dropShipVendorSkuTableDataLoader ||
              props.dropShipVendorSkuTableConfigLoader
            }
            minHeight={"260px"}
          >
            {renderAgGrid && (
              <div>
                <AgGridComponent
                  columns={tableColumns}
                  manualCallBack={(body, pageIndex, params) =>
                    manualCallBack(body, pageIndex, params)
                  }
                  totalCount={tableRowCountForUnits}
                  loadTableInstance={loadTableInstance}
                  pagination={true}
                  cacheBlockSize={10}
                  rowModelType="serverSide"
                  serverSideStoreType="partial"
                  uniqueRowId={"id"}
                  onCellValueChanged={onCellValueChanged}
                  selectAllHeaderComponent={true}
                  hideSelectAllRecords={false}
                  rowSelection="multiple"
                  onRowSelected
                  onSelectionChanged={onSelectionChanged}
                />
              </div>
            )}
          </Loader>

          <Prompt
            isOpen={props.showSetAllPopUp}
            title={REVERT_DIALOG_TITLE}
            subHeading={REVERT_DIALOG_DESCRIPTION}
            infoList={[CONTINUE_MESSAGE]}
            primaryButtonProps={{
              children: DIALOG_CONFIRM_BTN_TEXT,
              onClick: () => {
                updateSetAllData();
                props.setShowSetAllPopUp(false);
              },
            }}
            tertiaryButtonProps={{
              children: DIALOG_REJECT_BTN_TEXT,
              onClick: () => props.setShowSetAllPopUp(false),
            }}
          />
        </>
      )}
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    selectedFilters:
      store.inventorysmartReducer.inventorySmartDropShipService.selectedFilters,
    dropShipVendorSkuTableDataLoader:
      store.inventorysmartReducer.inventorySmartDropShipService
        .dropShipVendorTableDataLoader,
    dropShipVendorSkuTableConfigLoader:
      store.inventorysmartReducer.inventorySmartDropShipService
        .dropShipVendorSkuTableConfigLoader,
    updateDropShipPredictionsSuccess:
      store.inventorysmartReducer.inventorySmartDropShipService
        .updateDropShipPredictionsSuccess,
  };
};

const mapDispatchToProps = (dispatch) => ({
  getDropShipVendorSkuUnitTableData: (payload) =>
    dispatch(getDropShipVendorSkuUnitTableData(payload)),
  setDropShipVendorSkuTableDataLoader: (payload) =>
    dispatch(setDropShipVendorSkuTableDataLoader(payload)),
  setDropShipVendorSkuTableConfigLoader: (payload) =>
    dispatch(setDropShipVendorSkuTableConfigLoader(payload)),
  setDropShipVendorSkuTableData: (payload) =>
    dispatch(setDropShipVendorSkuTableData(payload)),
  setUpdateDropShipPredictionsSuccess: (payload) =>
    dispatch(setUpdateDropShipPredictionsSuccess(payload)),
  resetDropShipVendorSkuForecasts: (payload) =>
    dispatch(resetDropShipVendorSkuForecasts(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  closeSnack: (payload) => dispatch(closeSnack(payload)),
  setFormFilters: (payload) => dispatch(setFormFilters(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(VendorSkuUnitProjections);
