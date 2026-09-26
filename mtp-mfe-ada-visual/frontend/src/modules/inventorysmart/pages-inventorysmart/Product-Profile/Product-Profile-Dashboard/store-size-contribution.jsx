import React, { useEffect, useState, useRef } from "react";
import { connect } from "react-redux";

import { Paper, Typography, Tabs, Tab } from "@mui/material";
import { cloneDeep, isEmpty } from "lodash";

import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { getColumnsAg } from "core/actions/tableColumnActions";
import { addSnack } from "core/actions/snackbarActions";
import globalStyles from "core/Styles/globalStyles";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";
import {
  appendExcelDownloadData,
  fetchFilterChipsToDownload,
  prependExtraData,
} from "core/Utils/agGrid/table-functions";

import {
  setProductProfileTableLoader,
  getStyleColorDescriptionData,
  setStyleColorDescriptionData,
} from "../../../services-inventorysmart/Product-Profile/product-profile-dashboard-service";
import { ERROR_MESSAGE } from "../../../constants-inventorysmart/stringConstants";
import { scrollIntoView } from "../../inventorysmart-utility";

const StoreSizeContributionComponent = (props) => {
  const [storeSizeTabValue, setStoreSizeTabValue] = useState(0);
  const [storeSizeContributionColumns, setStoreSizeContributionColumns] =
    useState([]);
  const [storeSizeContributionData, setStoreSizeContributionData] = useState(
    []
  );
  const [penetrationColumns, setPenetrationColumns] = useState([]);
  const [penetrationData, setPenetrationData] = useState([]);
  const [styleColorDescColumns, setStyleColorDescColumns] = useState([]);
  const [styleColorDescData, setStyleColorDescData] = useState([]);
  const [downloadFormatChipsDependency, setDownloadFormatChipsDependency] =
    useState({});
  const [pinnedRow, setPinnedRow] = useState([]);
  const [pinnedRowUserCreated, setPinnedRowUserCreated] = useState([]);

  const storeSizeTableRef = useRef();

  const tabProps = (index) => {
    return {
      id: `simple-tab-${index}`,
      "aria-controls": `simple-tabpanel-${index}`,
    };
  };
  const globalClasses = globalStyles();

  useEffect(() => {
    // on intial load set store and size contribution api
    if (!isEmpty(props.storeSizeContributionTableData)) {
      if (props.tabState === 0) {
        let copyOfStoreSizeContributionData = cloneDeep(
          props.storeSizeContributionTableData?.columns
        );
        let storeSizeColDef = agGridColumnFormatter(
          copyOfStoreSizeContributionData
        );
        setStoreSizeContributionColumns(storeSizeColDef);
        let sortedRows = cloneDeep(
          props.storeSizeContributionTableData?.data
        )?.sort((a, b) => b.overall_proportion - a.overall_proportion);
        const index = sortedRows.findIndex((obj) => obj.store_name === "Total");
        if (index !== -1) {
          let toPin = sortedRows.splice(index, 1);
          setPinnedRow(toPin);
        }
        setStoreSizeContributionData(sortedRows);
      }
      scrollIntoView(storeSizeTableRef);
      props.setProductProfileTableLoader(false);
    }
  }, [props.tabState, props.storeSizeContributionTableData]);

  useEffect(() => {
    // to fix the issue related to updating table data when user is on tab one and selects a diff prod profile
    setStoreSizeTabValue(0);
  }, [props.selectedPPCode]);

  useEffect(() => {
    if (storeSizeTabValue === 0) {
      if (!isEmpty(props.storeSizeContributionTableData)) {
        let copyOfStoreSizeContributionData = cloneDeep(
          props.storeSizeContributionTableData?.columns
        );
        let penetrationColDef = agGridColumnFormatter(
          copyOfStoreSizeContributionData
        );
        setPenetrationColumns(penetrationColDef);
        let sortedRows = cloneDeep(
          props.storeSizeContributionTableData?.data
        )?.sort((a, b) => b.overall_proportion - a.overall_proportion);
        const index = sortedRows.findIndex((obj) => obj.store_name === "Total");
        if (index !== -1) {
          let toPin = sortedRows.splice(index, 1);
          setPinnedRowUserCreated(toPin);
        }
        setPenetrationData(sortedRows);
        setStyleColorDescColumns([]);
        setStyleColorDescData([]);
      }
    } else {
      (async () => {
        props.setProductProfileTableLoader(true);
        try {
          let styleColorColumnDef = await getColumnsAg(
            "table_name=product_profile_style_color_table"
          )();
          setStyleColorDescColumns(styleColorColumnDef);
          let response = await props.getStyleColorDescriptionData(
            props.selectedPPCode
          );
          props.setStyleColorDescriptionData(response.data.data);
          props.setProductProfileTableLoader(false);
          setPenetrationColumns([]);
          setPenetrationData([]);
        } catch (e) {
          props.setProductProfileTableLoader(false);
          displaySnackMessages(ERROR_MESSAGE, "error");
        }
      })();
    }
  }, [storeSizeTabValue, props.storeSizeContributionTableData]);

  useEffect(() => {
    // store style color desc data in state n pass to table
    if (!isEmpty(props.styleColorDescriptionData))
      setStyleColorDescData(props.styleColorDescriptionData);
  }, [props.styleColorDescriptionData]);

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const handleChange = (_event, newValue) => {
    setStoreSizeTabValue(newValue);
  };

  const prependData = () => {
    if (!isEmpty(downloadFormatChipsDependency)) {
      let prependContentReq = prependExtraData(downloadFormatChipsDependency);
      return appendExcelDownloadData(prependContentReq);
    }
  };

  useEffect(() => {
    if (props.filterDashboardConfiguration?.dependencyData?.length) {
      let filterChips = fetchFilterChipsToDownload(
        props.filterDashboardConfiguration?.dependencyData
      );
      setDownloadFormatChipsDependency(filterChips);
    }
  }, [props.filterDashboardConfiguration]);

  const getRowStyle = (params) => {
    if (params.node.rowPinned) {
      return { fontWeight: "bold" };
    }
  };

  return (
    <Paper ref={storeSizeTableRef}>
      <Typography variant="h5" className={globalClasses.paperHeader}>
        {props.dynamicLabels?.article === "Product"
          ? "Store and size contributions"
          : "Store contributions"}
      </Typography>
      {props.tabState === 0 && (
        <AgGridComponent
          rowdata={storeSizeContributionData}
          columns={storeSizeContributionColumns}
          uniqueRowId={"store_code"}
          sizeColumnsToFitFlag
          downloadAsExcel={true}
          pagination={false}
          toPrependContent={props.excelDownloadMetaData}
          prependedContentDetails={prependData()}
          getRowStyle={getRowStyle}
          pinnedTopRowData={pinnedRow}
        />
      )}
      {props.tabState === 1 && (
        <>
          <Tabs
            value={storeSizeTabValue}
            onChange={handleChange}
            aria-label="store-size-contribution-tabs"
          >
            <Tab label="Penetration" {...tabProps(0)} />
            <Tab
              label={`${dynamicLabelsBasedOnTenant("article")} Description`}
              {...tabProps(1)}
            />
          </Tabs>
          {storeSizeTabValue === 0 && (
            <AgGridComponent
              rowdata={penetrationData}
              columns={penetrationColumns}
              uniqueRowId={"store_code"}
              sizeColumnsToFitFlag
              downloadAsExcel={true}
              pagination={false}
              toPrependContent={props.excelDownloadMetaData}
              prependedContentDetails={prependData()}
              getRowStyle={getRowStyle}
              pinnedTopRowData={pinnedRowUserCreated}
            />
          )}{" "}
          {storeSizeTabValue === 1 && (
            <AgGridComponent
              rowdata={styleColorDescData}
              columns={styleColorDescColumns}
              uniqueRowId={"article"}
              sizeColumnsToFitFlag
              downloadAsExcel={true}
              toPrependContent={props.excelDownloadMetaData}
              prependedContentDetails={prependData()}
            />
          )}
        </>
      )}
    </Paper>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer, filterReducer } = store;
  return {
    storeSizeContributionTableData:
      inventorysmartReducer.productProfileDashboardReducer
        .storeSizeContributionTableData,
    styleColorDescriptionData:
      inventorysmartReducer.productProfileDashboardReducer
        .styleColorDescriptionData,
    dynamicLabels:
      inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.dynamicLabels,
    filterDashboardConfiguration:
      filterReducer.filterDashboardConfiguration[
        "productProfileFilterConfiguration"
      ]?.appliedFilterData,
    excelDownloadMetaData:
      inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig?.excelDownloadMetaData,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (snack) => dispatch(addSnack(snack)),
    setProductProfileTableLoader: (body) =>
      dispatch(setProductProfileTableLoader(body)),
    getStyleColorDescriptionData: (pp_code) =>
      dispatch(getStyleColorDescriptionData(pp_code)),
    setStyleColorDescriptionData: (pp_code) =>
      dispatch(setStyleColorDescriptionData(pp_code)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(StoreSizeContributionComponent);
