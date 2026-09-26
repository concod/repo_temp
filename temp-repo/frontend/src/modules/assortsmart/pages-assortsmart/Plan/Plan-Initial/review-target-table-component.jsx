import React, { useState, useEffect, useRef, useCallback } from "react";
import { connect } from "react-redux";
import AgGridTable from "core/Utils/agGrid";
import { getColumnsAg } from "core/actions/tableColumnActions";
import * as planDashboardServiceActions from "modules/assortsmart/services-assortsmart/Plan-Dashboard/plan-dashboard-service";
import {
  set2_1_Loader,
  getReviewTargetData,
  setReviewTargetData,
  getCarryoverOptimizeL3Data,
  deleteL3Optimization,
} from "modules/assortsmart/services-assortsmart/Plan/Plan-Initial/plan-initial-service";
import {
  externalFilterLevelsChannelSubChannel,
  getBudgetTablePayload,
  getOptimiseL3Payload,
  isChannelMultiple,
} from "modules/assortsmart/utils-assortsmart/utilityFunctions";
import { addSnack } from "core/actions/snackbarActions";
import { Button } from "@mui/material";
import * as planInitialServiceActions from "modules/assortsmart/services-assortsmart/Plan/Plan-Initial/plan-initial-service";
import { isEmpty } from "lodash";
import { pollingService } from "core/Utils/functions/helpers/errorhandler-helpers";
import { BUDGET_POLL } from "modules/assortsmart/constants-assortsmart/apiConstants";
import { useStyles } from "core/Utils/styles/assortSmartUsestyles";
import { groupByCustom } from "core/Utils/formatter";

