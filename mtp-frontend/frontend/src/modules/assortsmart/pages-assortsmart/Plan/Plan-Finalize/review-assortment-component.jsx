import React, { useState, useEffect, useRef, useCallback } from "react";
import { connect } from "react-redux";
import { bindActionCreators } from "redux";
import { Card, Typography } from "@mui/material";
import globalStyles from "core/Styles/globalStyles";
import { getColumnsAg } from "core/actions/tableColumnActions";
import AgGridTable from "core/Utils/agGrid";
import Form from "core/Utils/form";
import {
  getCoreReplenChoice,
  getAssortmentSummaryData,
} from "../../../services-assortsmart/Plan/Plan-Finalize/plan-finalize-service";
import * as planDashboardServiceActions from "modules/assortsmart/services-assortsmart/Plan-Dashboard/plan-dashboard-service";
import * as commonAssortServiceActions from "modules/assortsmart/services-assortsmart/common-assort-service";
import * as planFinalizeServiceActions from "modules/assortsmart/services-assortsmart/Plan/Plan-Finalize/plan-finalize-service";
import { groupByCustom } from "core/Utils/formatter";
import {
  configureFormFields,
  displaySnackMessage,
} from "./plan-finalize-function";
import { makeStyles } from "@mui/styles";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { externalFilterLevelsChannelSubChannel } from "modules/assortsmart/utils-assortsmart/utilityFunctions";
import { cloneDeep, isEmpty, uniqBy } from "lodash";
import { addSnack } from "core/actions/snackbarActions";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";

