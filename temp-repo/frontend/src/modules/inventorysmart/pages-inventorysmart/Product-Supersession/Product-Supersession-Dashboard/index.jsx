import { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import globalStyles from "core/Styles/globalStyles";

import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import CustomAccordion from "core/commonComponents/Custom-Accordian";
import {
  CACHE_BLOCKSIZE_STRATEGY,
  defaultTableData,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import Loader from "core/Utils/Loader/loader";
import { isEmpty } from "lodash";
import {
  getProductSupersessionSummaryData,
  getProductSupersessionSummaryTableConfig,
  setInventorysmartProductSupersessionSummaryLoader,
  setInventorysmartProductSupersessionTableLoader,
} from "modules/inventorysmart/services-inventorysmart/Product-Supersession/product-supersession-summary-service";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import ReviewSKULevelMappingViewPopup from "../Create-New-Product-Mapping/components/ReviewSKULevelMappingViewPopup";
import DownloadButton from "../../StoreInventoryAlerts/components/Download";
import { SUPERSESSION_DOWNLOAD_LINK } from "modules/inventorysmart/constants-inventorysmart/apiConstants";

const ProductSupersessionDashboard = function (props) {
  const globalClasses = globalStyles();
  const agGridInstance = useRef(null);

  const [render, setRender] = useState(false);
  const [
    productsSupersessionSummaryColumnConfig,
    setProductsSupersessionSummaryColumnConfig,
  ] = useState([]);
  const [sizeMappingData, setSizeMappingData] = useState(null);
  const [
    openProductMappingViewOnlyDialog,
    setOpenProductMappingViewOnlyDialog,
  ] = useState(false);

  const openProductMappingViewOnlyPopUp = () => {
    setOpenProductMappingViewOnlyDialog(true);
  };

  const closeProductMappingViewOnlyPopUp = () => {
    setSizeMappingData(null);
    setOpenProductMappingViewOnlyDialog(false);
  };

  const editSKULevelMapping = () => {
    closeProductMappingViewOnlyPopUp();
    props.editSKULevelMapping(true);
  };

  const toggleReviewSKULevelMappingPopup = (data) => {
    setSizeMappingData(data);
    openProductMappingViewOnlyPopUp();
  };

  const reviewSKULevelMappingActionMap = {
    mapped_sizes: toggleReviewSKULevelMappingPopup,
  };

  const onSelectionChanged = (event) => {
    // fetch all selected rows
    let selections = event.api.getSelectedRows();
    props.setSelectedProductMappings([...selections]);
  };

  const formatProductSupersessionSummary = (data) => {
    const formattedData = data?.map((mapping, index) => {
      const sizesLength = mapping?.new_sizes?.length;
      mapping.mapped_sizes = sizesLength;
      mapping.index = index;
      mapping.new_product_code = [...mapping.new_product_codes];
      mapping.old_product_code = [...mapping.old_product_codes];
      mapping.new_size = [...mapping.new_sizes];
      mapping.old_size = [...mapping.old_sizes];
      return mapping;
    });

    return formattedData;
  };

  const fetchProductSupersessionSummaryTableConfig = async () => {
    try {
      props.setInventorysmartProductSupersessionTableLoader(true);
      const payload = {
        tableConfigName: "product-supersession-summary",
      };
      let response = await props.getProductSupersessionSummaryTableConfig(
        payload
      );

      let formattedColumns = agGridColumnFormatter(
        response?.data?.data,
        null,
        reviewSKULevelMappingActionMap
      );
      setProductsSupersessionSummaryColumnConfig(formattedColumns);
      setRender(true);
    } finally {
      props.setInventorysmartProductSupersessionTableLoader(false);
    }
  };

  const manualCallBack = async (manualbody, pageIndex, params) => {
    try {
      props.setInventorysmartProductSupersessionSummaryLoader(true);

      let body = {
        filters: props.selectedFilters?.filter(
          (filterItem) => filterItem?.values?.length > 0
        ),
        meta: {
          ...manualbody,
          limit: { limit: CACHE_BLOCKSIZE_STRATEGY, page: pageIndex + 1 },
        },
      };

      let response = await props.getProductSupersessionSummaryData(body);
      let mappedProductSupersessionSummary = formatProductSupersessionSummary(
        response?.data?.data
      );
      let formattedData = agGridRowFormatter(
        mappedProductSupersessionSummary,
        params?.api?.checkConfiguration,
        "index"
      );
      return {
        data: formattedData,
      };
    } catch {
      return defaultTableData;
    } finally {
      props.setInventorysmartProductSupersessionSummaryLoader(false);
    }
  };

  const getDownloadRequestBody = () => {
    let filters = props.selectedFilters?.filter(
      (filterItem) => filterItem?.values?.length > 0
    );

    const payload = {
      filters,
      table_config: [...productsSupersessionSummaryColumnConfig],
    };
    return payload;
  };

  const loadAlertsTableInstance = (params) => {
    agGridInstance.current = params;
  };

  useEffect(() => {
    if (!isEmpty(props.selectedFilters)) {
      setRender(false);
      fetchProductSupersessionSummaryTableConfig();
    }
  }, [props.selectedFilters]);

  return (
    <div className={globalClasses.marginVertical1rem}>
      <CustomAccordion label="Details">
        <Loader
          loader={
            props.inventorysmartProductSupersessionTableLoader ||
            props.inventorysmartProductSupersessionSummaryLoader
          }
          minHeight={"188px"}
        >
          <DownloadButton
            url={SUPERSESSION_DOWNLOAD_LINK}
            requestBody={getDownloadRequestBody()}
            disable={
              props.inventorysmartProductSupersessionSummaryLoaderinventorysmartProductSupersessionSummaryLoader
            }
            includeExclusionFilter={props.includeExclusionFilter}
            excludeURLObject={props.excludeURLObject}
          />
          {render && (
            <AgGridComponent
              columns={productsSupersessionSummaryColumnConfig}
              manualCallBack={(body, pageIndex, params) =>
                manualCallBack(body, pageIndex, params)
              }
              uniqueRowId={"index"}
              selectAllHeaderComponent
              rowSelection="multiple"
              rowModelType="serverSide"
              serverSideStoreType="partial"
              onRowSelected
              cacheBlockSize={CACHE_BLOCKSIZE_STRATEGY}
              onSelectionChanged={onSelectionChanged}
              loadTableInstance={loadAlertsTableInstance}
              pagination={true}
            />
          )}
        </Loader>
      </CustomAccordion>

      <ReviewSKULevelMappingViewPopup
        active={openProductMappingViewOnlyDialog}
        openModal={openProductMappingViewOnlyPopUp}
        closeModal={closeProductMappingViewOnlyPopUp}
        sizeMappingData={sizeMappingData}
        editSKULevelMapping={editSKULevelMapping}
      />
    </div>
  );
};

const mapStateToProps = (store) => {
  return {
    selectedFilters:
      store.inventorysmartReducer.inventorySmartProductSupersessionService
        .selectedFilters,
    inventorysmartScreenConfig:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
    inventorysmartProductSupersessionTableLoader:
      store.inventorysmartReducer
        .inventorySmartProductSupersessionSummaryService
        .inventorysmartProductSupersessionTableLoader,
    inventorysmartProductSupersessionSummaryLoader:
      store.inventorysmartReducer
        .inventorySmartProductSupersessionSummaryService
        .inventorysmartProductSupersessionSummaryLoader,
    dynamicLabels:
      store.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.dynamicLabels,
  };
};

const mapDispatchToProps = (dispatch) => ({
  setInventorysmartProductSupersessionSummaryLoader: (payload) =>
    dispatch(setInventorysmartProductSupersessionSummaryLoader(payload)),
  setInventorysmartProductSupersessionTableLoader: (payload) =>
    dispatch(setInventorysmartProductSupersessionTableLoader(payload)),
  getProductSupersessionSummaryTableConfig: (payload) =>
    dispatch(getProductSupersessionSummaryTableConfig(payload)),
  getProductSupersessionSummaryData: (payload) =>
    dispatch(getProductSupersessionSummaryData(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ProductSupersessionDashboard);
