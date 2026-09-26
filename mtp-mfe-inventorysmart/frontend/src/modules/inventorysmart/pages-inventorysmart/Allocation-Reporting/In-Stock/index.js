import React from "react";
import { connect } from "react-redux";
import Loader from "core/Utils/Loader/loader";
import InStockFilters from "./in-stock-filters";
import InStockReportTable from "./in-stock-report";

const InStockComponent = (props) => {
  return (
    <div>
      <InStockFilters> 
          <Loader loader={props.inStockScreenLoader || props.inStockTableLoader}>
            <InStockReportTable />
          </Loader>
      </InStockFilters>
    </div>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer } = store;
  return {
    inStockScreenLoader:
      inventorysmartReducer.inventorySmartInStockService
        ?.inStockScreenLoader,
    inStockTableLoader:
      inventorysmartReducer.inventorySmartInStockService
        ?.inStockTableLoader,
  };
};

export default connect(mapStateToProps, null)(InStockComponent); 