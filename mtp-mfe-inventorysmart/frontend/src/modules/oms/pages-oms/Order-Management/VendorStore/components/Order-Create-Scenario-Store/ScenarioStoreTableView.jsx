import React, { useState, useEffect, useRef } from "react";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import { connect } from "react-redux";
import Loader from "core/Utils/Loader/loader";
import AgGridComponent from "core/Utils/agGrid";
import { isEmpty } from "lodash";
import {
  getScenarioViewTableConfigurationStore,
  setDeepDiveTableConfigLoader,
  setDeepDiveTableLoader,
} from "modules/oms/services-oms/Order-Management/order-management-vendor-to-store-service";
import DeepDiveDownload from "../../../Order-Deep-Dive/DeepDiveDownload";

const ScenarioStoreTableView = function (props) {
  console.log("props", props);
  const classes = useStyles();
  const tableGridInstance = useRef(null);
  const [
    createScenarioViewTableData,
    setCreateScenarioViewTableData,
  ] = useState([]);
  const [loader, setLoader] = useState(true);

  const loadTableInstance = (params) => {
    tableGridInstance.current = params;
  };

  //Enable loader when the data is updated
  useEffect(() => {
    setLoader(true);
  }, [props.createScenarioViewTableData]);

  //Update the data and refresh the table
  useEffect(() => {
    if (loader) {
      const safeData = Array.isArray(props?.createScenarioViewTableData)
        ? props.createScenarioViewTableData
        : [];
      setCreateScenarioViewTableData([...safeData]);
      setLoader(false);
    }
  }, [loader]);

  const getTopRightOptions = () => {
    const topRightOptions = [];

    // Check access control for scenario download
    const canDownload = !isEmpty(props?.userAccess)
      ? props?.isUserHasScenarioDownloadAccess
      : true; // Default to true for backward compatibility

    if (canDownload) {
      topRightOptions.push(
        <>
          <DeepDiveDownload
            weekRange={props?.weekRange}
            simulateDownloadData={props?.simulateDownloadData}
            isCreateScenarioDownload={true}
            isCalledFromVendorToStore={true}
          />
        </>
      );
    }
    return topRightOptions;
  };

  return (
    <div>
      <Loader loader={loader} minHeight={"260px"}>
        {props?.columns?.length > 0 && (
          <div className={classes.gridContainer}>
            <AgGridComponent
              pagination={false}
              columns={loader ? [] : props?.columns}
              rowdata={loader ? [] : createScenarioViewTableData}
              tableHeader="Scenario Store Table"
              loadTableInstance={loadTableInstance}
              topRightOptions={getTopRightOptions()}
            />
          </div>
        )}
      </Loader>
    </div>
  );
};

const mapStateToProps = (store) => {
  return {
    deepDiveTableConfigLoader:
      store.omsReducer.orderManagementVendorToStoreService
        .deepDiveTableConfigLoader,
    deepDiveTableLoader:
      store.omsReducer.orderManagementVendorToStoreService.deepDiveTableLoader,
    createScenarioViewTableData:
      store.omsReducer.orderManagementService.createScenarioViewTableData,
  };
};

const mapDispatchToProps = (dispatch) => ({
  getScenarioViewTableConfigurationStore: (payload) =>
    dispatch(getScenarioViewTableConfigurationStore(payload)),
  setDeepDiveTableConfigLoader: (payload) =>
    dispatch(setDeepDiveTableConfigLoader(payload)),
  setDeepDiveTableLoader: (payload) =>
    dispatch(setDeepDiveTableLoader(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ScenarioStoreTableView);
