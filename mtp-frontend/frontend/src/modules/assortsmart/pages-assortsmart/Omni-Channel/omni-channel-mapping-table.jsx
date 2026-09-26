import React, { useState, useEffect } from "react";
import { withRouter } from "react-router-dom";
import { connect } from "react-redux";
import AgGridTable from "core/Utils/agGrid";
import { groupByCustom, numbersWithComma } from "core/Utils/formatter";
import {
  setOmniLoader,
  setUpdatedOmniMappingData,
  setPlanNameToCodeMapping,
} from "modules/assortsmart/services-assortsmart/OmniChannel/omni-channel-service";
import * as commonAssortServiceActions from "modules/assortsmart/services-assortsmart/common-assort-service";
import { cloneDeep } from "lodash";
import { prepareOmniTableData } from "./omni-channel-function";
const OmniMappingTable = (props) => {
  const [omniMappingTableData, setOmniMappingTableData] = useState([]);

  const getOmniMappingTableData = () => {
    const omniData = props.omniMappingRows;
    if (omniData?.length) {
      const tableData = prepareOmniTableData(omniData, props.attributeList);
      setOmniMappingTableData(tableData);
    }
  };

  useEffect(() => {
    getOmniMappingTableData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.omniMappingRows]);

  const loadTableInstance = (params) => {
    props.omniAGInstance.current = params;
  };

  const updateOmniTableData = (params) => {
    const { column, newValue, rowIndex } = params;
    const columnId = column.colId;
    const tableData = [];
    let globalChoice = "";
    props.omniAGInstance.current.api.forEachNode((eachRow, index) => {
      if (index === rowIndex) {
        props.setIsSaveEnabled(true);
        eachRow.data[columnId] = newValue;
        globalChoice = eachRow?.data?.global_choice;
      }
      tableData.push(eachRow);
    });
    props.omniAGInstance.current.api.refreshCells({
      update: tableData,
    });
    const resultData =
      props.updatedOmniTableData.length > 0
        ? cloneDeep(props.updatedOmniTableData)
        : cloneDeep(props.omniMappingRows);

    //formatting table data according to payload required
    resultData.forEach((item) => {
      //If global choice id of item is equal to global choice id of changed item, then update value for particular item
      if (item.source_choice_id === globalChoice) {
        if (columnId.includes("attributes")) {
          const index = columnId.indexOf("_");
          const key = columnId.slice(index + 1);
          item.attribute_value[key] = newValue;
        } else if (columnId === "global_style") {
          item.attribute_value.global_style_number = newValue;
        }
        if (
          columnId === "colorway_season_id" ||
          columnId === "new_vs_carryover" ||
          columnId === "placeholder_description"
        ) {
          //Update the new inputed value directly to colorway_season_id, New Vs CarryOver & Placeholder Description columns
          item.attribute_value[columnId] = newValue;
        }
      }
      item["source_levels"] = {
        [props.screenConfiguration?.common?.drop_key || "drop"]: "-",
        l0_name: item.l0_name,
        l1_name: item.l1_name,
        l2_name: item.l2_name,
        l3_name: item.l3_name,
      };
    });
    props.setUpdatedOmniTableData(resultData);
    const omniUpdatePayload = [...resultData];
    //l0,l1,l2,l3 keys not needed in payload
    omniUpdatePayload.forEach((item) => {
      delete item.l0_name;
      delete item.l1_name;
      delete item.l2_name;
      delete item.l3_name;
    });
    //set payload in reducer & access when save button is clicked
    props.setUpdatedOmniMappingData(omniUpdatePayload);
  };

  return (
    <>
      <AgGridTable
        rowdata={omniMappingTableData || []}
        columns={props.omniMappingColumns}
        loadTableInstance={loadTableInstance}
        onCellValueChanged={updateOmniTableData}
        callDeleteApi={(tableInfo) => {
          props.onDeleteRowClick(tableInfo.data);
        }}
      />
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    omniMappingMetrics:
      store.assortsmartReducer.omniChannelReducer.omniMappingMetrics,
    omniLoader: store.assortsmartReducer.omniChannelReducer.omniLoader,
    planDetails: store.assortsmartReducer.planDashboardReducer.planDetails,
    planLevels: store.assortsmartReducer.planDashboardReducer.planLevels,
    screenConfiguration: commonAssortServiceActions.screenConfigurationSelector(
      store
    ),
  };
};

const mapActionsToProps = {
  setOmniLoader,
  setUpdatedOmniMappingData,
  setPlanNameToCodeMapping,
};

export default connect(
  mapStateToProps,
  mapActionsToProps
)(withRouter(OmniMappingTable));
