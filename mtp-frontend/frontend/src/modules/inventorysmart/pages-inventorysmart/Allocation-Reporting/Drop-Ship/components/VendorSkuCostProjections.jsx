import React, { useState, useRef, useEffect } from "react";
import { connect } from "react-redux";
import { addSnack } from "core/actions/snackbarActions";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import Loader from "core/Utils/Loader/loader";
import { setFormFilters } from "modules/inventorysmart/services-inventorysmart/Finalize/product-view-services";
import {
  setDropShipVendorSkuTableData,
  setDropShipVendorSkuTableDataLoader,
  getDropShipVendorSkuCostTableData,
} from "modules/inventorysmart/services-inventorysmart/Allocation-Reports/drop-ship-service";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import {
  ERROR_MESSAGE,
  tableConfigurationMetaData,
  defaultTableData,
  OMS_REPORTS_TABLE_COLUMN_FILTER,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { isEmpty } from "lodash";
import { Typography } from "@mui/material";
import globalStyles from "core/Styles/globalStyles";

const VendorSkuCostProjections = (props) => {
  const globalClasses = globalStyles();

  const [renderAgGrid, setRenderAgGrid] = useState(false);
  const [emptyGrid, setEmptyGrid] = useState(false);
  const [tableColumns, setTableColumns] = useState([]);
  const [tableRowCountForCosts, setTableRowCountForCosts] = useState(0);

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
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

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

      let response = await props.getDropShipVendorSkuCostTableData(body);

      if (response.data.status) {
        let columns = response?.data?.data?.column;
        if (columns.length === 0) {
          setEmptyGrid(true);
          return;
        }
        columns.map((data) => {
          if (OMS_REPORTS_TABLE_COLUMN_FILTER.indexOf(data.column_name) === -1)
            data.sub_headers.map((sub_header) => {
              sub_header.label = sub_header.label + " ($)";
            });
        });
        let formattedColumns = agGridColumnFormatter(columns, null);
        setTableColumns(formattedColumns);
        setEmptyGrid(false);

        let formatedData = agGridRowFormatter(
          response?.data?.data.data,
          params?.api?.checkConfiguration,
          "product_code"
        );
        setTableRowCountForCosts(formatedData.length);
        props.setDropShipVendorSkuTableDataLoader(false);
        setRenderAgGrid(true);
        props.setTotalCount(response.data?.total);
        return { data: formatedData, totalCount: response.data.total };
      } else {
        displaySnackMessages(ERROR_MESSAGE, "error");
        props.setDropShipVendorSkuTableDataLoader(false);
        return defaultTableData;
      }
    } catch {
      displaySnackMessages(ERROR_MESSAGE, "error");
      props.setDropShipVendorSkuTableDataLoader(false);
      return defaultTableData;
    }
  };
  useEffect(() => {
    if (!renderAgGrid) setRenderAgGrid(true);
  }, [props.selectedFilters, renderAgGrid]);

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
        <Loader
          loader={props.dropShipVendorSkuTableDataLoader}
          minHeight={"260px"}
        >
          {renderAgGrid && (
            <div>
              <AgGridComponent
                columns={tableColumns}
                manualCallBack={(body, pageIndex, params) =>
                  manualCallBack(body, pageIndex, params)
                }
                totalCount={tableRowCountForCosts}
                loadTableInstance={loadTableInstance}
                pagination={true}
                cacheBlockSize={10}
                rowModelType="serverSide"
                serverSideStoreType="partial"
                uniqueRowId={"product_code"}
              />
            </div>
          )}
        </Loader>
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
  };
};

const mapDispatchToProps = (dispatch) => ({
  getDropShipVendorSkuCostTableData: (payload) =>
    dispatch(getDropShipVendorSkuCostTableData(payload)),
  setDropShipVendorSkuTableDataLoader: (payload) =>
    dispatch(setDropShipVendorSkuTableDataLoader(payload)),
  setDropShipVendorSkuTableData: (payload) =>
    dispatch(setDropShipVendorSkuTableData(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  setFormFilters: (payload) => dispatch(setFormFilters(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(VendorSkuCostProjections);
