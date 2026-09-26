import React, { useState, useEffect, useRef } from "react";
import { connect } from "react-redux";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import Loader from "core/Utils/Loader/loader";
import { setInventorysmartReviewSizeMappingTableLoader } from "modules/inventorysmart/services-inventorysmart/Product-Supersession/product-supersession-review-mapping-service";
import { getProductSupersessionSummaryTableConfig } from "modules/inventorysmart/services-inventorysmart/Product-Supersession/product-supersession-summary-service";
import { isEmpty } from "lodash";
import { BottomSheet, Button } from "impact-ui-v3";
import { isNullCode, sizesMatch } from "modules/inventorysmart/pages-inventorysmart/Product-Supersession/utils/sizeMappingPopupUtils";
import {
  getBottomSheetGridProps,
  getBottomSheetModalHeight,
  BottomSheetFooter,
  bottomSheetGridContentStyle,
} from "modules/inventorysmart/utils-inventorysmart/utilityFunctions";

const ReviewSKULevelMappingView = (props) => {
  const agGridInstance = useRef(null);

  const [
    productsMappingReviewPopupColumnConfig,
    setProductsMappingReviewPopupColumnConfig,
  ] = useState([]);
  const [
    productsMappingReviewPopupData,
    setProductsMappingReviewPopupData,
  ] = useState([]);

  const fetchProductMappingPopupData = () => {
    const mapping = props.sizeMappingData || {};
    const oldAllCodes = mapping.old_product_code_all?.length
      ? mapping.old_product_code_all
      : mapping.old_product_code || [];
    const oldAllSizes = mapping.old_size_all?.length
      ? mapping.old_size_all
      : mapping.old_size || [];
    const oldAllSizeNames = mapping.old_size_name_all?.length
      ? mapping.old_size_name_all
      : mapping.old_size_name || mapping.old_size_names || [];
    const mappedOldCodes = mapping.old_product_code || [];
    const mappedNewCodes = mapping.new_product_code || [];
    const mappedNewSizes = mapping.new_size || [];
    const mappedNewSizeNames =
      mapping.new_size_name || mapping.new_size_names || [];
    const allNewCodes = mapping.new_product_code_all || [];
    const allNewSizeNames = mapping.new_size_name_all || [];

    const data = oldAllCodes
      .map((oldProductCode, index) => {
        if (isNullCode(oldProductCode)) return null;

        const mappedIndex = mappedOldCodes.findIndex((code) =>
          sizesMatch(code, oldProductCode)
        );
        const isMapped =
          mappedIndex > -1 && !isNullCode(mappedNewCodes[mappedIndex]);
        const newProductCode = isMapped
          ? mappedNewCodes[mappedIndex]
          : "-";
        const newSize = isMapped ? mappedNewSizes[mappedIndex] ?? "-" : "-";
        const newSizeFromAll = isMapped
          ? allNewCodes.findIndex((code) => sizesMatch(code, newProductCode))
          : -1;
        const newSizeName = isMapped
          ? mappedNewSizeNames[mappedIndex] ||
            (newSizeFromAll > -1 ? allNewSizeNames[newSizeFromAll] : "") ||
            "-"
          : "-";

        return {
          ...mapping,
          index,
          old_product_code: oldProductCode,
          old_style_size: oldAllSizes[index] ?? "",
          old_size_name: oldAllSizeNames[index] ?? "",
          old_article: mapping.old_article,
          new_product_code: newProductCode,
          new_style_size: newSize,
          new_size_name: newSizeName,
          new_article: mapping.new_article,
          new_upc_orig: isMapped ? mapping.new_upc_orig?.[mappedIndex] : "-",
          old_upc_orig: isMapped
            ? mapping.old_upc_orig?.[mappedIndex]
            : mapping.old_upc_orig?.[index] ?? "-",
          new_article_orig: isMapped
            ? mapping.new_article_orig?.[mappedIndex]
            : "-",
          old_article_orig: isMapped
            ? mapping.old_article_orig?.[mappedIndex]
            : mapping.old_article_orig?.[index] ?? "-",
        };
      })
      .filter(Boolean);

    setProductsMappingReviewPopupData(data);
  };

  const fetchProductMappingPopupTableConfig = async () => {
    try {
      props.setInventorysmartReviewSizeMappingTableLoader(true);      
      let payload = {
        tableConfigName: "product_supersession_size_mapping_view",
      };
      if(props?.inventoryProductSupersessionFilterConfig?.is_ootb && props?.isEditAllowed) {
        payload = {
          tableConfigName: "product_supersession_creation_sku_mapping_view",
        };
      }
      let response = await props.getProductSupersessionSummaryTableConfig(
        payload
      );

      let formattedColumns = agGridColumnFormatter(response?.data?.data);
      setProductsMappingReviewPopupColumnConfig(formattedColumns);
    } finally {
      props.setInventorysmartReviewSizeMappingTableLoader(false);
    }
  };

  const resetProductMappingPopupData = () => {
    setProductsMappingReviewPopupColumnConfig([]);
    setProductsMappingReviewPopupData([]);
  };

  useEffect(() => {
    if (props.active && !isEmpty(props.sizeMappingData)) {
      fetchProductMappingPopupTableConfig();
      fetchProductMappingPopupData();
    } else {
      resetProductMappingPopupData();
    }
  }, [props.active, props.sizeMappingData]);

  const loadAlertsTableInstance = (params) => {
    agGridInstance.current = params;
  };

  const mappingRowCount = productsMappingReviewPopupData?.length;
  const mappingSheetHeight = getBottomSheetModalHeight(mappingRowCount);

  return props.active ? (
    <BottomSheet
      open={props.active}
      onClose={(_event, reason) => {
        if (reason === "backdropClick") {
          return;
        }
        props.closeModal();
      }}
      title={props?.isEditAllowed ? "Edit Mapping" : "Mappings"}
      withExpandIcon={false}
      maxHeight="calc(100vh - 64px)"
      {...(mappingSheetHeight ? { height: mappingSheetHeight } : {})}
      footerOptions={
        <BottomSheetFooter
          onCancel={() => props.closeModal()}
          primaryButton={
            props?.isEditAllowed ? (
              <Button
                variant="primary"
                disabled={!props?.isEditAllowed}
                onClick={() => props.editSKULevelMapping()}
              >
                Edit Mapping
              </Button>
            ) : null
          }
        />
      }
    >
      <div style={bottomSheetGridContentStyle}>
        <Loader
          loader={props.inventorysmartReviewSizeMappingTableLoader}
          minHeight="0"
        >
          {productsMappingReviewPopupColumnConfig?.length > 0 && (
            <AgGridComponent
              columns={productsMappingReviewPopupColumnConfig}
              rowdata={productsMappingReviewPopupData}
              uniqueRowId={"index"}
              pagination={false}
              cardContainer={false}
              hideTableSetting
              {...getBottomSheetGridProps(mappingRowCount)}
              loadTableInstance={loadAlertsTableInstance}
            />
          )}
        </Loader>
      </div>
    </BottomSheet>
  ) : null; 
};

const mapStateToProps = (store) => {
  return {
    inventorysmartReviewSizeMappingTableLoader:
      store.inventorysmartReducer
        .inventorySmartProductSupersessionReviewMappingService
        .inventorysmartReviewSizeMappingTableLoader,
    inventoryProductSupersessionFilterConfig:
      store.inventorysmartReducer.inventorySmartProductSupersessionService
        .inventoryProductSupersessionFilterConfig,
  };
};

const mapDispatchToProps = (dispatch) => ({
  setInventorysmartReviewSizeMappingTableLoader: (payload) =>
    dispatch(setInventorysmartReviewSizeMappingTableLoader(payload)),
  getProductSupersessionSummaryTableConfig: (payload) =>
    dispatch(getProductSupersessionSummaryTableConfig(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ReviewSKULevelMappingView);
