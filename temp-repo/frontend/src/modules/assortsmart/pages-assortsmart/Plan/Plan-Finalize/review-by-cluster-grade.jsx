import React, { useState, useEffect, useRef } from "react";
import { connect } from "react-redux";
import { Card, Typography } from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import { isEmpty, cloneDeep } from "lodash";
import Form from "core/Utils/form";
import { addSnack } from "core/actions/snackbarActions";

import globalStyles from "core/Styles/globalStyles";
import { getColumnsAg } from "core/actions/tableColumnActions";
import {
  getReviewByClusterGradeData,
  setReviewByClusterGradeData,
} from "../../../services-assortsmart/Plan/Plan-Finalize/plan-finalize-service";
import {
  isWholesalePlan,
  removeNumberFromText,
  isDropPlan,
  scrollIntoView,
  isEcomPlan,
} from "../../../utils-assortsmart/utilityFunctions";
import PlanDropTabViewComponent from "../plan-drop-tab-view-component";
import AgGridTable from "core/Utils/agGrid";
import {
  displaySnackMessage,
  generateDropDownOptions,
  getTotalFooter,
  getFormattedClusterGradeData,
  getReviewByClusterGradeDataPayload,
  fetchGradeListBasedOnChannel,
  configureFormFields,
} from "./plan-finalize-function";
import { bindActionCreators } from "redux";
import * as planDashboardServiceActions from "modules/assortsmart/services-assortsmart/Plan-Dashboard/plan-dashboard-service";
import * as planFinalizeServiceActions from "modules/assortsmart/services-assortsmart/Plan/Plan-Finalize/plan-finalize-service";
import * as commonAssortServiceActions from "modules/assortsmart/services-assortsmart/common-assort-service";

