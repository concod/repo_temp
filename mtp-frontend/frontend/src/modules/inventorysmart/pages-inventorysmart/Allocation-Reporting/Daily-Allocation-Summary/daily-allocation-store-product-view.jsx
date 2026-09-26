import React, { useState, useEffect, useRef } from "react";
import { connect } from "react-redux";

import makeStyles from "@mui/styles/makeStyles";
import { Typography } from "@mui/material";
import moment from "moment";

import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import globalStyles from "core/Styles/globalStyles";
import { getColumnsAg } from "core/actions/tableColumnActions";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";
import {
  setDailyAllocationScreenLoader,
  getDailyAllocationArticleToStore,
  getDailyAllocationStoreToArticle,
} from "../../../services-inventorysmart/Allocation-Reports/daily-allocation-service";
import { ERROR_MESSAGE } from "../../../constants-inventorysmart/stringConstants";
import { scrollIntoView } from "../../inventorysmart-utility";
import { cloneDeep } from "lodash";

const useStyles = makeStyles((theme) => ({
  viewTableWidth: {
    margin: "1rem auto",
    // 4 columns of 200px width = 4 * 200 + 30 buffer
    width: theme.typography.pxToRem(830),
  },
}));

const DailyAllocationStoreProductView = (props) => {
  const [articleToStoreViewColumns, setArticleToStoreViewColumns] = useState(
    []
  );
  const [articleToStoreViewData, setArticleToStoreViewData] = useState([]);
  const [storeToArticleViewColumns, setStoreToArticleViewColumns] = useState(
    []
  );
  const [storeToArticleViewData, setStoreToArticleViewData] = useState([]);
  const [subStoreSplitColumns, setSubStoreSplitColumns] = useState([]);
  const [subStoreSplitData, setSubStoreSplitData] = useState([]);

  const [viewSubStoreSplit, setViewSubStoreSplit] = useState(false);
  const [storeViewArticle, setStoreViewArticle] = useState("");

  const classes = useStyles();
  const globalClasses = globalStyles();
  const articleToStoreRef = useRef();
  const storeToArticleRef = useRef();
  const articleStoreViewRef = useRef();

  useEffect(() => {
    if (props.productStore.productStore === "product" && props.selectedId) {
      const fetchStoreView = async () => {
        try {
          setViewSubStoreSplit(false);
          props.setDailyAllocationScreenLoader(true);
          let articleFilterVal = generateFilterFormat(
            props.selectedId,
            "product",
            "article"
          );
          let storeReqBody = {
            date: props.selectedDate.datePicker,
            filters: [
              ...props.dailyAllocationSelectedFilters,
              articleFilterVal,
            ],
          };
          let response = await props.getDailyAllocationArticleToStore(
            storeReqBody
          );
          let col = agGridColumnFormatter(
            cloneDeep(response.data.data.columns)
          );
          setArticleToStoreViewColumns(col);
          setArticleToStoreViewData(response.data.data.table_data);
          props.setDailyAllocationScreenLoader(false);
        } catch (e) {
          props.setDailyAllocationScreenLoader(false);
          props.displaySnackMessages(ERROR_MESSAGE, "error");
        }
      };
      fetchStoreView();
      scrollIntoView(articleToStoreRef);
    }
    if (props.productStore.productStore === "store" && props.selectedStore) {
      (async () => {
        try {
          setViewSubStoreSplit(false);
          props.setDailyAllocationScreenLoader(true);
          let col = await getColumnsAg(
            "table_name=inventory_daily_allocation_article_list",
            null,
            fetchStoreSplitBasedOnArticle
          )();
          setStoreToArticleViewColumns(col);

          let articleReqBody = {
            date: props.selectedDate.datePicker,
            store_code: props.selectedStore,
            filters: [...props.dailyAllocationSelectedFilters],
          };
          let response = await props.getDailyAllocationStoreToArticle(
            articleReqBody
          );
          setStoreToArticleViewData(response.data.data);
          props.setDailyAllocationScreenLoader(false);
        } catch (e) {
          props.setDailyAllocationScreenLoader(false);
          props.displaySnackMessages(ERROR_MESSAGE, "error");
        }
      })();
      scrollIntoView(storeToArticleRef);
    }
  }, [
    props.selectedId,
    props.selectedStore,
    props.productStore,
    props.selectedDate,
  ]);

  const viewStoreSplitDetails = async (data) => {
    // fetch the article num from data and store it in a state
    setStoreViewArticle(data.article);
    setViewSubStoreSplit(true);
    try {
      // new api to be created which takes in store and article
      props.setDailyAllocationScreenLoader(true);
      let articleFilterVal = generateFilterFormat(
        data.article,
        "product",
        "article"
      );
      let storeCodeFilterVal = generateFilterFormat(
        props.selectedStore,
        "store",
        "store_code"
      );

      let storeReqBody = {
        date: props.selectedDate.datePicker,
        filters: [
          ...props.dailyAllocationSelectedFilters,
          articleFilterVal,
          storeCodeFilterVal,
        ],
      };
      let response = await props.getDailyAllocationArticleToStore(storeReqBody);
      let col = agGridColumnFormatter(cloneDeep(response.data.data?.columns));
      setSubStoreSplitColumns(col);
      setSubStoreSplitData(response.data.data?.table_data);
      props.setDailyAllocationScreenLoader(false);
    } catch (e) {
      props.setDailyAllocationScreenLoader(false);
      props.displaySnackMessages(ERROR_MESSAGE, "error");
    }
    scrollIntoView(articleStoreViewRef);
  };

  const generateFilterFormat = (val, dimension, attr_name) => {
    return {
      filter_id: attr_name,
      attribute_name: attr_name,
      operator: "in",
      dimension: dimension,
      values: [val],
      filter_type: "cascaded",
    };
  };

  const fetchStoreSplitBasedOnArticle = {
    article: viewStoreSplitDetails,
  };

  return (
    <div className={globalClasses.marginVertical1rem}>
      <Typography variant="h5" className={globalClasses.paperHeader}>
        {props.productStore.productStore === "product"
          ? `${dynamicLabelsBasedOnTenant("style_color")}  - ${
              props.selectedId
            }`
          : `${dynamicLabelsBasedOnTenant("store_number")} - ${
              props.selectedStoreId
                ? props.selectedStoreId
                : props.selectedStore
            }`}
      </Typography>
      {props.productStore.productStore === "product" && (
        <div className={classes.viewTableWidth} ref={articleToStoreRef}>
          <AgGridComponent
            rowdata={articleToStoreViewData}
            columns={articleToStoreViewColumns}
            downloadAsExcel
            disableExcelDownload={articleToStoreViewData.length ? false : true}
            uniqueRowId={"key"}
            pagination={false}
          />
        </div>
      )}
      {props.productStore.productStore === "store" && (
        <div ref={storeToArticleRef}>
          <AgGridComponent
            rowdata={storeToArticleViewData}
            columns={storeToArticleViewColumns}
            downloadAsExcel
            disableExcelDownload={storeToArticleViewData.length ? false : true}
            uniqueRowId={"key"}
          />
        </div>
      )}
      {props.productStore.productStore === "store" && viewSubStoreSplit && (
        <div className={globalClasses.marginVertical1rem}>
          <Typography variant="h5" className={globalClasses.paperHeader}>
            {dynamicLabelsBasedOnTenant("store_number")} -{" "}
            {props.selectedStoreId
              ? props.selectedStoreId
              : props.selectedStore}
            , {dynamicLabelsBasedOnTenant("style_color")} - {storeViewArticle}
          </Typography>
          <div className={classes.viewTableWidth} ref={articleStoreViewRef}>
            <AgGridComponent
              rowdata={subStoreSplitData}
              columns={subStoreSplitColumns}
              downloadAsExcel
              disableExcelDownload={subStoreSplitData.length ? false : true}
              uniqueRowId={"key"}
              pagination={false}
            />
          </div>
        </div>
      )}
    </div>
  );
};

const mapDispatchToProps = (dispatch) => {
  return {
    setDailyAllocationScreenLoader: (body) =>
      dispatch(setDailyAllocationScreenLoader(body)),
    getDailyAllocationArticleToStore: (body) =>
      dispatch(getDailyAllocationArticleToStore(body)),
    getDailyAllocationStoreToArticle: (body) =>
      dispatch(getDailyAllocationStoreToArticle(body)),
  };
};

export default connect("", mapDispatchToProps)(DailyAllocationStoreProductView);
