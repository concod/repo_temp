import React, { useState, useEffect, useRef } from "react";
import { connect } from "react-redux";
import { withRouter } from "react-router-dom";
import AgGridTable from "core/Utils/agGrid";
import { groupByCustom } from "core/Utils/formatter";
import { COMPARE_PLAN_CLUSTER_METRICS } from "modules/assortsmart/constants-assortsmart/stringContants";
import { cloneDeep } from "lodash";
import {getComparePlanTableFooter } from "./compare-plan-functions";

const ComparePlanClusterTable = (props) => {
  const [compareClusterLevelRowdata, setCompareClusterLevelRowData] = useState(
    []
  );
  const {
    compareClusterLevelColumns,
    compareClusterLevelRows,
  } = props;
  const comparePlanClusterInstance = useRef({});

  const loadTableInstance = (params) => {
    comparePlanClusterInstance.current = params;
  }

  const getTableData = () => {
    let table_data = cloneDeep(compareClusterLevelRows);
    if (table_data?.length) {
      table_data = table_data.filter((data)=>{
        return data.l3_name === props.selectedL3FilterValue.value;
      })
      //To group data based on cluster
      const groupBy_properties = ["cluster_name"];
      const group_data = groupByCustom({
        Group: table_data,
        By: groupBy_properties,
      });
      let rowdata = [];
      for (let index of group_data) {
        let rowObject = {};
        let item = index;
        for (let i = 0; i < item.length; i++) {
          rowObject["l2_name"] = item[i]["l2_name"];
          rowObject["l3_name"] = item[i]["l3_name"];
          rowObject["l1_name"] = item[i]["l1_name"];
          rowObject["cluster_name"] = item[i]["cluster_name"];
          COMPARE_PLAN_CLUSTER_METRICS.forEach((metric) => {
            rowObject[metric + "plan" + (i + 1)] = item[i][metric + "ty"];
            return rowObject;
          });
        }
        rowdata.push(rowObject);
      }
      const totalObj = getComparePlanTableFooter(rowdata, compareClusterLevelColumns);
      totalObj["cluster_name"] = "Total";
      rowdata.push(totalObj);
      setCompareClusterLevelRowData(rowdata);
    }else{
      setCompareClusterLevelRowData([])
    }
  };

  useEffect(() => {
    getTableData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compareClusterLevelRows]);
  return (
    <>
    {compareClusterLevelColumns.length && (
      <AgGridTable
        rowdata={compareClusterLevelRowdata || []}
        columns={compareClusterLevelColumns}
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
    comparePlanClusterData:
      store.assortsmartReducer.comparePlanReducer.comparePlanClusterTableData,
  };
};
export default connect(mapStateToProps)(withRouter(ComparePlanClusterTable));
