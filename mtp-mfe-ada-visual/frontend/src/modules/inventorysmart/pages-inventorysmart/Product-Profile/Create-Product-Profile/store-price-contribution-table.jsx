import React, { useState, useEffect, useRef } from "react";
import { connect } from "react-redux";

import { Paper, Typography } from "@mui/material";

import AgGridComponent from "core/Utils/agGrid";
import { addSnack } from "core/actions/snackbarActions";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import globalStyles from "core/Styles/globalStyles";
import { cloneDeep, isEmpty } from "lodash";
import {
  appendExcelDownloadData,
  fetchFilterChipsToDownload,
  prependExtraData,
} from "core/Utils/agGrid/table-functions";

import { setNewProductProfileLoader } from "../../../services-inventorysmart/Product-Profile/create-product-profile-service";
import { scrollIntoView } from "../../inventorysmart-utility";

const StorePriceContributionComponent = (props) => {
  const [storePriceContributionColumn, setStorePriceContributionColumn] =
    useState([]);
  const [storePriceContributionData, setStorePriceContributionData] = useState(
    []
  );
  const [pinnedRow, setPinnedRow] = useState([]);
  const storePriceContributionRef = useRef();
  const [downloadFormatChipsDependency, setDownloadFormatChipsDependency] =
    useState({});

  const globalClasses = globalStyles();

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
    if (props.storeFilterConfig?.length && props.productFilterConfig?.length) {
      let filterChips = fetchFilterChipsToDownload([
        ...props.productFilterConfig,
        ...props.storeFilterConfig,
      ]);
      setDownloadFormatChipsDependency(filterChips);
    }
  }, [props.productFilterConfig, props.storeFilterConfig]);

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
    <div className={globalClasses.marginAround}>
      <Paper ref={storePriceContributionRef}>
        <Typography variant="h5" className={globalClasses.paperHeader}>
          {props.dynamicLabels?.article === "Product"
            ? "Store and size contributions"
            : "Store contributions"}
        </Typography>
        <div className={globalClasses.evenPaddingAround}>
          <AgGridComponent
            rowdata={storePriceContributionData}
            columns={storePriceContributionColumn}
            uniqueRowId={"store_code"}
            sizeColumnsToFitFlag
            downloadAsExcel={true}
            pagination={false}
            getRowStyle={getRowStyle}
            pinnedTopRowData={pinnedRow}
            toPrependContent={props.excelDownloadMetaData}
            prependedContentDetails={prependData()}
          />
        </div>
      </Paper>
    </div>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer, filterReducer } = store;
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
    filterDashboardConfiguration:
      filterReducer.filterDashboardConfiguration[
        "createProductProfileFilterConfiguration"
      ],
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (snack) => dispatch(addSnack(snack)),
    setNewProductProfileLoader: (body) =>
      dispatch(setNewProductProfileLoader(body)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(StorePriceContributionComponent);
