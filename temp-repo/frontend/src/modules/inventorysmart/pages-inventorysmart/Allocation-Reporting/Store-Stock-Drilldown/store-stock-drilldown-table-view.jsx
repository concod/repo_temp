import React, { useState, useEffect, useRef } from "react";

import { isEmpty, cloneDeep } from "lodash";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { makeStyles } from "@mui/styles";

import AgGridComponent from "core/Utils/agGrid";
import globalStyles from "core/Styles/globalStyles";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import Loader from "core/Utils/Loader/loader";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";

import {
  ERROR_MESSAGE,
  REPORT_DOWNLOAD_VALIDATION_MSG,
} from "../../../constants-inventorysmart/stringConstants";
import DownloadReport from "../report-download";

export const useStyles = makeStyles(() => ({
  sizeSplitTableWidth: {
    margin: "1rem auto",
    width: "60%",
  },
}));

const StoreStockDrillDownViewTableComponent = (props) => {
  const [storeStockDrillDownColumn, setStoreStockDrillDownColumn] = useState(
    []
  );
  const [openStoreStockPopup, setOpenStoreStockPopup] = useState(false);
  const [
    storeStockDrillDownColumnDetails,
    setStoreStockDrillDownColumnDetails,
  ] = useState([]);
  const [storeStockDrillDownSizeData, setStoreStockDrillDownSizeData] =
    useState([]);
  const [sizeDetailsLoader, setSizeDetailsLoader] = useState(false);
  const [metric, setMetric] = useState(null);
  const [storeNum, setStoreNum] = useState(null);
  const [styleColorId, setStyleColorId] = useState(null);
  const [requestBody, setRequestBody] = useState({});
  const [enableDownload, setEnableDownload] = useState(false);
  const [enableValidationOnDownload, setEnableValidationOnDownload] =
    useState(false);
  const [storeStockStoreViewColumns, setStoreStockStoreViewColumns] = useState(
    []
  );
  const [storeStockSizeViewColumns, setStoreStockSizeViewColumns] = useState(
    []
  );
  const [enableStoreViewDownload, setEnableStoreViewDownload] = useState(false);
  const [enableSizeViewDownload, setEnableSizeViewDownload] = useState(false);
  const [storeSizeViewLoader, setStoreSizeViewLoader] = useState(false);

  const existingArticleSizeDetails = useRef([]);
  const storeStockDrillDownTableInstance = useRef(null);
  const filterConfig = useRef({});
  const storeStockDrillDownSizeTableInstance = useRef(null);
  const storeStockDrillDownStoreTableInstance = useRef(null);
  const offsetValues = useRef({});
  const storeOffsetValues = useRef({});
  const sizeOffsetValues = useRef({});

  const globalClasses = globalStyles();
  const classes = useStyles();

  useEffect(() => {
    if (!isEmpty(props.renderTable)) {
      filterConfig.current = props.renderTable.filters;
      storeStockDrillDownTableInstance.current?.api?.refreshServerSideStore({
        purge: true,
      });
      storeStockDrillDownSizeTableInstance.current?.api?.refreshServerSideStore(
        { purge: true }
      );
      storeStockDrillDownStoreTableInstance.current?.api?.refreshServerSideStore(
        { purge: true }
      );
    }
  }, [props.renderTable]);

  useEffect(() => {
    if (
      !isEmpty(props.inventorysmartScreenConfig) &&
      props.inventorysmartScreenConfig?.restrictServerSideExcelDownload &&
      !isEmpty(requestBody)
    ) {
      let restrictOnKey =
        props.inventorysmartScreenConfig?.inventorysmart_allocation_report
          ?.drillDown?.restrictReportDownloadBasedOn[0];
      let deptValues = requestBody.filters.filter(
        (item) => item.filter_id === restrictOnKey
      )?.[0]?.values;
      if (deptValues?.length && deptValues.length > 1) {
        setEnableValidationOnDownload(true);
      } else setEnableValidationOnDownload(false);
    }
  }, [requestBody, props.inventorysmartScreenConfig]);

  const setManualCallBackRequestBody = (manualbody, pageIndex, offsetType) => {
    let limit =
      Object.keys(offsetType.current)?.length > 0 && pageIndex !== 0
        ? { limit: 10, page: pageIndex + 1, ...offsetType.current }
        : { limit: 10, page: pageIndex + 1 };
    return {
      filters: filterConfig.current,
      meta: {
        ...manualbody,
        limit,
      },
    };
  };

  const setModifiedRowData = (rows) => {
    if (rows?.length) {
      return rows?.map((item) => {
        return {
          ...item,
          bulk_remaining: item?.bulk_remaining ? item.bulk_remaining : 0,
          negative_inventory_oh: item?.negative_inventory_oh ? "True" : "False",
        };
      });
    } else return [];
  };

  const manualCallBack = async (manualbody, pageIndex) => {
    props.setStockDrillDownTableLoader(true);
    let body = setManualCallBackRequestBody(
      manualbody,
      pageIndex,
      offsetValues
    );
    try {
      setRequestBody(body);
      let drillDownTableDetails = await props.getStockDrillDownTableData(body);
      let copyOfStoreStockTableData = cloneDeep(
        drillDownTableDetails.data?.data?.columns
      );

      if (dynamicLabelsBasedOnTenant("article") === "Material") {
        let col = agGridColumnFormatter(copyOfStoreStockTableData);
        setStoreStockDrillDownColumn(col);
      } else {
        // for vb
        let storeStockActions = getActionColumns(copyOfStoreStockTableData);
        let col = agGridColumnFormatter(
          copyOfStoreStockTableData,
          null,
          storeStockActions
        );
        setStoreStockDrillDownColumn(col);
      }
      offsetValues.current = {
        offset: drillDownTableDetails.data?.offset,
        sub_offset: drillDownTableDetails.data?.sub_offset,
      };
      if (pageIndex == 0) {
        if (drillDownTableDetails.data?.data?.table_data?.length)
          setEnableDownload(true);
        else setEnableDownload(false);
      }
      let tableData = setModifiedRowData(
        drillDownTableDetails.data?.data?.table_data
      );
      props.setStockDrillDownTableLoader(false);
      return {
        data: tableData,
        totalCount: drillDownTableDetails.data?.total,
      };
    } catch (err) {
      setEnableDownload(false);
      props.setStockDrillDownTableLoader(false);
      props.displaySnackMessages(ERROR_MESSAGE, "error");
      return {
        data: [],
        totalCount: 0,
      };
    }
  };

  const manualCallBackStoreStockStoreView = async (manualbody, pageIndex) => {
    setStoreSizeViewLoader(true);
    let body = setManualCallBackRequestBody(
      manualbody,
      pageIndex,
      storeOffsetValues
    );
    try {
      let drillDownTableDetails = await props.getStoreStockStoreTableData(body);
      let copyOfStoreStockTableData = cloneDeep(
        drillDownTableDetails.data?.data?.columns
      );
      let col = agGridColumnFormatter(copyOfStoreStockTableData);
      setStoreStockStoreViewColumns(col);
      storeOffsetValues.current = {
        offset: drillDownTableDetails.data?.offset,
        sub_offset: drillDownTableDetails.data?.sub_offset,
      };
      if (pageIndex == 0) {
        if (drillDownTableDetails.data?.data?.table_data?.length)
          setEnableStoreViewDownload(true);
        else setEnableStoreViewDownload(false);
      }
      let tableData = setModifiedRowData(
        drillDownTableDetails.data?.data?.table_data
      );
      setStoreSizeViewLoader(false);
      return {
        data: tableData,
        totalCount: drillDownTableDetails.data?.total,
      };
    } catch (err) {
      setEnableStoreViewDownload(false);
      setStoreSizeViewLoader(false);
      props.displaySnackMessages(ERROR_MESSAGE, "error");
      return {
        data: [],
        totalCount: 0,
      };
    }
  };

  const manualCallBackStoreStockSizeView = async (manualbody, pageIndex) => {
    setStoreSizeViewLoader(true);
    let body = setManualCallBackRequestBody(
      manualbody,
      pageIndex,
      sizeOffsetValues
    );
    try {
      let drillDownTableDetails = await props.getStoreStockSizeTableData(body);
      let copyOfStoreStockTableData = cloneDeep(
        drillDownTableDetails.data?.data?.columns
      );
      let col = agGridColumnFormatter(copyOfStoreStockTableData);
      setStoreStockSizeViewColumns(col);
      sizeOffsetValues.current = {
        offset: drillDownTableDetails.data?.offset,
        sub_offset: drillDownTableDetails.data?.sub_offset,
      };
      if (pageIndex == 0) {
        if (drillDownTableDetails.data?.data?.table_data?.length)
          setEnableSizeViewDownload(true);
        else setEnableSizeViewDownload(false);
      }

      let bulkRemainingOnRows = setModifiedRowData(
        drillDownTableDetails.data?.data?.table_data
      );
      setStoreSizeViewLoader(false);
      return {
        data: bulkRemainingOnRows,
        totalCount: drillDownTableDetails.data?.total,
      };
    } catch (err) {
      setEnableSizeViewDownload(false);
      setStoreSizeViewLoader(false);
      props.displaySnackMessages(ERROR_MESSAGE, "error");
      return {
        data: [],
        totalCount: 0,
      };
    }
  };

  const getActionColumns = (cols) => {
    /* 
      This function is used to create a dynamic list of column names whose type is link.
      Dynamic list is needed as the num of DC's vary for a client and the column name for DC's differs from client to client.
      Instead of having column names hardcoded with their action mentioned, which is to be passed as third param to aggrid col formatter,
      we fetch it dynamically based on col type and convert into the required format
     */
    let linkTypeCols = [];
    cols.forEach((item) => {
      if (item?.sub_headers.length) {
        item?.sub_headers.filter((data) => {
          if (data.type === "link") {
            linkTypeCols.push(data);
          }
        });
      } else {
        if (item.type === "link") linkTypeCols.push(item);
      }
    });
    let linkTypeColNames = linkTypeCols.map((obj) => obj.column_name);
    let actionObject = linkTypeColNames.map((colNames) => {
      return {
        [colNames]: toggleStoreStockPopup,
      };
    });
    return Object.assign({}, ...actionObject);
  };

  const loadTableInstance = (params) => {
    storeStockDrillDownTableInstance.current = params;
  };

  const loadStoreStockSizeInstance = (params) => {
    storeStockDrillDownSizeTableInstance.current = params;
  };

  const loadStoreStockStoreInstance = (params) => {
    storeStockDrillDownStoreTableInstance.current = params;
  };

  const toggleStoreStockPopup = async (data, columnName, colData) => {
    setMetric(colData?.label);
    let storeNumKey = props.inventorysmartScreenConfig
      ?.inventorysmart_store_stock_drill_down_popup_value_key
      ? props.inventorysmartScreenConfig
          ?.inventorysmart_store_stock_drill_down_popup_value_key
      : "store_code";
    setStoreNum(data[storeNumKey]);
    setStyleColorId(data.article);
    setOpenStoreStockPopup(true);

    let sizeDetailsColKeys;
    // Make an api call initially only for those rows on which a user has not performed on click operation to view size details of an article.
    // Push the response of the size details api to existingArticleSizeDetails ref variable
    if (
      !existingArticleSizeDetails.current.length ||
      existingArticleSizeDetails.current.every((item) => data.key !== item.key)
    ) {
      try {
        setSizeDetailsLoader(true);
        let reqBody = {
          filters: filterConfig.current,
          article: data.article,
          store_code: data.store_code,
        };
        let sizeDetailsResponse = await props.getStockDrillDownSizeDetails(
          reqBody
        );
        sizeDetailsColKeys =
          sizeDetailsResponse.data.data[`size_${columnName}`];
        setSizeDetailsLoader(false);
        let newArticleSizeDetails = [
          ...existingArticleSizeDetails.current,
          {
            key: data.key,
            details: sizeDetailsResponse.data.data,
          },
        ];
        existingArticleSizeDetails.current = newArticleSizeDetails;
      } catch (err) {
        setSizeDetailsLoader(false);
        props.displaySnackMessages(ERROR_MESSAGE, "error");
      }
    } else {
      // If the user performs onClick on the same row whose size details data exists in existingArticleSizeDetails ref variable,
      // fetch the record and map it accordingly into pop-up's table data
      let matchingRecord = existingArticleSizeDetails.current.filter(
        (item) => data.key === item.key
      )[0];
      sizeDetailsColKeys = matchingRecord.details[`size_${columnName}`];
    }
    let sizeColumns = Object.keys(sizeDetailsColKeys).map((item, i) => {
      return {
        sub_headers: [],
        tc_code: 190,
        column_name: item,
        type: "str",
        label: item,
        is_frozen: false,
        is_hidden: false,
        is_editable: false,
        is_aggregated: false,
        order_of_display: i + 1,
        dimension: "Store",
        is_required: true,
        aggregate: null,
        formatter: null,
        is_row_span: false,
        footer: null,
        is_searchable: false,
        is_sortable: false,
        extra: null,
      };
    });
    let agGridFormattedColumns = agGridColumnFormatter(sizeColumns);
    setStoreStockDrillDownColumnDetails(agGridFormattedColumns);
    setStoreStockDrillDownSizeData([sizeDetailsColKeys]);
  };

  const renderPopupToShowSummary = () => {
    return (
      <Dialog
        maxWidth={"sm"}
        aria-labelledby="customized-dialog-title"
        open={true}
        fullWidth={true}
        disableEscapeKeyDown={true}
      >
        <DialogTitle id="customized-dialog-title">
          <Grid
            container
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography variant="h5" gutterBottom>
              {metric}
            </Typography>
            <Typography variant="h5" gutterBottom>
              {dynamicLabelsBasedOnTenant("article_number")}: {styleColorId}
            </Typography>
            <Typography variant="h5" gutterBottom>
              Store Number: {storeNum}
            </Typography>
            <IconButton
              aria-label="close"
              onClick={() => setOpenStoreStockPopup(false)}
              size="large"
            >
              <CloseIcon />
            </IconButton>
          </Grid>
        </DialogTitle>
        <DialogContent>
          <Loader loader={sizeDetailsLoader}>
            <div
              className={
                storeStockDrillDownColumnDetails.length < 3
                  ? classes.sizeSplitTableWidth
                  : ""
              }
            >
              <AgGridComponent
                downloadAsExcel={props.enableDownload}
                rowdata={storeStockDrillDownSizeData}
                columns={storeStockDrillDownColumnDetails}
                suppressFieldDotNotation
                sideBar={false}
              />
            </div>
          </Loader>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className={globalClasses.marginVertical1rem}>
      <Loader loader={props.stockDrillDownTableLoader}>
        <Typography variant="h5">
          {`${dynamicLabelsBasedOnTenant("article")} View`}{" "}
        </Typography>
        <DownloadReport
          screenName={"store_stock_drill_down"}
          requestBody={requestBody}
          disable={!enableDownload}
          checkValidationOnDownload={enableValidationOnDownload}
          throwValidationMessage={REPORT_DOWNLOAD_VALIDATION_MSG}
        ></DownloadReport>
        <AgGridComponent
          columns={storeStockDrillDownColumn}
          cacheBlockSize={10}
          rowModelType="infinite"
          pagination={false}
          manualCallBack={(body, pageIndex) => manualCallBack(body, pageIndex)}
          loadTableInstance={loadTableInstance}
          uniqueRowId={"key"}
          cacheOverflowSize={2}
        />
      </Loader>

      {/* Store and size level distribution is to be displayed in RL */}
      {props.inventorysmartScreenConfig?.inventorysmart_allocation_report
        ?.drillDown?.showReportSplitView && (
        <div>
          <Loader loader={storeSizeViewLoader}>
            <div className={globalClasses.marginVertical1rem}>
              <Typography variant="h5">Store View</Typography>
              <DownloadReport
                screenName={"ssd_article_store_level"}
                requestBody={requestBody}
                disable={!enableStoreViewDownload}
              ></DownloadReport>
              <AgGridComponent
                loadTableInstance={loadStoreStockStoreInstance}
                manualCallBack={(body, pageIndex) =>
                  manualCallBackStoreStockStoreView(body, pageIndex)
                }
                rowModelType="serverSide"
                serverSideStoreType="partial"
                cacheBlockSize={10}
                columns={storeStockStoreViewColumns}
                uniqueRowId={"key"}
              />
            </div>
            <div className={globalClasses.marginVertical1rem}>
              <Typography variant="h5">Size View</Typography>
              <DownloadReport
                screenName={"ssd_article_store_size_level"}
                requestBody={requestBody}
                disable={!enableSizeViewDownload}
              ></DownloadReport>
              <AgGridComponent
                loadTableInstance={loadStoreStockSizeInstance}
                manualCallBack={(body, pageIndex) =>
                  manualCallBackStoreStockSizeView(body, pageIndex)
                }
                rowModelType="serverSide"
                serverSideStoreType="partial"
                cacheBlockSize={10}
                columns={storeStockSizeViewColumns}
                uniqueRowId={"key"}
              />
            </div>
          </Loader>
        </div>
      )}
      {openStoreStockPopup && renderPopupToShowSummary()}
    </div>
  );
};

export default StoreStockDrillDownViewTableComponent;
