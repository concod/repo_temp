import React, { useState, useEffect, useRef } from "react";
import { connect } from "react-redux";

import { Typography } from "@mui/material";

import { isEmpty } from "lodash";

import AgGridComponent from "core/Utils/agGrid";
import { getColumnsAg } from "core/actions/tableColumnActions";
import Loader from "core/Utils/Loader/loader";
import globalStyles from "core/Styles/globalStyles";
import {
  appendExcelDownloadData,
  fetchFilterChipsToDownload,
  prependExtraData,
} from "core/Utils/agGrid/table-functions";

import {
  setForwardLookingAllocationSummaryData,
  setForwardLookingAllocationSummaryLoader,
  setForwardLookingAllocationDetailsLoader,
  setForwardLookingAllocationDetailsData,
  getForwardLookingAllocationDetailsData,
  getForwardLookingAllocationSummaryData,
  getForwardLookingAllocationProductViewData,
  setForwardLookingAllocationProductViewLoader,
  setForwardLookingAllocationProductViewData,
} from "../../../services-inventorysmart/Allocation-Reports/forward-looking-allocation-service";
import { ERROR_MESSAGE } from "../../../constants-inventorysmart/stringConstants";
import { cloneDeep } from "lodash";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";

const ForwardLookingTableComponent = (props) => {
  const [
    forwardLookingAllocationSummaryCol,
    setForwardLookingAllocationSummaryCol,
  ] = useState([]);
  const [summaryDataFLA, setSummaryDataFLA] = useState([]);
  const [
    forwardLookingAllocationDetailsCol,
    setForwardLookingAllocationDetailsCol,
  ] = useState([]);
  const [detailsDataFLA, setDetailsDataFLA] = useState([]);
  const [
    forwardLookingAllocationProductViewCol,
    setForwardLookingAllocationProductViewCol,
  ] = useState([]);
  const [productViewDataFLA, setProductViewDataFLA] = useState([]);
  const [downloadFormatChipsDependency, setDownloadFormatChipsDependency] =
    useState({});

  const filterDependencyRef = useRef(null);
  const globalClasses = globalStyles();

  useEffect(() => {
    (async () => {
      try {
        props.setForwardLookingAllocationSummaryLoader(true);
        let col = await getColumnsAg(
          "table_name=inventorysmart_allocation_estimate"
        )();
        setForwardLookingAllocationSummaryCol(col);
        props.setForwardLookingAllocationDetailsLoader(true);
        let detailsCol = await getColumnsAg(
          "table_name=inventorysmart_allocation_estimate_details"
        )();
        setForwardLookingAllocationDetailsCol(detailsCol);
        props.setForwardLookingAllocationProductViewLoader(true);
        let productViewCol = await getColumnsAg(
          "table_name=inventorysmart_allocation_product_hierarchy"
        )();
        setForwardLookingAllocationProductViewCol(productViewCol);
      } catch (e) {
        props.setForwardLookingAllocationProductViewLoader(false);
        props.setForwardLookingAllocationSummaryLoader(false);
        props.setForwardLookingAllocationDetailsLoader(false);
        props.displaySnackMessages(ERROR_MESSAGE, "error");
      }
    })();
  }, []);

  useEffect(() => {
    if (!isEmpty(props.filterDependency)) {
      filterDependencyRef.current = props.filterDependency;
      let filterChips = fetchFilterChipsToDownload(props.filterDependency);
      setDownloadFormatChipsDependency(filterChips);
      fetchFLASummaryData();
      fetchFLADetailsData();
      fetchFLAProductViewData();
    }
  }, [props.filterDependency]);

  useEffect(() => {
    let summaryData = props.forwardLookingAllocationSummaryData?.length
      ? [...props.forwardLookingAllocationSummaryData]
      : [];
    setSummaryDataFLA(summaryData);
  }, [props.forwardLookingAllocationSummaryData]);

  useEffect(() => {
    let productViewData = props.forwardLookingAllocationProductViewData?.length
      ? [...props.forwardLookingAllocationProductViewData]
      : [];
    setProductViewDataFLA(productViewData);
  }, [props.forwardLookingAllocationProductViewData]);

  useEffect(() => {
    let detailsData = [];
    if (props.forwardLookingAllocationDetailsData?.length) {
      detailsData = props.forwardLookingAllocationDetailsData.map((row) => {
        return {
          ...row,
          dc_out_of_stock: row?.dc_out_of_stock ? "True" : "False",
        };
      });
    }
    setDetailsDataFLA(detailsData);
  }, [props.forwardLookingAllocationDetailsData]);

  const prependData = () => {
    if (!isEmpty(downloadFormatChipsDependency)) {
      let l_downloadFormatChipsDependency = cloneDeep(downloadFormatChipsDependency);
      l_downloadFormatChipsDependency.product.value = downloadFormatChipsDependency.product.value.map((str)=> replaceSpecialCharacter(str ));
      let prependContentReq = prependExtraData(l_downloadFormatChipsDependency);
      return appendExcelDownloadData(prependContentReq);
    }
  };

  const fetchFLASummaryData = async () => {
    try {
      props.setForwardLookingAllocationSummaryLoader(true);
      let body = {
        filters: filterDependencyRef.current.filter(
          (item) => item.attribute_name !== "dc_out_of_stock"
        ),
      };
      let summaryResponse = await props.getForwardLookingAllocationSummaryData(
        body
      );
      props.setForwardLookingAllocationSummaryData(summaryResponse.data?.data);
      props.setForwardLookingAllocationSummaryLoader(false);
    } catch (e) {
      props.setForwardLookingAllocationSummaryData([]);
      props.setForwardLookingAllocationSummaryLoader(false);
      props.displaySnackMessages(ERROR_MESSAGE, "error");
    }
  };

  const fetchFLADetailsData = async () => {
    try {
      props.setForwardLookingAllocationDetailsLoader(true);
      let body = {
        filters: filterDependencyRef.current,
      };
      let response = await props.getForwardLookingAllocationDetailsData(body);
      props.setForwardLookingAllocationDetailsData(response.data?.data);
      props.setForwardLookingAllocationDetailsLoader(false);
    } catch (e) {
      props.setForwardLookingAllocationDetailsData([]);
      props.setForwardLookingAllocationDetailsLoader(false);
      props.displaySnackMessages(ERROR_MESSAGE, "error");
    }
  };

  const fetchFLAProductViewData = async () => {
    try {
      props.setForwardLookingAllocationProductViewLoader(true);
      let body = {
        filters: filterDependencyRef.current.filter(
          (item) => item.attribute_name !== "dc_out_of_stock"
        ),
      };
      let response = await props.getForwardLookingAllocationProductViewData(
        body
      );
      props.setForwardLookingAllocationProductViewData(response.data?.data);
      props.setForwardLookingAllocationProductViewLoader(false);
    } catch (e) {
      props.setForwardLookingAllocationProductViewData([]);
      props.setForwardLookingAllocationProductViewLoader(false);
      props.displaySnackMessages(ERROR_MESSAGE, "error");
    }
  };

  return (
    <div>
      <Loader loader={props.forwardLookingAllocationSummaryLoader}>
        <div className={globalClasses.marginHorizontal}>
          <Typography variant="h5" className={globalClasses.paddingVertical}>
            Summary
          </Typography>
          <AgGridComponent
            rowdata={summaryDataFLA}
            columns={forwardLookingAllocationSummaryCol}
            uniqueRowId={"key"}
            downloadAsExcel={true}
            disableExcelDownload={summaryDataFLA?.length ? false : true}
            toPrependContent={props.excelDownloadMetaData}
            prependedContentDetails={prependData()}
            pagination={!props.inventorysmartScreenConfigForInfiniteScrolling?.includes("RFLASummary")}
          />
        </div>
      </Loader>

      <Loader loader={props.forwardLookingAllocationProductViewLoader}>
        <div className={globalClasses.marginHorizontal}>
          <Typography variant="h5" className={globalClasses.paddingVertical}>
            Product Hierarchy View
          </Typography>
          <AgGridComponent
            columns={forwardLookingAllocationProductViewCol}
            rowdata={productViewDataFLA}
            uniqueRowId={"key"}
            downloadAsExcel={true}
            disableExcelDownload={productViewDataFLA?.length ? false : true}
            toPrependContent={props.excelDownloadMetaData}
            prependedContentDetails={prependData()}
            pagination={!props.inventorysmartScreenConfigForInfiniteScrolling?.includes("MPCreateProductProfileSelectProduct")}
          />
        </div>
      </Loader>

      <Loader loader={props.forwardLookingAllocationDetailsLoader}>
        <div className={globalClasses.marginHorizontal}>
          <Typography variant="h5" className={globalClasses.paddingVertical}>
            Detailed View
          </Typography>
          <AgGridComponent
            columns={forwardLookingAllocationDetailsCol}
            rowdata={detailsDataFLA}
            uniqueRowId={"key"}
            downloadAsExcel={true}
            disableExcelDownload={detailsDataFLA?.length ? false : true}
            toPrependContent={props.excelDownloadMetaData}
            prependedContentDetails={prependData()}
            pagination={!props.inventorysmartScreenConfigForInfiniteScrolling?.includes("RFLADetailedView")}
          />
        </div>
      </Loader>
    </div>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer } = store;
  return {
    inventorysmartScreenConfigForInfiniteScrolling:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfigForInfiniteScrolling,
    forwardLookingAllocationSummaryLoader:
      inventorysmartReducer.inventorySmartForwardLookingAllocationService
        .forwardLookingAllocationSummaryLoader,
    forwardLookingAllocationDetailsLoader:
      inventorysmartReducer.inventorySmartForwardLookingAllocationService
        .forwardLookingAllocationDetailsLoader,
    forwardLookingAllocationDetailsData:
      inventorysmartReducer.inventorySmartForwardLookingAllocationService
        .forwardLookingAllocationDetailsData,
    forwardLookingAllocationSummaryData:
      inventorysmartReducer.inventorySmartForwardLookingAllocationService
        .forwardLookingAllocationSummaryData,
    excelDownloadMetaData:
      inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig?.excelDownloadMetaData,
    forwardLookingAllocationProductViewData:
      inventorysmartReducer.inventorySmartForwardLookingAllocationService
        .forwardLookingAllocationProductViewData,
    forwardLookingAllocationProductViewLoader:
      inventorysmartReducer.inventorySmartForwardLookingAllocationService
        .forwardLookingAllocationProductViewLoader,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    setForwardLookingAllocationSummaryLoader: (body) =>
      dispatch(setForwardLookingAllocationSummaryLoader(body)),
    setForwardLookingAllocationSummaryData: (body) =>
      dispatch(setForwardLookingAllocationSummaryData(body)),
    setForwardLookingAllocationDetailsLoader: (body) =>
      dispatch(setForwardLookingAllocationDetailsLoader(body)),
    setForwardLookingAllocationDetailsData: (body) =>
      dispatch(setForwardLookingAllocationDetailsData(body)),
    getForwardLookingAllocationSummaryData: (body) =>
      dispatch(getForwardLookingAllocationSummaryData(body)),
    getForwardLookingAllocationDetailsData: (body) =>
      dispatch(getForwardLookingAllocationDetailsData(body)),
    getForwardLookingAllocationProductViewData: (body) =>
      dispatch(getForwardLookingAllocationProductViewData(body)),
    setForwardLookingAllocationProductViewData: (body) =>
      dispatch(setForwardLookingAllocationProductViewData(body)),
    setForwardLookingAllocationProductViewLoader: (body) =>
      dispatch(setForwardLookingAllocationProductViewLoader(body)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ForwardLookingTableComponent);
