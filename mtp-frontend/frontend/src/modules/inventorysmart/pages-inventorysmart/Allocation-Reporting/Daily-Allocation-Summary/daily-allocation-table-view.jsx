import React, { useState, useEffect } from "react";
import { connect } from "react-redux";

import moment from "moment";
import Form from "core/Utils/form";
import AgGridComponent from "core/Utils/agGrid";
import { getColumnsAg } from "core/actions/tableColumnActions";

import {
  getDailyAllocationStoreTableData,
  getDailyAllocationTableData,
  setDailyAllocationTableData,
  setDailyAllocationScreenLoader,
} from "../../../services-inventorysmart/Allocation-Reports/daily-allocation-service";
import {
  DAILY_ALLOCATION_VIEW_TYPE,
  ERROR_MESSAGE,
  tableConfigurationMetaData,
  datePickerConstant,
} from "../../../constants-inventorysmart/stringConstants";
import DailyAllocationStoreProductView from "./daily-allocation-store-product-view";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";
import { cloneDeep, isEmpty } from "lodash";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";

const DailyAllocationTableView = (props) => {
  const [
    dailyAllocationProductViewColumns,
    setDailyAllocationProductViewColumns,
  ] = useState([]);
  const [dailyAllocationStoreViewColumns, setDailyAllocationStoreViewColumns] =
    useState([]);

  const [dailyAllocationProductViewData, setDailyAllocationProductViewData] =
    useState([]);
  const [dailyAllocationStoreViewData, setDailyAllocationStoreViewData] =
    useState([]);

  const [enableStoreViewSplit, setEnableStoreViewSplit] = useState(false);
  const [styleColorId, setStyleColorId] = useState("");
  const [storeCode, setStoreCode] = useState("");
  const [storeId, setStoreId] = useState("");

  const [productStore, setProductStore] = useState({ productStore: "product" });
  const [formConfig, setFormConfig] = useState([]);

  const viewStoreSplitDetails = (data) => {
    setEnableStoreViewSplit(true);
    setStyleColorId(data.article);
  };

  const viewProductSplitDetails = (data) => {
    setEnableStoreViewSplit(true);
    setStoreCode(data.store_code);
  };

  const viewProductIdSplitDetails = (data) => {
    setEnableStoreViewSplit(true);
    setStoreCode(data.store_code);
    setStoreId(data.store_id);
  };

  const dailyAllocationProductViewAction = {
    article: viewStoreSplitDetails,
  };

  const dailyAllocationStoreViewAction = {
    store_code: viewProductSplitDetails,
  };

  const dailyAllocationStoreIdViewAction = {
    store_id: viewProductIdSplitDetails,
  };

  useEffect(() => {
    if (!isEmpty(props.dynamicLabels)) {
      let clonedFormFieldConfig = cloneDeep(DAILY_ALLOCATION_VIEW_TYPE);
      clonedFormFieldConfig[0].options[0].label =
        dynamicLabelsBasedOnTenant("article");
      setFormConfig(clonedFormFieldConfig);
    }
  }, [props.dynamicLabels]);

  useEffect(() => {
    setEnableStoreViewSplit(false);
    setStyleColorId("");
    setStoreCode("");
    if (!isEmpty(props.dailyAllocationSelectedFilters)) {
      if (productStore.productStore === "product") {
        (async () => {
          try {
            props.setDailyAllocationScreenLoader(true);
            let col = await getColumnsAg(
              "table_name=inventory_daily_allocation_article_list",
              null,
              dailyAllocationProductViewAction
            )();
            setDailyAllocationProductViewColumns(col);
            let reqBody = {
              date: props.selectedDate.datePicker,
              meta: tableConfigurationMetaData.meta,
              filters: props.dailyAllocationSelectedFilters,
            };
            let response = await props.getDailyAllocationTableData(reqBody);
            const productViewData = response.data.data;
            const productViewDataClone = cloneDeep(response.data.data);
            props.setDailyAllocationTableData(productViewData);
            setDailyAllocationProductViewData(productViewDataClone?.table_data);
            props.setDailyAllocationScreenLoader(false);
          } catch (e) {
            props.setDailyAllocationScreenLoader(false);
            props.displaySnackMessages(ERROR_MESSAGE, "error");
          }
        })();
      } else {
        (async () => {
          try {
            props.setDailyAllocationScreenLoader(true);
            let col = await getColumnsAg(
              "table_name=inventory_daily_allocation_store_list",
              null,
              props.storeIDConfig
                ?.inventorysmart_store_stock_drill_down_popup_value_key ===
                "store_id"
                ? dailyAllocationStoreIdViewAction
                : dailyAllocationStoreViewAction
            )();
            setDailyAllocationStoreViewColumns(col);

            let reqBody = {
              date: props.selectedDate.datePicker,
              filters: props.dailyAllocationSelectedFilters,
            };
            let response = await props.getDailyAllocationStoreTableData(
              reqBody
            );
            setDailyAllocationStoreViewData(response.data.data?.table_data);
            props.setDailyAllocationScreenLoader(false);
          } catch (e) {
            props.setDailyAllocationScreenLoader(false);
            props.displaySnackMessages(ERROR_MESSAGE, "error");
          }
        })();
      }
    }
  }, [productStore, props.dailyAllocationSelectedFilters, props.dynamicLabels]);

  const handleChangeDailyAllocationView = (updatedFormData) => {
    setProductStore(updatedFormData);
  };

  const prependData = () => {
    if (!isEmpty(downloadFormatChipsDependency)) {
      let l_downloadFormatChipsDependency = cloneDeep(downloadFormatChipsDependency);
      l_downloadFormatChipsDependency.product.value = downloadFormatChipsDependency.product.value.map((str)=> replaceSpecialCharacter(str ));
      let prependContentReq = prependExtraData(l_downloadFormatChipsDependency);
      return appendExcelDownloadData(prependContentReq);
    }
  };

  useEffect(() => {
    if (props.appliedFilterData?.dependencyData?.length) {
      let filterChips = fetchFilterChipsToDownload(
        props.appliedFilterData?.dependencyData
      );
      setDownloadFormatChipsDependency(filterChips);
    }
  }, [props.appliedFilterData]);

  return (
    <>
      <Form
        layout={"vertical"}
        maxFieldsInRow={2}
        handleChange={handleChangeDailyAllocationView}
        fields={formConfig}
        updateDefaultValue={false}
        defaultValues={productStore}
        labelWidthSpan={5}
        fieldTypeWidthSpan={2}
      ></Form>
      {productStore.productStore === "product" && (
        <AgGridComponent
          downloadAsExcel
          disableExcelDownload={
            dailyAllocationProductViewData.length ? false : true
          }
          rowdata={dailyAllocationProductViewData}
          columns={dailyAllocationProductViewColumns}
          uniqueRowId={"key"}
          pagination={
            !props.inventorysmartScreenConfigForInfiniteScrolling?.includes(
              "RDASMaterial"
            )
          }
        />
      )}
      {productStore.productStore === "store" && (
        <AgGridComponent
          downloadAsExcel
          disableExcelDownload={
            dailyAllocationStoreViewData.length ? false : true
          }
          rowdata={dailyAllocationStoreViewData}
          columns={dailyAllocationStoreViewColumns}
          uniqueRowId={"store_code"}
          sizeColumnsToFitFlag
          pagination={false}
        />
      )}

      {enableStoreViewSplit && (
        <DailyAllocationStoreProductView
          selectedId={styleColorId}
          selectedStore={storeCode}
          productStore={productStore}
          setDailyAllocationScreenLoader={props.setDailyAllocationScreenLoader}
          displaySnackMessages={props.displaySnackMessages}
          dailyAllocationSelectedFilters={props.dailyAllocationSelectedFilters}
          selectedDate={props.selectedDate}
          selectedStoreId={storeId}
        />
      )}
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    inventorysmartScreenConfigForInfiniteScrolling:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfigForInfiniteScrolling,
    dynamicLabels:
      store.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.dynamicLabels,
    storeIDConfig:
      store.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    getDailyAllocationStoreTableData: (body) =>
      dispatch(getDailyAllocationStoreTableData(body)),
    getDailyAllocationTableData: (body) =>
      dispatch(getDailyAllocationTableData(body)),
    setDailyAllocationTableData: (body) =>
      dispatch(setDailyAllocationTableData(body)),
    setDailyAllocationScreenLoader: (body) =>
      dispatch(setDailyAllocationScreenLoader(body)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(DailyAllocationTableView);
