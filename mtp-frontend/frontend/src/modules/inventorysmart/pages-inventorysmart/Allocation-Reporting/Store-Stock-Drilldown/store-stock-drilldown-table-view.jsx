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
import { Accordion } from "impact-ui";

import AgGridComponent from "core/Utils/agGrid";
import globalStyles from "core/Styles/globalStyles";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import Loader from "core/Utils/Loader/loader";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";

import {
  ERROR_MESSAGE,
  REPORT_DOWNLOAD_VALIDATION_MSG,
  TOTAL_INVENTORY_DC_COL,
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
  const [storeRequestBody, setStoreRequestBody] = useState({});
  const [sizeRequestBody, setSizeRequestBody] = useState({});
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
  const [materialViewLoader,setMaterialViewLoader]=useState(false)
  const [storeViewLoader, setStoreViewLoader] = useState(false);
  const [sizeViewLoader, setSizeViewLoader] = useState(false);
  const [accordionState, setAccordionState] = useState({
    storeView: !props.inventorysmartScreenConfig.inventorysmart_allocation_report
      ?.drillDown?.store_size_hidden,
    sizeView: !props.inventorysmartScreenConfig.inventorysmart_allocation_report
      ?.drillDown?.store_size_hidden
    ,
  })

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
    const LIMIT = 10;
    
    let limit;
    if (Object.keys(offsetType.current)?.length > 0 && pageIndex !== 0) {
      if (props?.inventorysmartScreenConfig?.dashboard?.cumulativeOffsetCalculation) {
        // New logic with cumulative offset calculation with respect to limit
        limit = {
          limit: LIMIT,
          page: pageIndex + 1,
          offset: offsetType.current.offset + LIMIT,
          sub_offset: offsetType.current.sub_offset + LIMIT
        };
      } else {
        // Existing logic
        limit = { 
          limit: LIMIT, 
          page: pageIndex + 1, 
          ...offsetType.current 
        };
      }
    } else {
      limit = { 
        limit: LIMIT, 
        page: pageIndex + 1 
      };
    }
    return {
      filters: filterConfig.current,
      meta: {
        search: [],
        range: [],
        sort: [],
        limit: limit,
        ...manualbody
      },
    };
  };

  // column grouping implemented for RL_NA
  const getNewSubHeaders = (p_subCols, p_label) => {
    let newSubHead = []
    p_subCols.forEach((subCol) => {
      if (subCol.extra.displayClusteredCol) {
        newSubHead.push({
          ...subCol,
          extra: {},
          columnGroupShow: 'closed',
          suppressColumnsToolPanel:true
        })
      }
      newSubHead.push({
        ...subCol,
        columnGroupShow: 'open'
      })
    })
    if (p_label == "DC Inventory") {
      newSubHead.push(TOTAL_INVENTORY_DC_COL);
    }
    return newSubHead
  };

  const isOpenOnSearch = (p_instance, p_colName) => {

    // to get the state of the columngroup i.e open/closed
    const columnGroupState = p_instance.columnApi?.getColumnGroupState();

    // Get all displayed column groups
    const displayedGroups = p_instance.columnApi?.getAllDisplayedColumnGroups();

    const groupStatesWithNames = displayedGroups?.map(group => {
      const groupId = group?.getGroupId();
      const headerName = group?.getOriginalColumnGroup()?.getColGroupDef()?.headerName;


      // Find the state of this group from the columnGroupState array
      const groupState = columnGroupState?.find(state => state?.groupId === groupId);

      return {
        headerName: headerName || groupId,
        groupId: groupId,
        open: groupState ? groupState?.open : false  // If groupState is undefined, assume it's closed
      };
    });
    if (displayedGroups.length) {

    for (let colGrp of groupStatesWithNames) {
      if (colGrp?.headerName == p_colName && colGrp?.open == true) {
                return true
              }
          }
      return false

    }
    else {
      if (p_colName == "DC Inventory" || p_colName == "Store Inventory") {
        return true
      }
      return false
    }

    }

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
    pageIndex == 0 && setMaterialViewLoader(true);
    let body = setManualCallBackRequestBody(
      manualbody,
      pageIndex,
      offsetValues
    );
    try {
      let materialViewBody = {
        ...body,
        filters: body.filters.filter(item => {
          // For store dimension, only allow channel if client is RL-EU
          if (item.dimension === "store") {
            if (props.inventorysmartScreenConfig?.inventorysmart_allocation_report?.onlymandatoryStoreFilters) {  //for RL-APAC
              return item.attribute_name === "channel" || item.attribute_name === "retail_region";
            }
            else {
            return props.inventorysmartScreenConfig?.inventorysmart_allocation_report?.ignoreStoreAttributeFilter 
              ? item.attribute_name === "channel"
              : true;  // Keep all store filters if ignoreStoreAttributeFilter is false for RL-NA
            }
          } 
          // For product dimension, exclude size filter
          if (item.dimension === "product") {
            return item.attribute_name !== "size";
          }
  
          return true;
        })
      };
      setRequestBody(materialViewBody);
      let drillDownTableDetails = await props.getStockDrillDownTableData(materialViewBody);
      let copyOfStoreStockTableData = cloneDeep(
        drillDownTableDetails.data?.data?.columns
      );

      if (dynamicLabelsBasedOnTenant("article") === "Material") {
        let col = agGridColumnFormatter(copyOfStoreStockTableData);
        let newCols = col.map((ele) => {
          if (props.inventorysmartScreenConfig?.inventorysmart_allocation_report?.consolidatedRows && ele.sub_headers.length) {
            return {
              ...ele,
              ...(isOpenOnSearch(storeStockDrillDownTableInstance?.current, ele.label) && { openByDefault: true }),
              sub_headers: getNewSubHeaders(ele.sub_headers, ele.label),
              children: getNewSubHeaders(ele.sub_headers, ele.label)
            }
          }
          return ele
        })

        setStoreStockDrillDownColumn(newCols);

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
      setMaterialViewLoader(false);
      return {
        data: tableData,
        totalCount: drillDownTableDetails.data?.total,
      };
    } catch (err) {
      setEnableDownload(false);
      setMaterialViewLoader(false);
      props.displaySnackMessages(ERROR_MESSAGE, "error");
      return {
        data: [],
        totalCount: 0,
      };
    }
  };

  const manualCallBackStoreStockStoreView = async (manualbody, pageIndex) => {
    if (props.inventorysmartScreenConfigForInfiniteScrolling?.includes("RSSDDStoreView")) {
      pageIndex == 0 && setStoreViewLoader(true);
    }
    else {
      setStoreViewLoader(true);
    }
    let body = setManualCallBackRequestBody(
      manualbody,
      pageIndex,
      storeOffsetValues
    );

    let storeViewBody = {
      ...body,
      filters: body.filters.filter((item) => {
        if (item.attribute_name != "size") {
          return item
        }
      })
    };

    setStoreRequestBody(storeViewBody);

    try {
      let drillDownTableDetails = await props.getStoreStockStoreTableData(storeViewBody);
      let copyOfStoreStockTableData = cloneDeep(
        drillDownTableDetails.data?.data?.columns
      );
      let col = agGridColumnFormatter(copyOfStoreStockTableData);
      let newCols = col.map((ele) => {
        if (props.inventorysmartScreenConfig?.inventorysmart_allocation_report?.consolidatedRows && ele?.sub_headers.length) {
          return {
            ...ele,
            ...(isOpenOnSearch(storeStockDrillDownStoreTableInstance?.current,ele.label) && {openByDefault:true}),
            sub_headers: getNewSubHeaders(ele.sub_headers, ele.label),
            children: getNewSubHeaders(ele.sub_headers, ele.label)
          }
        }
        return ele
      })
      setStoreStockStoreViewColumns(newCols);
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
      setStoreViewLoader(false);
      return {
        data: tableData,
        totalCount: drillDownTableDetails.data?.total,
      };
    } catch (err) {
      setEnableStoreViewDownload(false);
      setStoreViewLoader(false);
      props.displaySnackMessages(ERROR_MESSAGE, "error");
      return {
        data: [],
        totalCount: 0,
      };
    }
  };

  const manualCallBackStoreStockSizeView = async (manualbody, pageIndex) => {
    if (props.inventorysmartScreenConfigForInfiniteScrolling?.includes("RSSDDSizeView")) {
      pageIndex == 0 && setSizeViewLoader(true);
    }
    else {
      setSizeViewLoader(true);
    }
    let body = setManualCallBackRequestBody(
      manualbody,
      pageIndex,
      sizeOffsetValues
    );

    setSizeRequestBody(body);

    try {
      let drillDownTableDetails = await props.getStoreStockSizeTableData(body);
      let copyOfStoreStockTableData = cloneDeep(
        drillDownTableDetails.data?.data?.columns
      );
      let col = agGridColumnFormatter(copyOfStoreStockTableData);
      let newCols = col.map((ele) => {
        if (props.inventorysmartScreenConfig?.inventorysmart_allocation_report?.consolidatedRows && ele?.sub_headers.length) {
          return {
            ...ele,
            ...(isOpenOnSearch(storeStockDrillDownSizeTableInstance?.current,ele.label) && {openByDefault:true}),
            sub_headers: getNewSubHeaders(ele.sub_headers, ele.label),
            children: getNewSubHeaders(ele.sub_headers, ele.label)
          }
        }
        return ele
      })
      setStoreStockSizeViewColumns(newCols);
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
      setSizeViewLoader(false);
      return {
        data: bulkRemainingOnRows,
        totalCount: drillDownTableDetails.data?.total,
      };
    } catch (err) {
      setEnableSizeViewDownload(false);
      setSizeViewLoader(false);
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
                disableExcelDownload={storeStockDrillDownSizeData.length ? false : true}
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
      <Accordion
        className={globalClasses.marginVertical1rem}
        label={`${dynamicLabelsBasedOnTenant("article")} View`}
        defaultExpanded="true"
      >
        <Loader loader={materialViewLoader}>
          <div className={globalClasses.marginVertical}>
            <DownloadReport
              screenName={"store_stock_drill_down"}
              requestBody={requestBody}
              disable={!enableDownload}
              checkValidationOnDownload={enableValidationOnDownload}
              throwValidationMessage={REPORT_DOWNLOAD_VALIDATION_MSG}
              columns={storeStockDrillDownColumn}
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
          </div>
        </Loader>
      </Accordion>

      {/* Store and size level distribution is to be displayed in RL */}
      {props.inventorysmartScreenConfig?.inventorysmart_allocation_report
        ?.drillDown?.showReportSplitView && (
          <div>
            <Accordion
              {...(!props.inventorysmartScreenConfig.inventorysmart_allocation_report
                ?.drillDown?.store_size_hidden && { defaultExpanded: true })}
              className={globalClasses.marginVertical1rem}
              label={props.inventorysmartScreenConfig.inventorysmart_allocation_report
                ?.drillDown?.store_size_hidden ? `Material-Store View` : `Store View`}
              onChange={() => {
                setAccordionState((prev) => {
                  return {
                    ...prev,
                    storeView: true
                  }
                })
              }}

            >
              <Loader loader={storeViewLoader}>
                {accordionState.storeView && <div className={globalClasses.marginVertical}>
                  <DownloadReport
                    screenName={"ssd_article_store_level"}
                    requestBody={storeRequestBody}
                    disable={!enableStoreViewDownload}
                    columns={storeStockStoreViewColumns}
                  ></DownloadReport>
                  <AgGridComponent
                    loadTableInstance={loadStoreStockStoreInstance}
                    manualCallBack={(body, pageIndex) =>
                      manualCallBackStoreStockStoreView(body, pageIndex)
                    }
                    {...(props.inventorysmartScreenConfigForInfiniteScrolling?.includes(
                      "RSSDDStoreView"
                    )
                      ? {
                        pagination: false,
                        rowModelType: "infinite",
                        cacheOverflowSize: 2,
                        hideSelectCurrentPageRecords: true,
                      }
                      : {
                        rowModelType: "serverSide",
                        serverSideStoreType: "partial",
                      })}
                    cacheBlockSize={10}
                    columns={storeStockStoreViewColumns}
                    uniqueRowId={"key"}
                  />
                </div>}
              </Loader>
            </Accordion>
            {!props?.inventorysmartScreenConfig?.dashboard?.hideMaterialSizeViewTable && (<Accordion
            {...(!props.inventorysmartScreenConfig.inventorysmart_allocation_report
              ?.drillDown?.store_size_hidden && { defaultExpanded: true })}
            label={props.inventorysmartScreenConfig.inventorysmart_allocation_report
              ?.drillDown?.store_size_hidden ? `Material-Store-Size View` : `Size View`}
              onChange={() => {
                setAccordionState((prev) => {
                  return {
                    ...prev,
                    sizeView: true
                  }
                })
              }}
            >
              <Loader loader={sizeViewLoader}>
                {accordionState.sizeView && <div className={globalClasses.marginVertical}>
                  <DownloadReport
                    screenName={"ssd_article_store_size_level"}
                    requestBody={sizeRequestBody}
                    disable={!enableSizeViewDownload}
                    columns={storeStockSizeViewColumns}
                  ></DownloadReport>
                  <AgGridComponent
                    loadTableInstance={loadStoreStockSizeInstance}
                    manualCallBack={(body, pageIndex) =>
                      manualCallBackStoreStockSizeView(body, pageIndex)
                    }
                    {...(props.inventorysmartScreenConfigForInfiniteScrolling?.includes(
                      "RSSDDSizeView"
                    )
                      ? {
                        pagination: false,
                        rowModelType: "infinite",
                        cacheOverflowSize: 2,
                        hideSelectCurrentPageRecords: true,
                      }
                      : {
                        rowModelType: "serverSide",
                        serverSideStoreType: "partial",
                      })}
                    cacheBlockSize={10}
                    columns={storeStockSizeViewColumns}
                    uniqueRowId={"key"}
                  />
                </div>}
              </Loader>
            </Accordion> )}
          </div>
        )}
      {openStoreStockPopup && renderPopupToShowSummary()}
    </div>
  );
};

export default StoreStockDrillDownViewTableComponent;