const ReviewAssortmentComponent = (props) => {
  const useStyles = makeStyles(() => ({
    headerContainer: {
      display: "flex",
      alignItems: "center",
      "& .MuiGrid-item": {
        marginLeft: "2rem",
        paddingLeft: "0",
      },
    },
    formContainer: {
      width: "75%",
      marginBottom: "10px",
      marginLeft: "2rem",
      "& .dropdown-height": {
        "& .ScrollCheck": {
          maxHeight: "10rem",
        },
      },
      "& .dropdown-multi-height": {
        "& .ScrollCheck": {
          maxHeight: "7.5rem",
        },
      },
    },
  }));
  const [assortmentPlanTableColumns, setAssortmentPlanTableColumns] = useState(
    []
  );
  const [assortmentPlanTableData, setAssortmentPlanTableData] = useState([]);
  const [
    assortmentSummaryTableColumns,
    setAssortmentSummaryTableColumns,
  ] = useState([]);
  const [assortmentSummaryTableData, setAssortmentSummaryTableData] = useState(
    []
  );
  const [formFields, setFormFields] = useState([]);
  const [reviewFormData, setReviewFormData] = useState({});
  const [groupedDrops, setGroupedDrops] = useState(null);
  const globalClasses = globalStyles();
  const classes = useStyles();

  const ReviewInstance = useRef({});

  useEffect(() => {
    const fetchAssortmentPlanColumns = async () => {
      let payload = {
        filters: [
          {
            attribute_name: "plan_code",
            value: [props.planDetails?.plan_code],
            operator: "in",
          },
        ],
      };
      let response = await props.getCoreReplenChoice(
        payload,
        props.screenConfiguration?.common?.endpoint_project_name || "assort",
        props.planDetails?.data?.plan_code
      );
      if (response?.data?.status) {
        let columns = agGridColumnFormatter(
          response.data.data.columns,
          props.columnHeaderJson
        );
        setAssortmentPlanTableColumns(columns);
        getAssortmentPlanTableData(response.data.data?.data);
      }
    };
    const fetchAssortmentSummaryColumns = async () => {
      let columns = await getColumnsAg(
        "table_name=assort_finalize_assortment_summary",
        props.columnHeaderJson
      )();
      if (columns?.length) {
        setAssortmentSummaryTableColumns(columns);
        fetchAssortmentSummary();
      }
    };
    if (
      !isEmpty(props.optimiseCoreReplenResponse) &&
      props.optimiseCoreReplenResponse?.status === "False"
    ) {
      displaySnackMessage(
        "Optimise by calculate assort summary returned status False",
        "error",
        props
      );
    } else if (
      props.optimiseCoreReplenResponse?.status === "True" ||
      !props.initialLoadFinalize ||
      props.fromDashboardScreen_2_4
    ) {
      fetchAssortmentPlanColumns();
      fetchAssortmentSummaryColumns();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.optimiseCoreReplenResponse]);

  useEffect(() => {
    if (assortmentPlanTableData?.length) {
      let defaultChannel = { value: props.planDetails?.channel?.[0] };
      let selectedDrop = props.selectedDropData ? props.selectedDropData : null;
      let reviewFormValues = cloneDeep(
        props.finalisePlanMetricsData?.[0] || {}
      );
      if (reviewFormValues?.["l2FilterValue"]?.[0]?.["l3_name_list"]) {
        let l3Options = uniqBy(assortmentPlanTableData, "l3_name")?.map(
          (obj) => obj.l3_name
        );
        reviewFormValues["l2FilterValue"][0]["l3_name_list"] = l3Options;
      }
      configureFormFields(
        reviewFormValues,
        reviewFormData,
        selectedDrop,
        defaultChannel,
        setFormFields,
        setReviewFormData,
        setGroupedDrops,
        "review_assortment_plan",
        props
      );
      setReviewFormData({ ...reviewFormData, metric_list: "receipts" });
    }
  }, [assortmentPlanTableData, props.finalisePlanMetricsData]);

  useEffect(() => {
    if (ReviewInstance?.current?.api) {
      ReviewInstance.current.api.onFilterChanged();
    }
    if (assortmentPlanTableColumns?.length) {
      assortmentPlanTableColumns.forEach((col) => {
        if (col.sub_headers?.length) {
          col.sub_headers.forEach((sub) => {
            sub.is_hidden =
              sub.column_name ===
              `${col.column_name.toLowerCase()}_${
                reviewFormData["metric_list"]
              }`
                ? false
                : true;
          });
        }
      });
      let columns = agGridColumnFormatter(assortmentPlanTableColumns);
      setAssortmentPlanTableColumns(columns);
    }
  }, [reviewFormData]);

  const getAssortmentPlanTableData = (tableData) => {
    let tempData = [];
    let groupedArray = groupByCustom({
      Group: tableData,
      By: ["color_id", "channel", "l3_name"],
    });
    groupedArray.forEach((groupedData) => {
      let obj = {};
      let total = {
        total_receipts: 0,
        total_receipt_units: 0,
        total_sales: 0,
        total_sales_units: 0,
      };
      let quarterTotal = {};
      groupedData.forEach((data) => {
        let monthName = props.screenConfiguration?.[
          "2.1"
        ]?.fiscal_month_mapping_with_name?.[data.fm]?.toLowerCase();
        obj = { ...data, ...obj };
        obj[monthName + "_receipts"] = data.receipts;
        obj[monthName + "_receipt_units"] = data.receipt_units;
        obj[monthName + "_sales"] = data.sales;
        obj[monthName + "_sales_units"] = data.sales_units;
        obj["l3_name"] = replaceSpecialCharacter(data.l3_name);
        obj["uniqueID"] = data.l3_name + data.color_id + data.channel;
        Object.keys(total).map((key) => {
          let split = key.split("total_")?.[1];
          total[key] = (total[key] || 0) + data[split];
          return total;
        });
        if (data.quarter) {
          quarterTotal["qtr" + data.quarter + "_receipts"] =
            (quarterTotal["qtr" + data.quarter + "_receipts"] || 0) +
            data.receipts;
          quarterTotal["qtr" + data.quarter + "_receipt_units"] =
            (quarterTotal["qtr" + data.quarter + "_receipt_units"] || 0) +
            data.receipt_units;
          quarterTotal["qtr" + data.quarter + "_sales"] =
            (quarterTotal["qtr" + data.quarter + "_sales"] || 0) + data.sales;
          quarterTotal["qtr" + data.quarter + "_sales_units"] =
            (quarterTotal["qtr" + data.quarter + "_sales_units"] || 0) +
            data.sales_units;
        }
      });
      tempData.push({ ...obj, ...total, ...quarterTotal });
    });
    setAssortmentPlanTableData(tempData);
  };

  const fetchAssortmentSummary = async () => {
    let payload = {
      filters: [
        {
          attribute_name: "plan_code",
          value: [props.planDetails?.plan_code],
          operator: "in",
        },
      ],
    };
    let response = await props.getAssortmentSummaryData(
      payload,
      props.screenConfiguration?.common?.endpoint_project_name || "assort",
      props.planDetails?.data?.plan_code
    );
    if (response?.data?.status) {
      calculateTotalForSummary(response.data.data);
      setAssortmentSummaryTableData(response.data.data);
    }
  };

  const calculateTotalForSummary = (tableData) => {
    let totalKeys = [
      "receipt_units",
      "receipts",
      "receipts_%",
      "sales_units",
      "sales",
      "sales_%",
    ];
    let totalObj = {};
    tableData.forEach((data) => {
      totalKeys.map((key) => {
        totalObj[key] = (totalObj[key] || 0) + data[key];
        return totalObj;
      });
    });
    tableData.push({
      ...totalObj,
      lifecycle: "Total",
    });
  };

  const handleChangeReviewFilter = (updatedFormData, id) => {
    setReviewFormData(updatedFormData);
  };

  const isExternalFilterPresent = useCallback(() => {
    return true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doesExternalFilterPass = useCallback(
    (node) => {
      return externalFilterLevelsChannelSubChannel(
        node,
        assortmentPlanTableData,
        reviewFormData,
        props.planDetails,
        props.levelsJson
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reviewFormData, assortmentPlanTableData, props.selectedDropData]
  );

  const loadTableInstance = (params) => {
    ReviewInstance.current = params;
  };

  return (
    <Card className={globalClasses.paper}>
      <div className={classes.headerContainer}>
        <Typography variant="h3">Review Assortment Plan</Typography>
        <div className={classes.formContainer}>
          <Form
            layout={"vertical"}
            maxFieldsInRow={5}
            handleChange={handleChangeReviewFilter}
            fields={formFields}
            updateDefaultValue={false}
            defaultValues={reviewFormData}
            handleDropdownClose={true}
          ></Form>
        </div>
      </div>
      <div>
        {assortmentPlanTableColumns?.length ? (
          <AgGridTable
            columns={assortmentPlanTableColumns}
            rowdata={assortmentPlanTableData || []}
            loadTableInstance={loadTableInstance}
            isExternalFilterPresent={isExternalFilterPresent}
            doesExternalFilterPass={doesExternalFilterPass}
            sideBar={false}
            pagination={true}
            tableId={"plan-table"}
            uniqueRowId="uniqueID"
            sizeColumnsToFitFlag={true}
            adjustTableHeight={true}
          />
        ) : null}
      </div>
      <div className={globalClasses.marginVertical1rem}>
        <Typography variant="h3">Assortment Summary</Typography>
      </div>
      <div>
        <AgGridTable
          columns={assortmentSummaryTableColumns}
          rowdata={assortmentSummaryTableData || []}
          sideBar={false}
          pagination={false}
          tableId={"summary-table"}
          uniqueRowId="lifecycle"
          sizeColumnsToFitFlag={true}
          adjustTableHeight={true}
        />
      </div>
    </Card>
  );
};

const mapStateToProps = (state) => {
  return {
    planDetails: planDashboardServiceActions.planDetailsDataSelector(state)
      ?.data,
    columnHeaderJson: planDashboardServiceActions.columnHeaderJsonSelector(
      state
    ),
    screenConfiguration: commonAssortServiceActions.screenConfigurationSelector(
      state
    ),
    levelsJson: planDashboardServiceActions.levelsJsonDataSelector(state),
    finalisePlanMetricsData: planFinalizeServiceActions.finalisePlanMetricsDataSelector(
      state
    ),
  };
};

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators(
    {
      getCoreReplenChoice,
      getAssortmentSummaryData,
      addSnack,
    },
    dispatch
  );
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ReviewAssortmentComponent);
