import React, { useState, useEffect, useRef } from "react";
import { connect } from "react-redux";
import { cloneDeep, isEmpty } from "lodash";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import globalStyles from "core/Styles/globalStyles";
import {
  appendExcelDownloadData,
  fetchFilterChipsToDownload,
  prependExtraData,
} from "core/Utils/agGrid/table-functions";
import { setNewProductProfileLoader } from "../../../services-inventorysmart/Product-Profile/create-product-profile-service";
import { scrollIntoView } from "../../inventorysmart-utility";
import {
  NO_TABLE_DATA_MESSAGE,
  PRODUCT_PROFILE_CACHE,
} from "../../../constants-inventorysmart/stringConstants";

const StorePriceContributionComponent = (props) => {
  const [
    storePriceContributionColumn,
    setStorePriceContributionColumn,
  ] = useState([]);
  const [storePriceContributionData, setStorePriceContributionData] = useState(
    []
  );
  const [pinnedRow, setPinnedRow] = useState([]);
  const storePriceContributionRef = useRef();
  const [
    downloadFormatChipsDependency,
    setDownloadFormatChipsDependency,
  ] = useState({});

  const globalClasses = globalStyles();
  const configDetails = props.cache?.[PRODUCT_PROFILE_CACHE]?.["PP-CONFIGS"];
  const hidePinnedRow =
    configDetails?.ia_recommended_product_profile?.hidePinnedRowInCustomerGroup; // tp uncomment later

  const storeHeaderValue = props.dynamicLabels?.store
    ? props.dynamicLabels?.store
    : "Store";

  useEffect(() => {
    (async () => {
      props.setNewProductProfileLoader(true);
      if (!isEmpty(props.listOfProductsPenetrationValue)) {
        let copyOfStoreSizeContributionData = cloneDeep(
          props.listOfProductsPenetrationValue?.columns
        );
        let penetrationColDef = agGridColumnFormatter(
          copyOfStoreSizeContributionData
        );
        setStorePriceContributionColumn(penetrationColDef);
        let sortedRows = cloneDeep(
          props.listOfProductsPenetrationValue?.data
        )?.sort((a, b) => b.overall_proportion - a.overall_proportion);
        const index = sortedRows.findIndex((obj) => obj.store_name === "Total");
        if (index !== -1) {
          let toPin = sortedRows.splice(index, 1);
          setPinnedRow(toPin);
        }
        setStorePriceContributionData(sortedRows);
        scrollIntoView(storePriceContributionRef);
      }
    })();
  }, [props.listOfProductsPenetrationValue]);

  useEffect(() => {
    if (props.productStoreFilterConfig?.length) {
      let filterChips = fetchFilterChipsToDownload([
        ...props.productStoreFilterConfig,
      ]);
      setDownloadFormatChipsDependency(filterChips);
    }
  }, [props.productStoreFilterConfig]);

  const getRowStyle = (params) => {
    if (params.node.rowPinned) {
      return { fontWeight: "bold" };
    }
  };

  const prependData = () => {
    if (!isEmpty(downloadFormatChipsDependency)) {
      let prependContentReq = prependExtraData(downloadFormatChipsDependency);
      return appendExcelDownloadData(prependContentReq);
    }
  };

  return (
    <div ref={storePriceContributionRef}>
      <AgGridComponent
        rowdata={storePriceContributionData}
        columns={storePriceContributionColumn}
        uniqueRowId={"store_code"}
        sizeColumnsToFitFlag
        downloadAsExcel={true}
        pagination={false}
        getRowStyle={getRowStyle}
        pinnedTopRowData={hidePinnedRow ? [] : pinnedRow}
        toPrependContent={props.excelDownloadMetaData}
        prependedContentDetails={prependData()}
        noRowOverlayMessage={NO_TABLE_DATA_MESSAGE}
        tableHeader={storeHeaderValue + " and size contributions"}
      />
    </div>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer } = store;
  return {
    newProductProfileLoader:
      inventorysmartReducer.createProductProfileReducer.newProductProfileLoader,
    listOfProductsPenetrationValue:
      inventorysmartReducer.createProductProfileReducer
        .listOfProductsPenetrationValue,
    dynamicLabels:
      inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.dynamicLabels,
    excelDownloadMetaData:
      inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig?.excelDownloadMetaData,
    cache: inventorysmartReducer?.activeModulesCacheService?.cache,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    setNewProductProfileLoader: (body) =>
      dispatch(setNewProductProfileLoader(body)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(StorePriceContributionComponent);