const ReviewByAttributeGradeComponent = (props) => {
  const useStyles = makeStyles(() => ({
    tableContainer: {
      height: "400px",
      overflow: "scroll",
    },
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
          color: "yellow",
          maxHeight: "7.5rem",
        },
      },
    },
  }));

  const [
    reviewByClusterGradeTableColumns,
    setReviewByClusterGradeTableColumns,
  ] = useState([]);
  const [
    reviewByClusterGradeTableData,
    setReviewByClusterGradeTableData,
  ] = useState([]);
  const [
    reviewByClusterGradeFormData,
    setReviewByClusterGradeFormData,
  ] = useState({});

  const classes = useStyles();
  const globalClasses = globalStyles();

  const [attributeGradeFormFields, setAttributeGradeFormFields] = useState([]);
  const [dropArray, setDropArray] = useState(null);
  const tableInstance = useRef({});
  const reviewByClusterGradeFilteredData = tableInstance?.current?.api
    ?.getModel()
    ?.rootNode.childrenAfterAggFilter?.map((node) => node.data);

  useEffect(() => {
    return () => {
      props.setReviewByClusterGradeData({});
    };
  }, []);

  useEffect(() => {
    const fetchReviewClusterGradeData = async () => {
      setReviewByClusterGradeTableData([]);
      if (!isEmpty(props.reviewByAttributeGrade?.data)) {
        let formattedClusterGradeData = getFormattedClusterGradeData(props);
        let tableData = cloneDeep(formattedClusterGradeData);
        if (tableData?.length > 1) {
          getTotalFooter(formattedClusterGradeData);
        }
        setReviewByClusterGradeTableData(formattedClusterGradeData);
        tableInstance?.current?.api?.refreshCells({
          force: true,
          suppressFlash: false,
        });
        props.set2_4_Loader(false);
      }
    };
    fetchReviewClusterGradeData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.reviewByAttributeGrade]);

  useEffect(() => {
    const fetchTableData = async () => {
      setReviewByClusterGradeFormData({});
      if (
        !isEmpty(props.finalisePlanMetricsData) &&
        props.finalisePlanMetricsData?.[0]?.l1FilterValue?.[0]?.attribute_list
          ?.length
      ) {
        props.set2_4_Loader(true);
        let reviewAttributeGradeFormValues = props.finalisePlanMetricsData?.[0];
        let defaultChannel = { value: props.planDetails.channel?.[0] };
        let selectedDrop =
          reviewAttributeGradeFormValues?.l1FilterValue?.[0]
            ?.attribute_list?.[0];
        configureFormFields(
          reviewAttributeGradeFormValues,
          reviewByClusterGradeFormData,
          selectedDrop,
          defaultChannel,
          setAttributeGradeFormFields,
          setReviewByClusterGradeFormData,
          setDropArray,
          "cluster_grade",
          props
        );

        if (
          props.optimiseAttributeResponse === "True" ||
          !props.initialLoadFinalize ||
          props.fromDashboardScreen_2_4
        ) {
          //WholeSale plan clusters are inserted as STB_Amazon2 etc which needs to be trimmed to STB_Amazon
          let data = {
            l1_name_list:
              reviewAttributeGradeFormValues?.l1FilterValue?.[0]
                ?.l1_name_list?.[0],
            l2_name_list:
              reviewAttributeGradeFormValues?.l1FilterValue?.[0]
                ?.l2_name_list?.[0],
            grade_list: reviewByClusterGradeFormData.grade_list,
            attribute_list:
              reviewAttributeGradeFormValues?.l1FilterValue?.[0]
                ?.attribute_list?.[0],
            [`${props.screenConfiguration?.common?.flow_key || "flow"}_list`]:
              reviewByClusterGradeFormData?.[
                `${props.screenConfiguration?.common?.flow_key || "flow"}_list`
              ] ||
              reviewAttributeGradeFormValues?.l1FilterValue?.[0]?.[
                `${props.screenConfiguration?.common?.flow_key || "flow"}_list`
              ]?.[selectedDrop]?.[0],
              channel_list: reviewByClusterGradeFormData?.channel_list,
          };
          setReviewByClusterGradeFormData(data)
          fetchAttributeGradeTableData(data);
        } else {
          if (
            !isEmpty(props.optimiseAttributeResponse) &&
            props.optimiseAttributeResponse === "False"
          )
            displaySnackMessage(
              "Optimise by attribute split returned status False",
              "error",
              props
            );
        }
      }
    };
    fetchTableData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.finalisePlanMetricsData, props.optimiseAttributeResponse]);

  useEffect(() => {
    if (
      props.selectedDropData &&
      isDropPlan(
        props.planDetails,
        `${props.screenConfiguration?.common?.drop_key || "drops"}_count`
      ) &&
      reviewByClusterGradeTableColumns?.length
    ) {
      let reviewAttributeGradeFormValues =
        props.finalisePlanMetricsData?.[0]?.l1FilterValue?.[0];
      if (!isEcomPlan(props.planDetails)) {
        let flowOptions = generateDropDownOptions(
          reviewAttributeGradeFormValues[
            `${props.screenConfiguration?.common?.flow_key || "flow"}_list`
          ][props.selectedDropData]
        );
        attributeGradeFormFields?.forEach((field) => {
          if (
            field.accessor ===
            `${props.screenConfiguration?.common?.flow_key || "flow"}_list`
          ) {
            field.options = flowOptions;
          }
        });
        setAttributeGradeFormFields(attributeGradeFormFields);
      }
      let reviewFormData = {
        ...reviewByClusterGradeFormData,
        attribute_list: props.selectedDropData,
        [`${
          props.screenConfiguration?.common?.flow_key || "flow"
        }_list`]: reviewAttributeGradeFormValues?.[
          `${props.screenConfiguration?.common?.flow_key || "flow"}_list`
        ]?.[props.selectedDropData]?.[0],
      };
      setReviewByClusterGradeFormData(reviewFormData);
      fetchAttributeGradeTableData(reviewFormData);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.selectedDropData]);

  const fetchReviewClusterGradeColumn = async () => {
    setReviewByClusterGradeTableColumns([]);
    let finalizeAttributeGradeCols = await getColumnsAg(
      "table_name=assort_finalize_attr_grade",
      props.columnHeaderJson
    )();
    finalizeAttributeGradeCols.forEach((obj) => {
      if (obj.column_name === "review") {
        obj.editable = false;
      }
    });
    finalizeAttributeGradeCols?.length &&
      setReviewByClusterGradeTableColumns(finalizeAttributeGradeCols);
  };

  const fetchAttributeGradeTableData = async (formData) => {
    try {
      props.set2_4_Loader(true);
      let payload = getReviewByClusterGradeDataPayload(formData, props);
      let body = { ...payload };
      let resBody = await props.getReviewByClusterGradeData(
        body,
        props.screenConfiguration?.common?.endpoint_project_name || "assort"
      );
      fetchReviewClusterGradeColumn();
      props.setReviewByClusterGradeData(resBody.data);
    } catch (err) {
      displaySnackMessage("Something went wrong", "error", props);
    }
  };

  const openReviewByAttribute = (value) => {
    scrollIntoView("attribute-table");
    props.showReviewByAttribute(true, value.data);
  };

  const handleChangeReviewByAttributeGradeFilter = (updatedFormData, id) => {
    if (isWholesalePlan(props.planDetails)) {
      //WholeSale plan clusters are inserted as STB_Amazon2 etc which needs to be trimmed to STB_Amazon
      updatedFormData.grade_list = removeNumberFromText(
        updatedFormData.grade_list
      );
    }
    if (id === "channel_list") {
      let grade_list = fetchGradeListBasedOnChannel(
        updatedFormData.channel_list,
        props
      );
      attributeGradeFormFields.forEach((fields) => {
        if (fields.accessor === "grade_list") {
          fields.options = generateDropDownOptions(grade_list);
        }
      });
      updatedFormData.grade_list = Array.isArray(updatedFormData.channel_list)
        ? grade_list
        : grade_list[0];
      setAttributeGradeFormFields(attributeGradeFormFields);
    }
    if (id === "attribute_list") {
      let reviewAttributeGradeFormValues =
        props.finalisePlanMetricsData?.[0]?.l1FilterValue?.[0];
      attributeGradeFormFields[
        attributeGradeFormFields.length - 1
      ].options = generateDropDownOptions(
        reviewAttributeGradeFormValues[
          `${props.screenConfiguration?.common?.flow_key || "flow"}_list`
        ][updatedFormData[id]]
      );
      updatedFormData[
        `${props.screenConfiguration?.common?.flow_key || "flow"}_list`
      ] =
        reviewAttributeGradeFormValues[
          `${props.screenConfiguration?.common?.flow_key || "flow"}_list`
        ]?.[updatedFormData[id]]?.[0];
    }
    if (id === "grade_list") {
      if (!updatedFormData.grade_list?.length) {
        props.addSnack({
          message: "Cluster grade value can't be empty",
          options: {
            variant: "error",
          },
        });
        props.set2_4_Loader(false);
        return;
      }
    }
    props.set2_4_Loader(true);
    setReviewByClusterGradeFormData(updatedFormData);
    props.showReviewByAttribute(false);
    fetchAttributeGradeTableData(updatedFormData);
  };

  const setNewTableInstance = (params) => {
    tableInstance.current = params;
  };

  return (
    <Card className={`${globalClasses.paper} ${classes.tableContainer}`}>
      <div className={classes.headerContainer}>
        <Typography variant="h3">Review By Attribute grade</Typography>
        <div className={classes.formContainer}>
          <Form
            layout={"vertical"}
            maxFieldsInRow={5}
            fields={attributeGradeFormFields}
            updateDefaultValue={false}
            defaultValues={reviewByClusterGradeFormData}
            handleChange={handleChangeReviewByAttributeGradeFilter}
            handleDropdownClose={true}
            sizeOfFieldsInRow={1.9}
          ></Form>
        </div>
      </div>
      {dropArray && Object.keys(dropArray)?.length ? (
        <div>
          <PlanDropTabViewComponent
            groupedDrops={dropArray}
            onChangeTab={props.setSelectedDropData}
            selectedTab={props.selectedDropData}
          />
        </div>
      ) : null}
      <div>
        <AgGridTable
          columns={reviewByClusterGradeTableColumns || []}
          rowdata={reviewByClusterGradeTableData || []}
          onReviewClick={(tableInfo) => openReviewByAttribute(tableInfo)}
          loadTableInstance={setNewTableInstance}
          uniqueRowId="uniqueID"
          sideBar={false}
          pagination={false}
          tableId={"cluster-grade-table"}
          sizeColumnsToFitFlag={true}
          adjustTableHeight={
            reviewByClusterGradeFilteredData?.length &&
            reviewByClusterGradeFilteredData?.length <= 2
              ? true
              : false
          }
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
    columnHeaderJson: planDashboardServiceActions.columnHeaderJsonSelector(
      state
    ),
    finalisePlanMetricsData: planFinalizeServiceActions.finalisePlanMetricsDataSelector(
      state
    ),
    reviewByAttributeGrade: planFinalizeServiceActions.reviewByAttributeGradeSelector(
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
      getReviewByClusterGradeData,
      setReviewByClusterGradeData,
      getColumnsAg,
      addSnack,
    },
    dispatch
  );
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ReviewByAttributeGradeComponent);
