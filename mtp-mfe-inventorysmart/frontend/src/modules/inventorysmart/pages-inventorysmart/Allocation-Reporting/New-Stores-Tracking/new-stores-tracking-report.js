import React, { useEffect } from "react";
import Loader from "core/Utils/Loader/loader";
import { connect } from "react-redux";
import { makeStyles } from "@mui/styles";
import NewStoresTrackingTable from "./new-stores-tracking-table";
import NewStoresTrackingKpiCards from "./new-stores-tracking-kpi-cards";
import NewStoresTrackingGraph from "./new-stores-tracking-graph";
import { 
  clearNewStoresTrackingStates,
} from "modules/inventorysmart/services-inventorysmart/Allocation-Reports/new-stores-tracking-services";
import { isEmpty } from "lodash";
import { addSnack } from "core/actions/snackbarActions";


const useStyles = makeStyles((theme) => ({
  tableContainer: {
    marginTop: 0,
  },
  graphContainer: {
    marginTop: theme.spacing(2),
    marginBottom: "24px",
  },
  kpiContainer: {
    marginBottom: theme.spacing(2),
  },
}));

const NewStoresTrackingReport = (props) => {
  const classes = useStyles();
  
  useEffect(() => {
    return () => {
      props?.clearNewStoresTrackingStates();
    };
  }, []);

  return (
    <>
          <Loader loader={props.newStoresTrackingKpiLoader}>
            <div className={classes.kpiContainer} style={{ minHeight: props.newStoresTrackingKpiLoader ? '200px' : 'auto' }}>
              {!isEmpty(props.newStoresTrackingKpiData) && (
                <NewStoresTrackingKpiCards
                  kpiData={props.newStoresTrackingKpiData}
                />
              )}
            </div>
          </Loader>
          <Loader loader={props.newStoresTrackingGraphLoader}>
          <div className={classes.graphContainer} style={{ minHeight: props.newStoresTrackingGraphLoader ? '200px' : 'auto' }}>
              {props.loadGraphData && (
                <NewStoresTrackingGraph
                  graphData={props.newStoresTrackingGraphData}
                />
              )}
          </div>
          </Loader>
          {props?.isFiltersValid && (
            <div className={classes.tableContainer}>
              <Loader loader={props.newStoresTrackingTableLoader}>
                <NewStoresTrackingTable
                  addSnack={props.addSnack}
                />
              </Loader>
            </div>
          )}
    </>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer } = store;
  return {
    cache: store.inventorysmartReducer?.activeModulesCacheService?.cache,
    newStoresTrackingKpiData:
      inventorysmartReducer?.inventorySmartNewStoresTrackingService
        ?.newStoresTrackingKpiData,
    newStoresTrackingGraphData:
      inventorysmartReducer?.inventorySmartNewStoresTrackingService
        ?.newStoresTrackingGraphData,
    isFiltersValid:
      inventorysmartReducer?.inventorySmartNewStoresTrackingService
        ?.isFiltersValid,
    loadGraphData: inventorysmartReducer.inventorySmartNewStoresTrackingService?.loadGraphData,
    newStoresTrackingKpiLoader:
      inventorysmartReducer?.inventorySmartNewStoresTrackingService
        ?.newStoresTrackingKpiLoader,
    newStoresTrackingGraphLoader:
      inventorysmartReducer?.inventorySmartNewStoresTrackingService
        ?.newStoresTrackingGraphLoader,
    newStoresTrackingTableLoader:
      inventorysmartReducer?.inventorySmartNewStoresTrackingService
        ?.newStoresTrackingTableLoader,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    clearNewStoresTrackingStates: () =>
      dispatch(clearNewStoresTrackingStates()),
    addSnack: (snack) => dispatch(addSnack(snack))
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(NewStoresTrackingReport);
