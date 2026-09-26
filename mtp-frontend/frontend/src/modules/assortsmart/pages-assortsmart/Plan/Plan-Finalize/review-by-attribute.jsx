import React, { useState, useEffect, useRef } from "react";
import { connect } from "react-redux";
import { Card, Typography } from "@mui/material";
import globalStyles from "core/Styles/globalStyles";
import { getColumnsAg } from "core/actions/tableColumnActions";
import { isEmpty } from "lodash";
import { PLAN_FINALIZE_REVIEW_BY_ATTRIBUTE_METRICS } from "../../../constants-assortsmart/stringContants";
import AgGridTable from "core/Utils/agGrid";
import { getTotalFooter } from "./plan-finalize-function";
import * as planDashboardServiceActions from "modules/assortsmart/services-assortsmart/Plan-Dashboard/plan-dashboard-service";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";

const ReviewByAttributeComponent = (props) => {
  const [
    reviewByAttributeTableColumns,
    setReviewByAttributeTableColumns,
  ] = useState([]);
  const [reviewByAttributeTableData, setReviewByAttributeTableData] = useState(
    []
  );
  const reviewAttrInstance = useRef({});

  useEffect(() => {
    const fetchReviewAttributeData = async () => {
      let finalizeAttributeCols = await getColumnsAg(
        "table_name=assort_finalize_attribute",
        props.columnHeaderJson
      )();
      finalizeAttributeCols?.length &&
        setReviewByAttributeTableColumns(finalizeAttributeCols);
    };
    fetchReviewAttributeData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const formatedAttributeData = [];
    setReviewByAttributeTableData([]);
    if (props.gradeAttrDetailData?.length) {
      props.gradeAttrDetailData &&
        props.gradeAttrDetailData.forEach((value) => {
          const { attribute_name, attribute_value } = value;
          const item = {};
          item.attribute_name = attribute_name;
          item.plan_finalize_grade_id = value.plan_finalize_grade_id;
          item.uniqueID = attribute_name + "_" + attribute_value.type;
          if (!isEmpty(attribute_value)) {
            item.attribute_value = attribute_value.type;
            PLAN_FINALIZE_REVIEW_BY_ATTRIBUTE_METRICS.forEach((metricData) => {
              item[metricData] = attribute_value[metricData];
              return item;
            });
            attribute_value.type = replaceSpecialCharacter(attribute_value.type);
            formatedAttributeData.push(item);
            return value;
          }
        });
      getTotalFooter(formatedAttributeData);
      setReviewByAttributeTableData(formatedAttributeData);
    }
  }, [props.gradeAttrDetailData]);

  const loadTableInstance = (params) => {
    reviewAttrInstance.current = params;
  };

  const globalClasses = globalStyles();

  return (
    <Card className={globalClasses.paper} id="attribute-table">
      <div>
        <Typography variant="h3">
          Selected value- {props.selectedRowData?.l3_name}
        </Typography>
      </div>
      <div>
        <AgGridTable
          columns={reviewByAttributeTableColumns}
          rowdata={reviewByAttributeTableData || []}
          loadTableInstance={loadTableInstance}
          sideBar={false}
          pagination={false}
          tableId={"attribute-table"}
          uniqueRowId="uniqueID"
          sizeColumnsToFitFlag={true}
          adjustTableHeight={true}
        />
      </div>
    </Card>
  );
};

const mapStateToProps = (state) => {
  return {
    columnHeaderJson: planDashboardServiceActions.columnHeaderJsonSelector(
      state
    ),
  };
};

export default connect(mapStateToProps, {})(ReviewByAttributeComponent);