const ReviewTarget = (props) => {
  const [reviewTableColumns, setReviewTableColumns] = useState([]);
  const [reviewTableData, setReviewTableData] = useState([]);
  const [disableOptimize, setDisableOptimize] = useState(false);
  const [totalFooter, setTotalFooter] = useState([]);
  const reviewAGInstance = useRef({});
  const reviewTargetVisibleColumns = useRef({});
  const formValues = useRef({});
  const classes = useStyles();

  useEffect(() => {
    if (reviewTableData?.length > 0) {
      let lyZeroCount = 0,
        tyZeroCount = 0;
      reviewTableData.forEach((item) => {
        if (!item.revenue_ly) {
          lyZeroCount += 1;
        }
        if (!item.revenue_ty) {
          tyZeroCount += 1;
        }
      });
      if (
        lyZeroCount === reviewTableData?.length ||
        tyZeroCount === reviewTableData?.length
      ) {
        setDisableOptimize(true);
      }
    }
  }, [reviewTableData]);

  useEffect(() => {
    if (
      (!isEmpty(props.selectedChannel) || !isEmpty(props.levelOneSelected)) &&
      reviewAGInstance?.current?.api
    ) {
      if (!isEmpty(props.selectedChannel)) {
        formValues.current["channel_list"] = props.selectedChannel?.value;
      }
      if (!isEmpty(props.levelOneSelected)) {
        formValues.current["l1_name"] = props.levelOneSelected?.value;
      }
      reviewAGInstance.current.api.onFilterChanged();
    }
  }, [
    props.selectedChannel,
    reviewAGInstance?.current.api,
    props.levelOneSelected,
  ]);

  useEffect(() => {
    if (props.reviewTargetData?.length) {
      const reviewTargetData = props.reviewTargetData;
      let reviewTableData = [],
        totalRowObj = {};
      reviewTargetData?.forEach((record) => {
        let reviewTableObj = {};
        if (
          record["channel"] !== "Total" &&
          record["sub_channel"] !== "Total"
        ) {
          for (const key in record) {
            reviewTableObj[key] = record[key];
          }
          reviewTableData.push(reviewTableObj);
        } else {
          for (const key in record) {
            if (key !== "l1_name") {
              totalRowObj[key] = record[key];
            } else {
              totalRowObj[key] = "Total";
            }
          }
        }
      });
      //If there multiple records, add total row in the footer
      if (
        reviewTableData?.length > 1 &&
        isChannelMultiple(props.planDetails?.data)
      ) {
        reviewTableData.push(totalRowObj);
      }
      setReviewTableData(reviewTableData);
    }
  }, [props.reviewTargetData]);

  useEffect(() => {
    if (props.planDetails?.status) {
      const fetchData = async () => {
        props.set2_1_Loader(true);
        let cols = await getColumnsAg(
          "table_name=review_target",
          props.columnHeaderJson
        )();
        if (cols.length) {
          const columns = cols.filter((item) => {
            return !item.is_hidden;
          });
          reviewTargetVisibleColumns.current = columns;
          setReviewTableColumns(cols);
        }
        const payload = getBudgetTablePayload(
          props.planDetails?.data,
          props.planLevels,
          true
        );
        if (props.planDetails?.data?.data_pull_source) {
          payload.filters.push({
            attribute_name: "data_pull_source",
            value: [props.planDetails?.data?.data_pull_source],
            operator: "in",
          });
        }
        payload.filters.push({
          attribute_name: "compare_season",
          value: [props.planDetails?.data?.compare_season || ""],
          operator: "in",
        });
        try {
          const reviewdata = await props.getReviewTargetData(payload);
          if (reviewdata?.data?.status) {
            props.setCallCarryOverData(true);
            props.setReviewTargetData(reviewdata?.data?.data?.data);
          }
        } catch (error) {
          props.addSnack({
            message: "Fetching review target details failed",
            options: {
              variant: "error",
            },
          });
        }
        props.set2_1_Loader(false);
      };
      fetchData();
    }
  }, [props.planDetails]);

  useEffect(() => {
    return () => {
      props.setReviewTargetData([]);
      setReviewTableData([]);
    };
  }, []);

  const onL3PollingSucess = () => {
    props.addSnack({
      message: `Successfully optimized ${props.columnHeaderJson?.l3_name} details`,
      options: {
        variant: "success",
      },
    });
    props.set2_1_Loader(false);
    if (props.optimizationLevels.includes("l2_name")) {
      props.setShowLevel2(true);
    } else {
      props.setShowLevel3(true);
    }
  };

  const onL3PollingFailure = (data) => {
    props.addSnack({
      message: data.message,
      options: {
        variant: "error",
      },
    });
    props.set2_1_Loader(false);
  };

  const callDeleteOptimization = async () => {
    props.set2_1_Loader(true);
    props.setShowLevel2(false);
    props.setShowLevel3(false);
    props.setShowClusterLevel(false);
    props.setInitialLoadDepthChoice(true);
    props.setShowReviewAcrossDropsTable(false);
    props.setInitialLoadWedge(true);
    props.setInitialLoadFinalize(true);
    props.setFromDashboardScreen_2_2(false);
    props.setFromDashboardScreen_2_3(false);
    props.setFromDashboardScreen_2_4(false);
    let deleteL3OptResponse = props.deleteL3Optimization(
      {
        plan_code: props.planDetails?.data?.plan_code,
      },
      props.screenConfiguration?.common?.endpoint_project_name || "assort"
    );
    deleteL3OptResponse
      .then((response) => {
        if (response?.status) {
          fetchOptimizeData();
        }
      })
      .catch((error) => {
        props.set2_1_Loader(false);
        //props.setShowReviewAcrossDropsTable(true);
        props.addSnack({
          message: "Delete optimization data failed",
          options: {
            variant: "error",
          },
        });
      });
  };

  const fetchOptimizeData = async () => {
    try {
      const planDetailsData = props.planDetails?.data;
      let optimisePayload = getOptimiseL3Payload(planDetailsData);
      if (planDetailsData.data_pull_source) {
        optimisePayload.data_pull_source = planDetailsData.data_pull_source;
      }
      if (planDetailsData.comapre_season) {
        optimisePayload.comapre_season = planDetailsData.comapre_season;
      }
      let plan_sub_step = "optimization_table_l3_name"
      if(props.optimizationLevels.includes("carryover")){
        plan_sub_step = props.optimizationLevels.slice(2)?.[0] ? `optimization_table_${props.optimizationLevels.slice(2)?.[0]}` : "optimization_table_l3_name"
      }else{
        plan_sub_step = props.optimizationLevels.slice(1)?.[0] ? `optimization_table_${props.optimizationLevels.slice(1)?.[0]}` : "optimization_table_l3_name"
      }
      optimisePayload.plan_sub_step = plan_sub_step
      const optimizeResponse = await props.getCarryoverOptimizeL3Data(
        optimisePayload
      );
      if (optimizeResponse?.data?.data?.status) {
        const reqId = optimizeResponse?.data?.data?.task_id;
        //Poll to the server till we receive the response
        pollingService(
          `${BUDGET_POLL}${reqId}`,
          onL3PollingSucess,
          onL3PollingFailure
        );
        props.addSnack({
          message: "Please wait for sometime till we process!",
          options: {
            variant: "success",
          },
        });
      } else {
        props.addSnack({
          message: `Optimising ${props.columnHeaderJson?.l3_name} details failed`,
          options: {
            variant: "error",
          },
        });
        //props.set2_1_Loader(false);
      }
    } catch (error) {
      props.set2_1_Loader(false);
      props.addSnack({
        message: "Something went wrong",
        options: {
          variant: "error",
        },
      });
    }
  };

  const isExternalFilterPresent = useCallback(() => {
    // filter incase of mulitple channels
    return isChannelMultiple(props.planDetails?.data) ||
      props.planDetails?.data?.l1_name.length > 1
      ? true
      : false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doesExternalFilterPass = useCallback(
    (node) => {
      return externalFilterLevelsChannelSubChannel(
        node,
        reviewTableData,
        formValues.current,
        props.planDetails?.data,
        props.levelsJson
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [formValues, reviewTableData]
  );

  const loadTableInstance = (params) => {
    reviewAGInstance.current = params;
  };

  const getTotalFooter = () => {
    let footers = [];
    let groupedData = groupByCustom({
      Group: reviewTableData,
      By: ["channel"],
    });
    for (let item of groupedData) {
      let revenueTy = 0,
        revenueLy = 0,
        retailReceiptLy = 0,
        retailReceiptTy = 0;
      if (
        !formValues?.current?.channel_list ||
        formValues?.current?.channel_list === item?.[0]?.channel
      ) {
        item.forEach((data) => {
          revenueLy += data.revenue_ly;
          revenueTy += data.revenue_ty;
          retailReceiptLy += data.retail_receipt_ly;
          retailReceiptTy += data.retail_receipt_ty;
        });
        footers.push({
          l1_name: "Total",
          channel: item?.[0]?.channel,
          revenue_ly: revenueLy,
          revenue_ty: revenueTy,
          retail_receipt_ly: retailReceiptLy,
          retail_receipt_ty: retailReceiptTy,
        });
      }
    }
    setTotalFooter(footers);
  };

  useEffect(() => {
    if (props.planDetails?.data?.l1_name?.length > 1) {
      getTotalFooter();
    }
  }, [reviewTableData, props.selectedChannel?.value]);
  return (
    <>
      <div className={classes.tableWidth}>
        <AgGridTable
          rowdata={reviewTableData || []}
          columns={reviewTableColumns}
          loadTableInstance={loadTableInstance}
          isExternalFilterPresent={isExternalFilterPresent}
          doesExternalFilterPass={doesExternalFilterPass}
          pagination={false}
          sideBar={false}
          onGridChanged
          sizeColumnsToFitFlag
          skipAutoSizeColumn={true}
          adjustTableHeight={reviewTableData?.length <= 2 ? true : false}
          pinnedBottomRowData={totalFooter}
        />
      </div>
      <div className={classes.rightAlignButtonAssort}>
        <Button
          variant="contained"
          color="primary"
          className={classes.button}
          disabled={disableOptimize}
          onClick={() => callDeleteOptimization()}
          id="reoptimiz"
        >
          Optimize for {props?.columnHeaderJson?.l2_name}
        </Button>
      </div>
    </>
  );
};

const mapStateToProps = (state) => {
  return {
    planDetails: planDashboardServiceActions.planDetailsDataSelector(state),
    planLevels: planDashboardServiceActions.planLevelsDataSelector(state),
    columnHeaderJson: planDashboardServiceActions.columnHeaderJsonSelector(
      state
    ),
    levelsJson: planDashboardServiceActions.levelsJsonDataSelector(state),
    reviewTargetData: planInitialServiceActions.reviewTargetSelector(state),
    screenConfiguration:
      state.assortsmartReducer.commonAssortReducer.screenConfiguration,
  };
};
const mapActionsToProps = {
  set2_1_Loader,
  getReviewTargetData,
  addSnack,
  setReviewTargetData,
  getCarryoverOptimizeL3Data,
  deleteL3Optimization,
};
export default connect(mapStateToProps, mapActionsToProps)(ReviewTarget);
