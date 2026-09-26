import { useState, useEffect, useRef } from "react";
import AgGridTable from "core/Utils/agGrid";
import { useHistory } from "react-router";
import { connect } from "react-redux";
import {
  CORE_CHOICE_CONFIGURATION_METRICS,
  coreChoicePlanLevels,
} from "modules/assortsmart/constants-assortsmart/stringContants";
import { getSeasonOptions } from "modules/assortsmart/services-assortsmart/Plan-Dashboard/plan-dashboard-service";
import {
  createCoreChoiceConfiguration,
  setCoreChoiceLoader,
  getCoreChoiceTableData,
  setCoreChoiceTableData,
} from "modules/assortsmart/services-assortsmart/CoreChoiceConfiguration/core-choice-configuration-service";
import { addSnack } from "core/actions/snackbarActions";
import { assortAgGridCustomCellRenderer } from "modules/assortsmart/utils-assortsmart/utilityFunctions";

const CoreChoiceConfigurationTable = (props) => {
  const [
    coreChoiceDashboardTableData,
    setCoreChoiceDashboardTableData,
  ] = useState([]);
  const history = useHistory();
  const allDoorCCInstance = useRef({});  

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const configureViewButton = (responseData, key) => {
    //Add View button for mapped & unmapped column if mapped/unmapped column contains plan names
    return responseData.map((data) => {
      return {
        ...data,
        [key]: data[key] === null || data[key].length === 0 ? null : "View",
      };
    });
  };

  const onSelectionChange = () => {
    // fetch all selected rows
    let selectedRows = [];
    allDoorCCInstance.current.api.forEachNode((node) => {
      node.selected && selectedRows.push({ ...node.data, is_selected: true });
    });
    props.setselectedPlans(selectedRows);
  };

  const getCoreChoiceTableData = () => {
    const tableData = props.coreChoiceTableData;
    const mappedUnmappedPlanPattern = /\{([^}]+)\}/;
    setCoreChoiceDashboardTableData([]);
    if (tableData?.length) {
      let coreChoiceData = [];
      tableData.forEach((row) => {
        let coreChoiceTableObj = {};
        CORE_CHOICE_CONFIGURATION_METRICS.forEach((metric) => {
          if (metric === "season_name") {
            coreChoiceTableObj["season"] = row[metric];
          } else if (metric === "mapped" || metric === "unmapped") {
            //mapped & unmapped plan values are being sent as "{plan1, plan2}", to get plan1 & plan2 from "{plan1, plan2}"
            const result = mappedUnmappedPlanPattern.exec(row[metric]);
            const mappedUnmappedPlans =
              result != null ? result[1].split(",") : [];
            coreChoiceTableObj[metric + "_plans"] = mappedUnmappedPlans;
            coreChoiceTableObj[metric] = mappedUnmappedPlans;
          } else {
            coreChoiceTableObj[metric] = row[metric];
          }
        });
        coreChoiceData.push(coreChoiceTableObj);
      });
      coreChoiceData = configureViewButton(coreChoiceData, "mapped");
      coreChoiceData = configureViewButton(coreChoiceData, "unmapped");
      setCoreChoiceDashboardTableData(coreChoiceData);
    }
  };

  const updateAllDoorCCPayload = (tableData) => {
    const coreChoiceData = [];
    let coreChoiceObj = {},
      filters = [],
      levels = {};
    for (const row of tableData) {
      coreChoiceObj = {};
      filters = [];
      for (const key in row) {
        if (coreChoicePlanLevels.includes(key)) {
          if (row[key]) {
            if (key === "year" || key === "season_id") {
              coreChoiceObj[key] = row[key];
            } else {
              levels[key] = row[key];
            }
            if (key !== "sub_channel") {
              filters.push({
                attribute_name: key,
                value: [row[key]],
                operator: "in",
                prefix: "levels",
              });
            }
          }
        }
        coreChoiceObj["levels"] = levels;
        coreChoiceObj["filters"] = filters;
        coreChoiceObj["core_choice_id"] = row["core_choice_id"];
        coreChoiceObj["is_finalised_plan"] = row["is_finalised_plan"];
        coreChoiceObj["all_door_cc"] = row["all_door_cc"];
      }
      coreChoiceData.push(coreChoiceObj);
    }
    return coreChoiceData;
  };

  const handleUpdateAllDoorCC = async (tableData) => {
    try {
      setCoreChoiceDashboardTableData([]);
      const coreChoicePayload = updateAllDoorCCPayload(tableData);
      const reqBody = {
        core_choice_data: coreChoicePayload,
      };
      const updatedCoreChoice = await props.createCoreChoiceConfiguration(
        reqBody,
        props.screenConfiguration?.common?.endpoint_project_name || "assort"
      );
      if (updatedCoreChoice?.data.status) {
        displaySnackMessages("All-door Choice updated successfully", "success");
        const reqData = {
          filters: [],
        };
        props.setCoreChoiceTableData([]);
        const coreChoiceTableData = await props.getCoreChoiceTableData(
          reqData,
          props.screenConfiguration?.common?.endpoint_project_name || "assort"
        );
        props.setCoreChoiceTableData(coreChoiceTableData.data.data.data);
      }
    } catch (error) {
      displaySnackMessages("Updation of All-door choice failed", "error");
    }
  };

  const updateAllDoorCC = async (
    e,
    rowData,
    column,
    isChanged,
    newValue,
    initialValue
  ) => {
     const tableData = []
     let oldTableData = props.coreChoiceTableData
     oldTableData.map((row)=>{
      if(row.core_choice_id === e.data.core_choice_id){
        let updatedRow = {...row,"all_door_cc":e.newValue}
        tableData.push(updatedRow)
      }
      else{
        tableData.push(row)
      }
     })
     
     props.setCoreChoiceLoader(true);
     await handleUpdateAllDoorCC(tableData);
     allDoorCCInstance.current.api.deselectAll();
     props.setCoreChoiceLoader(false);
  };
  
  const loadTableInstance = (params) => {
    allDoorCCInstance.current = params;
  };

  useEffect(() => {
    if (!props.showAllDoor) {
      allDoorCCInstance.current.api.deselectAll();
      props.setShowAllDoor(true);
    }
    // eslint-disable-next-line
  }, [props.showAllDoor]);

  useEffect(() => {
    getCoreChoiceTableData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.coreChoiceTableData]);
  return (
    <>
      <AgGridTable
        rowdata={coreChoiceDashboardTableData}
        columns={props.coreChoiceColumns}
        loadTableInstance={loadTableInstance}
        onCellValueChanged = {updateAllDoorCC}
        customCellRenderer={(cellProps) =>
          assortAgGridCustomCellRenderer(cellProps, "all-door-cc", history)
        }
        sideBar={false}
        selectAllHeaderComponent={true}
        onSelectionChanged={onSelectionChange}
      />
    </>
  );
};

const mapStateToProps = (state) => {
  return {
    loader:
      state.assortsmartReducer.coreChoiceConfigurationReducer.coreChoiceLoading,
    screenConfiguration:
      state.assortsmartReducer.commonAssortReducer.screenConfiguration,
  };
};
const mapActionsToProps = {
  getSeasonOptions,
  createCoreChoiceConfiguration,
  setCoreChoiceLoader,
  addSnack,
  getCoreChoiceTableData,
  setCoreChoiceTableData,
};
export default connect(
  mapStateToProps,
  mapActionsToProps
)(CoreChoiceConfigurationTable);
