import React, { useState, useEffect, useRef } from "react";
import { connect } from "react-redux";

import { isEmpty } from "lodash";
import { Paper, Grid, Typography } from "@mui/material";

import AgGridComponent from "core/Utils/agGrid";
import globalStyles from "core/Styles/globalStyles";
import { getColumnsAg } from "core/actions/tableColumnActions";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import colours from "core/Styles/colours";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";

import {
  setAllocationDeepDiveTableData,
  getAllocationDeepDiveTableData,
} from "../../../services-inventorysmart/Allocation-Reports/allocation-deep-dive-service";
import {
  ERROR_MESSAGE,
  DEEP_DIVE_ALLOCATION_SUMMARY,
} from "../../../constants-inventorysmart/stringConstants";
import CardComponent from "../components/CardComponent";
import DownloadReport from "../report-download";

const AllocationDeepDiveTableComponent = (props) => {
  const [allocationDeepDiveColumn, setAllocationDeepDiveColumn] = useState([]);
  const [deepDiveSummaryCards, setDeepDiveSummaryCards] = useState([]);
  const [requestBody, setRequestBody] = useState([]);
  const [enableDeepDiveDownload, setEnableDeepDiveDownload] = useState(true);
  const filterDependencyRef = useRef(null);
  const deepDiveTableInstance = useRef(null);
  const offsetValues = useRef({});

  const classes = useStyles();
  const globalClasses = globalStyles();

  useEffect(() => {
    (async () => {
      try {
        props.setAllocationDeepDiveTableLoader(true);
        let col = await getColumnsAg(
          "table_name=inventorysmart_allocation_deep_dive"
        )();
        setAllocationDeepDiveColumn(col);
        props.setAllocationDeepDiveTableLoader(false);
      } catch (e) {
        props.setAllocationDeepDiveTableLoader(false);
        props.displaySnackMessages(ERROR_MESSAGE, "error");
      }
    })();
  }, []);

  useEffect(() => {
    if (!isEmpty(props.allocationDeepDiveTableData?.aggregated_data)) {
      let deepDiveSummaryCards = DEEP_DIVE_ALLOCATION_SUMMARY.map((item) => {
        let color = colours.royalBlue;
        let icon = "inventory_icon";
        let countWithComma =
          item.key === "qty_match_per_actual_vs_sales" ||
          item.key === "qty_size_match_per"
            ? props.allocationDeepDiveTableData.aggregated_data[0][
                item.key
              ]?.toFixed(2)
            : parseInt(
                props.allocationDeepDiveTableData.aggregated_data[0][item.key]
              );
        return {
          ...item,
          color,
          icon,
          count:
            !countWithComma && countWithComma != 0
              ? "-"
              : countWithComma?.toLocaleString(),
        };
      });
      setDeepDiveSummaryCards(deepDiveSummaryCards);
    }
  }, [props.allocationDeepDiveTableData]);

  useEffect(() => {
    if (!isEmpty(props.filterDependency)) {
      filterDependencyRef.current = props.filterDependency;
      deepDiveTableInstance.current?.api?.refreshServerSideStore({
        purge: true,
      });
    }
  }, [props.filterDependency]);

  const setManualCallBackRequestBody = (manualbody, pageIndex) => {
    let filterDependency = filterDependencyRef.current.filter(
      (item) => item.attribute_name !== "range-picker"
    );
    let filterDatePicker = filterDependencyRef.current.filter(
      (item) => item.attribute_name === "range-picker"
    );
    let formattedDate = filterDatePicker[0].values;
    let manualFilterbody = manualbody
      ? manualbody
      : { range: [], sort: [], search: [] };
    let limit =
      Object.keys(offsetValues.current)?.length > 0 && pageIndex !== 0
        ? { limit: 10, page: pageIndex + 1, ...offsetValues.current }
        : { limit: 10, page: pageIndex + 1 };
    return {
      filters: filterDependency,
      start_date: formattedDate[0],
      end_date: formattedDate[1],
      meta: {
        ...manualFilterbody,
        limit,
      },
    };
  };

  const manualCallBackDeepDive = async (manualbody, pageIndex) => {
    props.setAllocationDeepDiveTableLoader(true);
    let body = setManualCallBackRequestBody(manualbody, pageIndex);
    try {
      setRequestBody(body);
      let response = await props.getAllocationDeepDiveTableData(body);
      let deepDiveData = response.data?.data;
      props.setAllocationDeepDiveTableData(deepDiveData);
      offsetValues.current = {
        offset: deepDiveData?.table_data?.offset,
        sub_offset: deepDiveData?.table_data?.sub_offset,
      };
      if (pageIndex == 0) {
        if (deepDiveData?.table_data?.result?.length)
          setEnableDeepDiveDownload(false);
        else setEnableDeepDiveDownload(true);
      }
      props.setAllocationDeepDiveTableLoader(false);
      let resultantData = deepDiveData?.table_data?.result?.map((item) => {
        return {
          ...item,
          max_supression_flag: item?.max_supression_flag ? "Yes" : "No",
          min_influenced_allocation: item?.min_influenced_allocation
            ? "Yes"
            : "No",
          is_edited: item?.is_edited ? "Yes" : "No",
        };
      });
      return {
        data: resultantData,
        totalCount: response.data?.total,
      };
    } catch (e) {
      setEnableDeepDiveDownload(true);
      props.displaySnackMessages(ERROR_MESSAGE, "error");
      props.setAllocationDeepDiveTableLoader(false);
      return {
        data: [],
        totalCount: 0,
      };
    }
  };

  const loadDeepDiveTableInstance = (params) => {
    deepDiveTableInstance.current = params;
  };

  return (
    <div className={globalClasses.marginVertical1rem}>
      <Grid container className={classes.kpiContainer} spacing={3}>
        {deepDiveSummaryCards.map((item) => {
          return (
            <Grid item xs={3}>
              <Paper elevation={3} className={classes.summaryContainer}>
                <CardComponent kpiItem={item} />
              </Paper>
            </Grid>
          );
        })}
      </Grid>
      <>
        {dynamicLabelsBasedOnTenant("article") === "Material" && (
          <Typography className={globalClasses.dialogText}>
            * Metric is calculated as per the status that existed during the
            allocation's creation.
          </Typography>
        )}
        <DownloadReport
          screenName={"allocation_deep_dive"}
          requestBody={requestBody}
          disable={enableDeepDiveDownload}
        ></DownloadReport>
        <AgGridComponent
          columns={allocationDeepDiveColumn}
          loadTableInstance={loadDeepDiveTableInstance}
          manualCallBack={(body, pageIndex) =>
            manualCallBackDeepDive(body, pageIndex)
          }
          rowModelType="serverSide"
          serverSideStoreType="partial"
          cacheBlockSize={10}
          uniqueRowId={"key"}
        />
      </>
    </div>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer } = store;
  return {
    allocationDeepDiveTableData:
      inventorysmartReducer.inventoryAllocationDeepDiveService
        .allocationDeepDiveTableData,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    setAllocationDeepDiveTableData: (body) =>
      dispatch(setAllocationDeepDiveTableData(body)),
    getAllocationDeepDiveTableData: (body) =>
      dispatch(getAllocationDeepDiveTableData(body)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(AllocationDeepDiveTableComponent);
