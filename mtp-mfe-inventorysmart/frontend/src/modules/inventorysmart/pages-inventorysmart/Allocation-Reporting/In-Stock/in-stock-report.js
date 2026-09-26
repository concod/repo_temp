import React, { useEffect } from "react";
import { connect } from "react-redux";
import { makeStyles } from "@mui/styles";
import InStockTableView from "./in-stock-table-view";
import InStockKpiCards from "./in-stock-kpi-cards";
import { 
  clearInStockStates
} from "modules/inventorysmart/services-inventorysmart/Allocation-Reports/in-stock-report-services";
import { isEmpty } from "lodash";

const useStyles = makeStyles(() => ({
  tableContainer: {
    marginTop: "24px",
  },
}));

const InStockReportTable = (props) => {
  const classes = useStyles();
  
  useEffect(() => {
    return () => {
      props?.clearInStockStates();
    };
  }, []);



  return (
    <>
     <div style={{minHeight:'450px'}}>
      {props?.showInStockDetails && (
        <div>
          {!isEmpty(props.inStockKpiData) && (
            <InStockKpiCards
              kpiData={props.inStockKpiData}
              viewType={props.selectedInStockViewType}
            />
          )}

          {props?.isFiltersValid && (
            <div className={classes.tableContainer}>
              <InStockTableView
                viewType={props.selectedInStockViewType}
              />
            </div>
          )}
        </div>
      )}
    </div>
    </>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer } = store;
  return {
    showInStockDetails:
      inventorysmartReducer?.inventorySmartInStockService
        ?.showInStockDetails,
    inStockKpiData:
      inventorysmartReducer?.inventorySmartInStockService
        ?.inStockKpiData,
    isFiltersValid:
      inventorysmartReducer?.inventorySmartInStockService
        ?.isFiltersValid,
    selectedInStockViewType:
      inventorysmartReducer?.inventorySmartInStockService
        ?.selectedInStockViewType,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    clearInStockStates: (body) =>
      dispatch(clearInStockStates(body)),   
      };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(InStockReportTable); 