import React, { useState, useEffect, useRef } from "react";
import { connect } from "react-redux";
import { Card, Typography, Button } from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import { cloneDeep, isEmpty } from "lodash";
import Form from "core/Utils/form";
import { addSnack } from "core/actions/snackbarActions";
import {
  getReviewBySizeData,
  setReviewBySizeData,
  updateSizeReviewData,
} from "../../../services-assortsmart/Plan/Plan-Finalize/plan-finalize-service";
import { useStyles as sharedStyles } from "core/Utils/styles/assortSmartUsestyles";
import globalStyles from "core/Styles/globalStyles";
import { isDropPlan } from "../../../utils-assortsmart/utilityFunctions";
import { REVIEW_BY_SIZE_FORM } from "../../../constants-assortsmart/stringContants";
import DownloadPOSheetComponent from "./plan-finalize-download-po-sheet-component";
import PlanDropTabViewComponent from "../plan-drop-tab-view-component";
import AgGridTable from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { bindActionCreators } from "redux";
import * as planDashboardServiceActions from "modules/assortsmart/services-assortsmart/Plan-Dashboard/plan-dashboard-service";
import * as planFinalizeServiceActions from "modules/assortsmart/services-assortsmart/Plan/Plan-Finalize/plan-finalize-service";
import * as commonAssortServiceActions from "modules/assortsmart/services-assortsmart/common-assort-service";
import {
  getReviewSizeTotalFooter,
  displaySnackMessage,
  generateDropDownOptions,
  getFormattedReviewSizeData,
  getReviewBySizeDataPayload,
  configureFormFields,
} from "./plan-finalize-function";
import { Switch } from "impact-ui";

const useStyles = makeStyles(() => ({
  headerContainer: {
    display: "flex",
    alignItems: "center",
    marginBottom: "1.5rem",
    whiteSpace: "nowrap",
    "& .MuiGrid-item": {
      marginLeft: "2rem",
      paddingLeft: "0",
    },
  },
  rightEnd: {
    display: "flex",
    height: "fit-content",
    marginRight: "auto",
    marginLeft: "auto",
    marginTop: "10px",
  },
}));

