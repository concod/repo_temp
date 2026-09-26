import React, { useState, useEffect, useRef } from "react";
import { connect } from "react-redux";
import { withRouter } from "react-router-dom";
import AgGridTable from "core/Utils/agGrid";
import { addSnack } from "core/actions/snackbarActions";
import { groupByCustom } from "core/Utils/formatter";
import { COMPARE_PLAN_L3_METRICS } from "modules/assortsmart/constants-assortsmart/stringContants";
import { getComparePlanTableFooter } from "./compare-plan-functions";

const ComparePlanTable = (props) => {
  const [compareL3LevelRowData, setCompareL3LevelRowData] = useState([]);
  const { compareL3LevelRows, compareL3LevelColumns } = props;
  const comparePlanL3Instance = useRef({});

  const loadTableInstance = (params) => {
    comparePlanL3Instance.current = params;
  }

  const getTableData = () => {
    const tableData = compareL3LevelRows;
    if (tableData?.length) {
      const groupByProperties = ["l3_name"];
      const groupResult = groupByCustom({
        Group: tableData,
        By: groupByProperties,
      });
      let data = [];
      for (let index of groupResult) {
        let rowObj = {};
        let item = index;
        for (let i = 0; i < item.length; i++) {
          rowObj["l2_name"] = item[i]["l2_name"];
          rowObj["l3_name"] = item[i]["l3_name"];
          rowObj["l1_name"] = item[i]["l1_name"];
          COMPARE_PLAN_L3_METRICS.forEach((metric) => {
            rowObj[metric + "plan" + (i + 1)] = item[i][metric + "ty"];
            rowObj[metric + "ly"] = item[i][metric + "ly"];
            return rowObj;
          });
        }
        data.push(rowObj);
      }
     const totalObj = getComparePlanTableFooter(data, compareL3LevelColumns);
     totalObj["l3_name"] = "Total";
     data.push(totalObj);
     setCompareL3LevelRowData(data);
    }
  };

  useEffect(() => {
    getTableData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <>
      {compareL3LevelColumns.length > 0 && (
        <AgGridTable
          rowdata={compareL3LevelRowData || []}
          columns={compareL3LevelColumns}
          loadTableInstance={loadTableInstance}
        />
      )}
    </>
  );
};
const mapStateToProps = (store) => {
  return {
    planDetails: store.assortsmartReducer.planDashboardReducer.planDetails,
    levelsJson: store.assortsmartReducer.planDashboardReducer.levelsJson,
    comparePlanTableData:
      store.assortsmartReducer.comparePlanReducer.comparePlanTableData,
  };
};

const mapDispatchToProps = (dispatch) => ({
  addSnack: (payload) => dispatch(addSnack(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(ComparePlanTable));