const ReviewBySizeTableComponent = (props) => {
  const [reviewBySizeTableColumns, setReviewBySizeTableColumns] = useState([]);
  const [reviewBySizeTableData, setReviewBySizeTableData] = useState([]);
  const [reviewBySizeFormData, setReviewBySizeFormData] = useState({});
  const [sizeFormFields, setSizeFormFields] = useState([]);
  const [dropArray, setDropArray] = useState([]);
  const [groupedDrops, setGroupedDrops] = useState(null);
  const [totalFooter, setTotalFooter] = useState([]);
  const ReviewSizeInstance = useRef({});
  const [sizePercentageView, setSizePercentageView] = useState(false);
  const [isSaveEnabled, setIsSaveEnabled] = useState(false);

  const sharedClasses = sharedStyles();
  const classes = useStyles();
  const globalClasses = globalStyles();
  const reviewBySizeFilteredData = ReviewSizeInstance?.current?.api
    ?.getModel()
    ?.rootNode.childrenAfterAggFilter?.map((node) => node.data);

  const handleSizeColumns = (columns) => {
    columns.forEach((item) => {
      if (
        item.column_name === "size_pen" ||
        item.column_name === "total_buy_pen"
      ) {
        item.is_hidden = sizePercentageView ? false : true;
        item.sub_headers?.forEach((sub_col) => {
          sub_col.is_hidden = sizePercentageView ? false : true;
        });
      }
      if (
        item.column_name === "size" ||
        item.column_name === "total_buy_units"
      ) {
        item.is_hidden = sizePercentageView ? true : false;
        item.sub_headers?.forEach((sub_col) => {
          sub_col.is_hidden = sizePercentageView ? true : false;
        });
      }
    });
    setReviewBySizeTableColumns(columns);
  };

  useEffect(() => {
    if (reviewBySizeTableColumns?.length) {
      let columns = cloneDeep(reviewBySizeTableColumns);
      handleSizeColumns(columns);
    }
  }, [sizePercentageView]);

  useEffect(() => {
    const fetchTableData = async () => {
      if (
        !isEmpty(props.finalisePlanMetricsData) &&
        props.finalisePlanMetricsData?.[0]?.l1FilterValue?.[0]?.attribute_list
          ?.length
      ) {
        props.set2_4_Loader(true);
        let dropList = cloneDeep(
          props.finalisePlanMetricsData?.[0]?.l1FilterValue?.[0]?.attribute_list
        );
        if (dropList?.length > 2) {
          setDropArray(dropList);
        } else {
          setDropArray(dropList.splice(0, 1));
        }
        let reviewSizeFormValues = props.finalisePlanMetricsData?.[0];
        let defaultChannel = { value: props.planDetails.channel?.[0] };
        let selectedDrop = props.selectedDropData
          ? props.selectedDropData
          : reviewSizeFormValues.l1FilterValue?.[0]?.attribute_list?.[0];
        configureFormFields(
          reviewSizeFormValues,
          reviewBySizeFormData,
          selectedDrop,
          defaultChannel,
          setSizeFormFields,
          setReviewBySizeFormData,
          setGroupedDrops,
          "size",
          props
        );

        if (
          props.optimiseResponse === "True" ||
          !props.initialLoadFinalize ||
          props.fromDashboardScreen_2_4
        ) {
          let data = {
            l1_name_list:
              reviewBySizeFormData?.l1_name_list ||
              reviewSizeFormValues.l1FilterValue?.[0]?.l1_name_list?.[0],
            l2_name_list:
              reviewBySizeFormData?.l2_name_list ||
              reviewSizeFormValues.l1FilterValue?.[0]?.l2_name_list?.[0] ||
              reviewSizeFormValues.l1FilterValue?.[0]?.l2_name,
            l3_name_list:
              reviewSizeFormValues.l2FilterValue?.[0]?.l3_name_list?.[0] ||
              reviewSizeFormValues.l1FilterValue?.[0]?.l3_name_list?.[0],
            attribute_list: props.selectedDropData
              ? props.selectedDropData
              : reviewSizeFormValues.l1FilterValue?.[0]?.attribute_list?.[0],
            [`${
              props.screenConfiguration?.common?.flow_key || "flow"
            }_list`]: reviewSizeFormValues.l1FilterValue?.[0]?.[
              `${props.screenConfiguration?.common?.flow_key || "flow"}_list`
            ]?.[selectedDrop]?.[0],
            channel_list:
              reviewBySizeFormData?.channel_list || defaultChannel?.value,
          };
          fetchReviewSizeTableData(data);
        } else {
          if (
            !isEmpty(props.optimiseResponse) &&
            props.optimiseResponse === "False"
          )
            displaySnackMessage(
              "Optimise by size split returned status False",
              "error",
              props
            );
        }
      }
    };
    fetchTableData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.finalisePlanMetricsData]);

  useEffect(() => {
    setReviewBySizeTableData([]);
    setTotalFooter([]);
    if (!isEmpty(props.reviewBySizeData.data)) {
      let col = agGridColumnFormatter(
        cloneDeep(props.reviewBySizeData.data?.columns),
        props.levelsJson
      );
      if (col?.length) {
        handleSizeColumns(col);
      }
      let formatedData = getFormattedReviewSizeData(props, sizePercentageView);
      let tableData = cloneDeep(formatedData);
      if (tableData?.length) {
        setTotalFooter(
          getReviewSizeTotalFooter(formatedData, sizePercentageView)
        );
      }
      setReviewBySizeTableData(formatedData);
      if (ReviewSizeInstance?.current?.api) {
        ReviewSizeInstance?.current?.api.refreshCells({
          force: true,
          suppressFlash: false,
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.reviewBySizeData, sizePercentageView]);

  useEffect(() => {
    if (
      props.selectedDropData &&
      isDropPlan(
        props.planDetails,
        `${
          props.screenConfiguration?.common?.drop_key.includes("drop")
            ? "drops"
            : props.screenConfiguration?.common?.drop_key || "drops"
        }_count`
      )
    ) {
      let reviewSizeFormValues =
        props.finalisePlanMetricsData?.[0]?.l1FilterValue?.[0];
      let flowOptions = generateDropDownOptions(
        reviewSizeFormValues[
          `${props.screenConfiguration?.common?.flow_key || "flow"}_list`
        ][props.selectedDropData]
      );
      REVIEW_BY_SIZE_FORM[3].options = flowOptions;
      let reviewFormData = {
        ...reviewBySizeFormData,
        attribute_list: props.selectedDropData,
        [`${
          props.screenConfiguration?.common?.flow_key || "flow"
        }_list`]: reviewSizeFormValues[
          `${props.screenConfiguration?.common?.flow_key || "flow"}_list`
        ]?.[props.selectedDropData]?.[0],
      };
      setReviewBySizeFormData(reviewFormData);
      fetchReviewSizeTableData(reviewFormData);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.selectedDropData]);

  const handleChangeReviewBySizeFilter = (updatedFormData, id) => {
    props.set2_4_Loader(true);
    if (id === "attribute_list") {
      let reviewSizeFormValues =
        props.finalisePlanMetricsData?.[0]?.l1FilterValue?.[0];
      REVIEW_BY_SIZE_FORM[
        sizeFormFields.length - 1
      ].options = generateDropDownOptions(
        reviewSizeFormValues[
          `${props.screenConfiguration?.common?.flow_key || "flow"}_list`
        ][updatedFormData[id]]
      );
      updatedFormData[
        `${props.screenConfiguration?.common?.flow_key || "flow"}_list`
      ] =
        reviewSizeFormValues[
          `${props.screenConfiguration?.common?.flow_key || "flow"}_list`
        ]?.[updatedFormData[id]]?.[0];
    }
    if (id === "l1_name_list" || id === "l2_name_list") {
      if (id === "l1_name_list") {
        updatedFormData.l2_name_list = "";
      }
      props.fetchFinalisePlanMatrics(updatedFormData, "size");
    } else {
      fetchReviewSizeTableData(updatedFormData, true);
    }
    setReviewBySizeTableData([]);
    setReviewBySizeFormData(updatedFormData);
  };

  const fetchReviewSizeTableData = async (formData, shouldSetLoader) => {
    try {
      let payload = getReviewBySizeDataPayload(formData, props);
      let body = {
        ...payload,
      };
      let resBody = await props.getReviewBySizeData(
        body,
        props.screenConfiguration?.common?.endpoint_project_name || "assort",
        props.planDetails?.data?.plan_code
      );
      props.setReviewBySizeData(resBody.data);
      if (shouldSetLoader) {
        props.set2_4_Loader(false);
      }
    } catch (err) {
      displaySnackMessage("Something went wrong", "error", props);
    }
  };

  const setNewTableInstance = (params) => {
    ReviewSizeInstance.current = params;
  };

  const updateSizeTableData = (
    e,
    data,
    column,
    isChanged,
    value,
    initialValue
  ) => {
    setIsSaveEnabled(true);
    let colId = column.colDef.accessor;
    const tempData = [];
    ReviewSizeInstance?.current?.api?.forEachNode((eachRow) => {
      const rowData = eachRow?.data;
      if (rowData.master_ids === data?.master_ids) {
        rowData[colId] = value;
        let totalBuyUnits = 0;
        for (const key in rowData) {
          if (
            key?.includes("size") &&
            !key?.includes("pen") &&
            !key.includes("size_curve")
          ) {
            totalBuyUnits = totalBuyUnits + parseInt(rowData[key]);
          }
        }
        rowData["total_buy_units"] = totalBuyUnits;
      }
      tempData.push(rowData);
    });
    if (tempData?.length) {
      setTotalFooter(getReviewSizeTotalFooter(tempData, sizePercentageView));
    }
    setReviewBySizeTableData(tempData);
    ReviewSizeInstance.current.api.refreshCells({
      force: true,
      suppressFlash: false,
    });
  };

  const handleSaveSizeData = async () => {
    const payloadData = [];
    try {
      props.set2_4_Loader(true);
      if (isSaveEnabled) {
        setIsSaveEnabled(false);
      }
      reviewBySizeTableData?.forEach((record) => {
        let sizeDataRow = {};
        let attributes = {};
        let size = {},
          size_pen = {};
        for (const key in record) {
          if (
            key?.includes("size") &&
            key !== "size_curve" &&
            !key.includes("size_pen")
          ) {
            size[key] = record[key];
          } else if (key?.includes("size_pen")) {
            size_pen[key] = record[key];
          } else if (
            key === "total_buy_units" ||
            key === "choice_name" ||
            key === "stores"
          ) {
            if (key === "total_buy_units") {
              attributes["Quantity"] = record[key];
            } else {
              if (key === "stores") {
                sizeDataRow[key] = record[key];
              }
              attributes[key] = record[key];
            }
          } else if (key === "style_desc") {
            sizeDataRow["style_des"] = record[key];
          } else if (key !== "master_ids" && key !== "uniqueID") {
            sizeDataRow[key] = record[key];
          }
        }
        attributes = {
          ...attributes,
          size: size,
          penetration: size_pen,
        };
        sizeDataRow = {
          ...sizeDataRow,
          attributes: attributes,
          plan_code: props.planDetails?.plan_code,
        };
        payloadData.push(sizeDataRow);
      });
      const payload = {
        size_name_group: props.reviewBySizeData?.data?.size_name_group,
        data: payloadData,
      };
      const updatedData = await props.updateSizeReviewData(
        payload,
        "assort-smart",
        props.planDetails?.data?.plan_code
      );
      if (updatedData?.data?.status) {
        fetchReviewSizeTableData(reviewBySizeFormData, true);
      }
      props.set2_4_Loader(false);
    } catch (error) {
      props.set2_4_Loader(false);
      props.addSnack({
        message: "Updating size review data failed",
        options: {
          variant: "error",
        },
      });
    }
  };

  return (
    <Card className={globalClasses.paper}>
      <div className={classes.headerContainer}>
        <Typography variant="h3">Review By Size</Typography>
        <div className={sharedClasses.planFinalizeFormContainer}>
          <Form
            layout={"vertical"}
            maxFieldsInRow={5}
            handleChange={handleChangeReviewBySizeFilter}
            fields={sizeFormFields}
            updateDefaultValue={false}
            defaultValues={reviewBySizeFormData}
            handleDropdownClose={true}
            sizeOfFieldsInRow={1.9}
          ></Form>
        </div>
        {!props.screenConfiguration?.["2.4"]?.hide_size_toggle && (
          <div className={classes.rightEnd}>
            <Switch
              checked={sizePercentageView ? true : false}
              onChange={(e) => {
                setSizePercentageView(!sizePercentageView);
              }}
              disabled={reviewBySizeTableColumns?.length ? false : true}
              id="switch-size-percenatge-view"
              leftLabel="Units"
              rightLabel="Percentage"
            />
          </div>
        )}
        <DownloadPOSheetComponent
          reviewBySizeFormData={reviewBySizeFormData}
          dropArray={dropArray}
          selectedDrop={props.selectedDropData}
        />
        {/* <Button
          variant="contained"
          color="primary"
          className={sharedClasses.bottomButton}
          id="save-size-data"
          onClick={handleSaveSizeData}
          disabled={!isSaveEnabled}
        >
          Update
        </Button> */}
      </div>
      {groupedDrops && Object.keys(groupedDrops)?.length ? (
        <div>
          <PlanDropTabViewComponent
            groupedDrops={groupedDrops}
            onChangeTab={props.setSelectedDropData}
            selectedTab={props.selectedDropData}
          />
        </div>
      ) : null}
      <div>
        <AgGridTable
          columns={reviewBySizeTableColumns || []}
          rowdata={reviewBySizeTableData || []}
          loadTableInstance={setNewTableInstance}
          uniqueRowId="uniqueID"
          sideBar={false}
          tableId={"l3-name-select"}
          sizeColumnsToFitFlag={true}
          adjustTableHeight={
            reviewBySizeFilteredData?.length &&
            reviewBySizeFilteredData?.length <= 2
              ? true
              : false
          }
          pinnedBottomRowData={sizePercentageView ? [] : totalFooter}
          onBlur={updateSizeTableData}
          staticColId={true}
        />
      </div>
    </Card>
  );
};

const mapStateToProps = (state) => {
  return {
    planDetails: planDashboardServiceActions.planDetailsDataSelector(state)
      ?.data,
    planLevels: planDashboardServiceActions.planLevelsDataSelector(state),
    levelsJson: planDashboardServiceActions.levelsJsonDataSelector(state),
    finalisePlanMetricsData: planFinalizeServiceActions.finalisePlanMetricsDataSelector(
      state
    ),
    reviewBySizeData: planFinalizeServiceActions.reviewBySizeDataSelector(
      state
    ),
    screenConfiguration: commonAssortServiceActions.screenConfigurationSelector(
      state
    ),
  };
};

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators(
    {
      getReviewBySizeData,
      setReviewBySizeData,
      addSnack,
      updateSizeReviewData,
    },
    dispatch
  );
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ReviewBySizeTableComponent);
